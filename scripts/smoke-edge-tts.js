// Smoke test isolado do cliente Edge TTS.
// Replica o algoritmo do src/main/edge-tts-client.ts (Sec-MS-GEC + WS + WebM/Opus + Path:audio filter)
// Sem dependencia do Electron, so node + ws.
// Uso: node scripts/smoke-edge-tts.js
// Saida: test-edge-tts.webm na raiz do projeto + log com totais e magic bytes.

const WebSocket = require('ws')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const CHROMIUM_FULL_VERSION = '143.0.3650.75'
const CHROMIUM_MAJOR_VERSION = '143'
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`
const USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`

const VOICE = process.env.SMOKE_VOICE || 'pt-BR-FranciscaNeural'
const TEXT = process.env.SMOKE_TEXT || 'Ola, eu sou a Francisca. Este e um teste de audio do Edge TTS.'
const OUTPUT_FORMAT = process.env.SMOKE_FORMAT || 'webm-24khz-16bit-mono-opus'
const OUT_FILE = path.join(__dirname, '..', 'test-edge-tts.webm')

function generateSecMsGec() {
  let seconds = BigInt(Math.floor(Date.now() / 1000)) + 11644473600n
  seconds -= seconds % 300n
  const ticks = seconds * 10_000_000n
  return crypto.createHash('sha256').update(`${ticks.toString()}${TRUSTED_CLIENT_TOKEN}`, 'ascii').digest('hex').toUpperCase()
}

function parseHeaders(text) {
  const headers = {}
  const end = text.indexOf('\r\n\r\n')
  const block = end >= 0 ? text.slice(0, end) : text
  for (const line of block.split('\r\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return headers
}

function buildMessage(headers, body) {
  return Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\r\n') + '\r\n\r\n' + body
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const connectionId = crypto.randomUUID().replace(/-/g, '')
const requestId = connectionId
const wssUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`

console.log('[smoke] voice =', VOICE)
console.log('[smoke] outputFormat =', OUTPUT_FORMAT)
console.log('[smoke] connecting...')

const ws = new WebSocket(wssUrl, {
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

const audioChunks = []
let textMsgs = 0
let binMsgs = 0
let binAudioMsgs = 0
let binOtherPaths = new Set()

ws.on('open', () => {
  console.log('[ws] open OK')
  const config = JSON.stringify({
    context: {
      synthesis: {
        audio: {
          metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
          outputFormat: OUTPUT_FORMAT,
        },
      },
    },
  })
  const nowTimestamp = () => new Date().toISOString()
  ws.send(buildMessage({
    'X-Timestamp': nowTimestamp(),
    'Content-Type': 'application/json; charset=utf-8',
    Path: 'speech.config',
  }, config))

  const ssml =
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${VOICE}'>` +
    `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeXml(TEXT)}</prosody>` +
    `</voice></speak>`
  ws.send(buildMessage({
    'X-RequestId': requestId,
    'Content-Type': 'application/ssml+xml',
    'X-Timestamp': nowTimestamp(),
    Path: 'ssml',
  }, ssml))
})

ws.on('message', (data, isBinary) => {
  if (!isBinary) {
    textMsgs += 1
    const text = data.toString('utf-8')
    const headers = parseHeaders(text)
    console.log(`[text msg #${textMsgs}] Path=${headers.Path || '?'}`)
    if (headers.Path === 'turn.end') {
      ws.close()
    }
  } else {
    binMsgs += 1
    const headerLen = data.readUInt16BE(0)
    const headerBlock = data.subarray(2, 2 + headerLen).toString('utf-8')
    const headers = parseHeaders(headerBlock)
    if (headers.Path === 'audio') {
      binAudioMsgs += 1
      audioChunks.push(data.subarray(2 + headerLen))
    } else {
      binOtherPaths.add(headers.Path || '?')
    }
  }
})

ws.on('close', () => {
  const combined = Buffer.concat(audioChunks)
  console.log('')
  console.log('=== RESULTADO ===')
  console.log('Text messages:        ', textMsgs)
  console.log('Binary total:         ', binMsgs)
  console.log('Binary com Path:audio:', binAudioMsgs)
  console.log('Outros Paths binary:  ', [...binOtherPaths].join(', ') || '(nenhum)')
  console.log('Total bytes audio:    ', combined.length)
  const head = combined.subarray(0, 16).toString('hex')
  console.log('First 16 bytes hex:   ', head)
  const expectedWebm = '1a45dfa3'
  const expectedMp3 = 'fff'
  const isWebm = head.startsWith(expectedWebm)
  const isMp3 = head.startsWith(expectedMp3)
  console.log('Magic byte check:     ', isWebm ? 'OK WebM (EBML header)' : isMp3 ? 'MP3 (NAO esperado para webm-opus)' : 'DESCONHECIDO')
  fs.writeFileSync(OUT_FILE, combined)
  console.log('Salvo em:             ', OUT_FILE)
  process.exit(isWebm && combined.length > 200 ? 0 : 1)
})

ws.on('error', (err) => {
  console.error('[ws error]', err.message)
  process.exit(2)
})

ws.on('unexpected-response', (_req, res) => {
  console.error('[ws unexpected-response] HTTP', res.statusCode)
  process.exit(3)
})

setTimeout(() => {
  console.error('Timeout 30s')
  try { ws.close() } catch {}
  process.exit(4)
}, 30000)
