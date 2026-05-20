import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock antes do import: download-manager importa electron (BrowserWindow) e fs.
vi.mock('electron', () => ({
  BrowserWindow: class {},
  app: { getPath: () => '/tmp' },
}))

vi.mock('fs', () => ({
  existsSync: () => true,
  mkdirSync: () => undefined,
  createWriteStream: () => ({
    on: () => undefined,
    close: () => undefined,
    write: () => true,
    end: () => undefined,
  }),
}))

const sentMessages: Array<{ channel: string; payload: unknown }> = []

function makeMockWindow() {
  return {
    webContents: {
      send: (channel: string, payload: unknown) => {
        sentMessages.push({ channel, payload })
      },
    },
  } as unknown as Electron.BrowserWindow
}

beforeEach(() => {
  sentMessages.length = 0
  vi.resetModules()
})

describe('downloadModelWithProgress', () => {
  it('rejeita http externo (so https eh permitido)', async () => {
    const { downloadModelWithProgress } = await import('./download-manager')
    const ok = await downloadModelWithProgress(
      {
        modelId: 'piper',
        url: 'http://example.com/model.onnx',
        destination: '/tmp/model.onnx',
      },
      makeMockWindow(),
    )
    expect(ok).toBe(false)
    const completeMsg = sentMessages.find((msg) => msg.channel === 'model:download:complete')
    expect(completeMsg).toBeDefined()
    expect((completeMsg!.payload as { success: boolean; error: string }).success).toBe(false)
    expect((completeMsg!.payload as { error: string }).error).toMatch(/https/i)
  })

  it('aceita http://localhost para backend Python interno', async () => {
    // Esse caso so deveria nao falhar pelo gate do scheme; rede real falha mas isso eh ok.
    const { downloadModelWithProgress } = await import('./download-manager')
    const ok = await downloadModelWithProgress(
      {
        modelId: 'local-test',
        url: 'http://127.0.0.1:9472/test.bin',
        destination: '/tmp/local-test.bin',
      },
      makeMockWindow(),
    )
    // O download em si vai falhar pq nao tem servidor no 9472, mas nao pelo motivo do scheme.
    expect(ok).toBe(false)
    const completeMsg = sentMessages.find((msg) => msg.channel === 'model:download:complete')
    if (completeMsg) {
      const payload = completeMsg.payload as { success: boolean; error?: string }
      expect(payload.success).toBe(false)
      // Erro deve ser de conexao, nao do gate de scheme.
      expect(payload.error).not.toMatch(/https/i)
    }
  })

  it('aborta apos exceder 5 redirects (anti-SSRF)', async () => {
    const { downloadModelWithProgress } = await import('./download-manager')
    const ok = await downloadModelWithProgress(
      {
        modelId: 'redirect-loop',
        url: 'https://example.com/m.bin',
        destination: '/tmp/m.bin',
        redirectDepth: 6,
      },
      makeMockWindow(),
    )
    expect(ok).toBe(false)
    const completeMsg = sentMessages.find((msg) => msg.channel === 'model:download:complete')
    expect(completeMsg).toBeDefined()
    expect((completeMsg!.payload as { error: string }).error).toMatch(/redirects/i)
  })

  it('redirectDepth default e 0 e nao bloqueia downloads novos', async () => {
    const { downloadModelWithProgress } = await import('./download-manager')
    const ok = await downloadModelWithProgress(
      {
        modelId: 'new-download',
        url: 'https://example.com/m.bin',
        destination: '/tmp/m.bin',
        // sem redirectDepth: deve ser tratado como 0
      },
      makeMockWindow(),
    )
    // Falha por motivo de rede (timeout/abort) e nao pelo limite.
    expect(ok).toBe(false)
    const completeMsg = sentMessages.find((msg) => msg.channel === 'model:download:complete')
    if (completeMsg) {
      expect((completeMsg.payload as { error?: string }).error).not.toMatch(/redirects/i)
    }
  })
})

describe('cancelDownload', () => {
  it('retorna false quando nao ha download ativo com esse id', async () => {
    const { cancelDownload } = await import('./download-manager')
    expect(cancelDownload('not-running')).toBe(false)
  })
})
