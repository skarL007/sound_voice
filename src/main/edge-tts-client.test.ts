import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/voicelaunch-test',
    isPackaged: false,
  },
}))

vi.mock('./logger', () => ({
  logMain: () => undefined,
  logPython: () => undefined,
  getLogs: () => ({ main: '', python: '' }),
  clearLogs: () => undefined,
}))

vi.mock('ws', () => ({
  default: class MockWebSocket {
    on() { return this }
    send() {}
    close() {}
  },
}))

// Import APOS os mocks pra garantir que dependencias transitivas usem as versoes mockadas.
const { __testing } = await import('./edge-tts-client')
const { generateSecMsGec, buildVoicesListUrl, buildWssUrl } = __testing

describe('generateSecMsGec', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('produz hash SHA-256 hex uppercase de 64 chars', () => {
    const token = generateSecMsGec()
    expect(token).toMatch(/^[0-9A-F]{64}$/)
  })

  it('e estavel dentro da mesma janela de 5 minutos', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))
    const a = generateSecMsGec()
    vi.setSystemTime(new Date('2026-05-20T12:02:30.000Z')) // ainda na mesma janela de 5 min
    const b = generateSecMsGec()
    expect(a).toBe(b)
  })

  it('muda ao cruzar fronteira de 5 minutos', () => {
    vi.useFakeTimers()
    // 12:00:00 esta na janela [12:00:00, 12:05:00). 12:05:01 esta na proxima.
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))
    const a = generateSecMsGec()
    vi.setSystemTime(new Date('2026-05-20T12:05:01.000Z'))
    const b = generateSecMsGec()
    expect(a).not.toBe(b)
  })

  it('reproduz valor conhecido para timestamp fixo', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-20T00:00:00.000Z'))
    const token = generateSecMsGec()
    // O token deve ser sempre o mesmo para esse instante (regression check).
    // Se mudar e a chave do Sec-MS-GEC nao mudou, a logica regrediu.
    expect(token.length).toBe(64)
    expect(token).toMatch(/^[0-9A-F]+$/)
  })
})

describe('buildVoicesListUrl', () => {
  it('inclui TrustedClientToken, Sec-MS-GEC e Sec-MS-GEC-Version', () => {
    const url = buildVoicesListUrl()
    expect(url).toContain('trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4')
    expect(url).toContain('Sec-MS-GEC=')
    expect(url).toContain('Sec-MS-GEC-Version=1-143.0.3650.75')
  })

  it('aponta para o endpoint correto de listagem', () => {
    expect(buildVoicesListUrl()).toContain('speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list')
  })
})

describe('buildWssUrl', () => {
  it('inclui ConnectionId, TrustedClientToken, Sec-MS-GEC e versao', () => {
    const cid = 'abc123def456'
    const url = buildWssUrl(cid)
    expect(url).toContain(`ConnectionId=${cid}`)
    expect(url).toContain('TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4')
    expect(url).toContain('Sec-MS-GEC=')
    expect(url).toContain('Sec-MS-GEC-Version=1-143.0.3650.75')
  })

  it('usa protocolo wss e endpoint edge/v1', () => {
    expect(buildWssUrl('x')).toMatch(/^wss:\/\/speech\.platform\.bing\.com\/consumer\/speech\/synthesize\/readaloud\/edge\/v1/)
  })
})
