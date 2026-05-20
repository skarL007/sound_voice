import WebSocket from 'ws'
import { createHash } from 'crypto'
import { logMain } from './logger'

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const SEC_MS_GEC_VERSION = '1-130.0.2849.68'
const WIN_EPOCH_SECONDS = 11644473600n
const TICKS_PER_SECOND = 10_000_000n
const TICKS_ROUND = 3_000_000_000n
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68'
const WSS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1'
const VOICES_BASE = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list'

function generateSecMsGec(): string {
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
  let ticks = (nowSeconds + WIN_EPOCH_SECONDS) * TICKS_PER_SECOND
  ticks -= ticks % TICKS_ROUND
  const payload = `${ticks.toString()}${TRUSTED_CLIENT_TOKEN}`
  return createHash('sha256').update(payload, 'ascii').digest('hex').toUpperCase()
}

function buildVoicesListUrl(): string {
  const gec = generateSecMsGec()
  return `${VOICES_BASE}?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`
}

function buildWssUrl(connectionId: string): string {
  const gec = generateSecMsGec()
  return `${WSS_BASE}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`
}

export interface EdgeVoice {
  Name: string
  ShortName: string
  Gender: 'Male' | 'Female'
  Locale: string
  SuggestedCodec: string
  FriendlyName: string
  Status: string
  VoiceTag?: { ContentCategories?: string[]; VoicePersonalities?: string[] }
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
let voicesCache: EdgeVoice[] | null = null
let voicesCacheTime = 0

export async function listEdgeVoices(forceRefresh = false): Promise<EdgeVoice[]> {
  const now = Date.now()
  if (!forceRefresh && voicesCache && now - voicesCacheTime < CACHE_TTL_MS) {
    return voicesCache
  }
  const response = await fetch(buildVoicesListUrl(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  if (!response.ok) {
    throw new Error(`Falha ao consultar vozes Edge TTS: HTTP ${response.status}`)
  }
  const data = (await response.json()) as EdgeVoice[]
  voicesCache = data
  voicesCacheTime = now
  logMain('INFO', `Edge TTS voices loaded: ${data.length} entries`)
  return data
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildMessage(headers: Record<string, string>, body: string): string {
  const headerStr = Object.entries(headers)
    .map(([k, v]) => `${k}:${v}`)
    .join('\r\n')
  return `${headerStr}\r\n\r\n${body}`
}

function nowTimestamp(): string {
  return new Date().toISOString()
}

function ratePercent(speed: number): string {
  const pct = Math.round((speed - 1) * 100)
  return (pct >= 0 ? '+' : '') + pct + '%'
}

export interface SynthesizeOptions {
  text: string
  voice: string
  speed?: number
  pitch?: number
}

export async function synthesizeEdgeTTS(options: SynthesizeOptions): Promise<Buffer> {
  if (!options.text || options.text.trim().length === 0) {
    throw new Error('Texto vazio.')
  }
  const speed = options.speed ?? 1.0
  const pitch = options.pitch ?? 0
  const voices = await listEdgeVoices()
  const voice = voices.find((v) => v.ShortName === options.voice)
  if (!voice) throw new Error(`Voz nao encontrada: ${options.voice}`)
  const locale = voice.Locale
  const rawId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const requestId = rawId.replace(/-/g, '')
  const connectionId = requestId

  const audioChunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      err ? reject(err) : resolve()
    }

    const ws = new WebSocket(buildWssUrl(connectionId), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      },
    })

    const timeout = setTimeout(() => finish(new Error('Edge TTS timeout (30s)')), 30000)

    ws.on('open', () => {
      try {
        const configBody = JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
                outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
              },
            },
          },
        })
        ws.send(
          buildMessage(
            {
              'X-Timestamp': nowTimestamp(),
              'Content-Type': 'application/json; charset=utf-8',
              Path: 'speech.config',
            },
            configBody,
          ),
        )

        const rateStr = ratePercent(speed)
        const pitchStr = (pitch >= 0 ? '+' : '') + pitch + 'Hz'
        const ssml =
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${locale}'>` +
          `<voice name='${options.voice}'>` +
          `<prosody rate='${rateStr}' pitch='${pitchStr}'>${escapeXml(options.text)}</prosody>` +
          `</voice></speak>`
        ws.send(
          buildMessage(
            {
              'X-RequestId': requestId,
              'Content-Type': 'application/ssml+xml',
              'X-Timestamp': nowTimestamp(),
              Path: 'ssml',
            },
            ssml,
          ),
        )
      } catch (err) {
        finish(err as Error)
      }
    })

    ws.on('message', (data: Buffer, isBinary: boolean) => {
      if (!isBinary) {
        const text = data.toString('utf-8')
        if (text.includes('Path:turn.end')) finish()
        return
      }
      if (data.length < 2) return
      const headerLen = data.readUInt16BE(0)
      const audioStart = 2 + headerLen
      if (audioStart >= data.length) return
      audioChunks.push(data.subarray(audioStart))
    })

    ws.on('close', () => finish())
    ws.on('error', (err) => finish(err))
    ws.on('unexpected-response', (_req, res) => {
      finish(new Error(`Edge TTS rejeitou a conexao: HTTP ${res.statusCode}. Tente atualizar a aplicacao.`))
    })
  })

  if (audioChunks.length === 0) {
    throw new Error('Nenhum audio recebido do Edge TTS')
  }
  return Buffer.concat(audioChunks)
}

// Exposto apenas para testes unitarios. Permite garantir que o GEC mude conforme o tempo avanca.
export const __testing = {
  generateSecMsGec,
  buildVoicesListUrl,
  buildWssUrl,
}
