import WebSocket from 'ws'
import { createHash } from 'crypto'
import { logMain } from './logger'

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
// Constantes acompanham edge-tts upstream (verificadas em 2026-05-20). Microsoft rejeita
// clientes que se identificam como Edge antigo; bumpamos quando o 403 voltar.
const CHROMIUM_FULL_VERSION = '143.0.3650.75'
const CHROMIUM_MAJOR_VERSION = '143'
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`
const WIN_EPOCH_SECONDS = 11644473600n
const TICKS_PER_SECOND = 10_000_000n
const SEC_MS_GEC_WINDOW_SECONDS = 300n
const USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`
const WSS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1'
const VOICES_BASE = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list'

function generateSecMsGec(): string {
  // Algoritmo do edge-tts: arredondar segundos-desde-1601 para janela de 5 min,
  // depois converter para Windows ticks (100ns). Inteiro precisa de BigInt em JS.
  let seconds = BigInt(Math.floor(Date.now() / 1000)) + WIN_EPOCH_SECONDS
  seconds -= seconds % SEC_MS_GEC_WINDOW_SECONDS
  const ticks = seconds * TICKS_PER_SECOND
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
    throw new Error(`Failed to fetch Edge TTS voices: HTTP ${response.status}`)
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
  volume?: number
}

function parseTextHeaders(payload: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const headerEnd = payload.indexOf('\r\n\r\n')
  const headerBlock = headerEnd >= 0 ? payload.slice(0, headerEnd) : payload
  for (const line of headerBlock.split('\r\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      headers[key] = value
    }
  }
  return headers
}

export async function synthesizeEdgeTTS(options: SynthesizeOptions): Promise<Buffer> {
  if (!options.text || options.text.trim().length === 0) {
    throw new Error('Empty text.')
  }
  const speed = options.speed ?? 1.0
  const pitch = options.pitch ?? 0
  const volume = options.volume ?? 0
  const voices = await listEdgeVoices()
  const voice = voices.find((v) => v.ShortName === options.voice)
  if (!voice) throw new Error(`Voice not found: ${options.voice}`)
  const rawId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const requestId = rawId.replace(/-/g, '')
  const connectionId = requestId

  const audioChunks: Buffer[] = []
  let textMessages = 0
  let binaryMessages = 0

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
        'Sec-Ch-Ua': `"Microsoft Edge";v="${CHROMIUM_MAJOR_VERSION}", "Chromium";v="${CHROMIUM_MAJOR_VERSION}", "Not_A Brand";v="24"`,
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
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
                // WebM/Opus é decodificado nativamente por Chromium em qualquer Electron build.
                // Trocamos do MPEG-2 Layer III 24kHz porque era frágil em Chromium 127 do Electron 35.
                outputFormat: 'webm-24khz-16bit-mono-opus',
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

        // SSML segue formato exato do edge-tts upstream:
        // - xml:lang='en-US' eh hardcoded (a voz dirige o idioma real)
        // - <prosody> tem ordem pitch, rate, volume e os tres campos sao obrigatorios
        const rateStr = ratePercent(speed)
        const pitchStr = (pitch >= 0 ? '+' : '') + pitch + 'Hz'
        const volumeStr = (volume >= 0 ? '+' : '') + volume + '%'
        const ssml =
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
          `<voice name='${options.voice}'>` +
          `<prosody pitch='${pitchStr}' rate='${rateStr}' volume='${volumeStr}'>${escapeXml(options.text)}</prosody>` +
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
        textMessages += 1
        const text = data.toString('utf-8')
        const headers = parseTextHeaders(text)
        if (headers.Path === 'turn.end') {
          finish()
          return
        }
        if (headers.Path === 'response') {
          // Edge TTS responde JSON apos receber SSML; geralmente status: Success
          const bodyStart = text.indexOf('\r\n\r\n')
          if (bodyStart > 0) {
            const body = text.slice(bodyStart + 4).trim()
            try {
              const parsed = JSON.parse(body)
              const ctx = parsed?.context
              const ttsStatus = ctx?.serviceTag ? 'ok' : (parsed?.status || ctx?.status || '')
              if (ttsStatus && /error|fail/i.test(String(ttsStatus))) {
                finish(new Error(`Edge TTS rejected: ${body}`))
                return
              }
            } catch (parseErr) {
              // Body nao eh JSON; logamos pra ajudar diagnostico futuro.
              logMain('WARN', `Edge TTS response sem JSON parseavel (len=${body.length}): ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
            }
          }
        }
        return
      }
      binaryMessages += 1
      if (data.length < 2) return
      const headerLen = data.readUInt16BE(0)
      const audioStart = 2 + headerLen
      if (audioStart >= data.length) return
      // Edge TTS manda binarios de tipo audio E de metadados (word boundaries,
      // sentence boundaries). Sem filtrar por Path:audio o MP3 fica corrompido.
      const headerBlock = data.subarray(2, 2 + headerLen).toString('utf-8')
      const binHeaders = parseTextHeaders(headerBlock)
      if (binHeaders.Path !== 'audio') return
      audioChunks.push(data.subarray(audioStart))
    })

    ws.on('close', () => finish())
    ws.on('error', (err) => finish(err))
    ws.on('unexpected-response', (_req, res) => {
      finish(new Error(`Edge TTS rejected the connection: HTTP ${res.statusCode}. Try updating the app.`))
    })
  })

  const combined = Buffer.concat(audioChunks)
  const totalBytes = combined.length
  const head = combined.subarray(0, Math.min(32, combined.length)).toString('hex')
  logMain('INFO', `Edge TTS synth ${options.voice}: ${textMessages} text msg + ${binaryMessages} binary msg = ${totalBytes} bytes audio; head=${head}`)
  if (audioChunks.length === 0 || totalBytes < 200) {
    throw new Error(`No valid audio received from Edge TTS (${totalBytes} bytes). Check Logs.`)
  }
  return combined
}

// Exposto apenas para testes unitarios. Permite garantir que o GEC mude conforme o tempo avanca.
export const __testing = {
  generateSecMsGec,
  buildVoicesListUrl,
  buildWssUrl,
}
