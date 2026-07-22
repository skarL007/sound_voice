import { afterEach, describe, expect, it } from 'vitest'
import type { AudioDevice } from '../../../shared/types'
import {
  detectVBCable,
  pickCableOutput,
  resolveCableSink,
  resolveVBCableInstallState,
  type VBCableInstallResult,
} from './virtualMicSetup'

function device(name: string): AudioDevice {
  return { id: name, name, isInput: false, isDefault: false }
}

describe('detectVBCable', () => {
  it('detecta dispositivos VB-Cable sem diferenciar maiusculas', () => {
    expect(
      detectVBCable([
        device('CABLE Output (VB-Audio Virtual Cable)'),
        device('Realtek Speakers'),
      ]),
    ).toBe(true)
  })

  it('detecta variacoes de nome contendo "cable"', () => {
    expect(detectVBCable([device('Entrada do cable (VB-Audio)')])).toBe(true)
  })

  it('retorna false quando nao ha cabo', () => {
    expect(
      detectVBCable([device('Realtek Speakers'), device('Microphone Array')]),
    ).toBe(false)
  })

  it('lida com lista vazia', () => {
    expect(detectVBCable([])).toBe(false)
  })
})

describe('resolveVBCableInstallState', () => {
  it('mapeia instalador aberto apos download para launched', () => {
    const result: VBCableInstallResult = { success: true, launched: true, downloaded: true }
    const resolved = resolveVBCableInstallState(result)
    expect(resolved.state).toBe('launched')
    expect(resolved.message.toLowerCase()).toContain('install')
  })

  it('mapeia instalador aberto (embutido) para launched', () => {
    const result: VBCableInstallResult = { success: true, launched: true }
    expect(resolveVBCableInstallState(result).state).toBe('launched')
  })

  it('mapeia sucesso sem launch para manual com mensagem explicita', () => {
    const result: VBCableInstallResult = {
      success: true,
      launched: false,
      message: 'Site oficial aberto.',
    }
    expect(resolveVBCableInstallState(result)).toEqual({
      state: 'manual',
      message: 'Site oficial aberto.',
    })
  })

  it('mapeia falha para error', () => {
    const result: VBCableInstallResult = { success: false, error: 'spawn failed' }
    expect(resolveVBCableInstallState(result)).toEqual({
      state: 'error',
      message: 'spawn failed',
    })
  })

  it('usa mensagem padrao quando o erro nao foi informado', () => {
    expect(resolveVBCableInstallState({ success: false }).state).toBe('error')
  })
})

describe('pickCableOutput', () => {
  const out = (label: string, deviceId = label) => ({ kind: 'audiooutput' as MediaDeviceKind, label, deviceId })
  const input = (label: string) => ({ kind: 'audioinput' as MediaDeviceKind, label, deviceId: label })

  it('prefere "CABLE Input" a qualquer outro cabo', () => {
    const picked = pickCableOutput([
      out('CABLE Output (VB-Audio Virtual Cable)'),
      out('CABLE Input (VB-Audio Virtual Cable)'),
    ])
    expect(picked?.label).toBe('CABLE Input (VB-Audio Virtual Cable)')
  })

  it('cai para qualquer saida com "cable" quando nao ha CABLE Input', () => {
    const picked = pickCableOutput([out('Realtek Speakers'), out('Hi-Fi Cable Input')])
    expect(picked?.label).toBe('Hi-Fi Cable Input')
  })

  it('ignora dispositivos de entrada (audioinput)', () => {
    expect(pickCableOutput([input('CABLE Output (VB-Audio Virtual Cable)')])).toBeNull()
  })

  it('retorna null sem cabo', () => {
    expect(pickCableOutput([out('Realtek Speakers')])).toBeNull()
  })
})

describe('resolveCableSink', () => {
  const originalMediaDevices = globalThis.navigator?.mediaDevices

  const setMediaDevices = (value: unknown) => {
    if (!globalThis.navigator) {
      Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true })
    }
    Object.defineProperty(globalThis.navigator, 'mediaDevices', { value, configurable: true })
  }

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    })
  })

  it('retorna unsupported sem mediaDevices', async () => {
    setMediaDevices(undefined)
    expect((await resolveCableSink()).status).toBe('unsupported')
  })

  it('encontra o cabo pela enumeracao direta', async () => {
    setMediaDevices({
      enumerateDevices: async () => [
        { kind: 'audiooutput', label: 'CABLE Input (VB-Audio Virtual Cable)', deviceId: 'cable-1' },
      ],
    })
    const result = await resolveCableSink()
    expect(result).toEqual({ status: 'found', id: 'cable-1', label: 'CABLE Input (VB-Audio Virtual Cable)' })
  })

  it('retorna not-found sem pedir permissao quando requestPermission e false', async () => {
    let asked = false
    setMediaDevices({
      enumerateDevices: async () => [{ kind: 'audiooutput', label: '', deviceId: 'x' }],
      getUserMedia: async () => {
        asked = true
        return { getTracks: () => [] }
      },
    })
    expect((await resolveCableSink()).status).toBe('not-found')
    expect(asked).toBe(false)
  })

  it('re-enumera com labels apos permissao concedida', async () => {
    let calls = 0
    setMediaDevices({
      enumerateDevices: async () => {
        calls += 1
        return calls === 1
          ? [{ kind: 'audiooutput', label: '', deviceId: 'cable-1' }]
          : [{ kind: 'audiooutput', label: 'CABLE Input (VB-Audio Virtual Cable)', deviceId: 'cable-1' }]
      },
      getUserMedia: async () => ({ getTracks: () => [] }),
    })
    const result = await resolveCableSink({ requestPermission: true })
    expect(result.status).toBe('found')
  })

  it('retorna permission-denied quando o getUserMedia falha', async () => {
    setMediaDevices({
      enumerateDevices: async () => [{ kind: 'audiooutput', label: '', deviceId: 'x' }],
      getUserMedia: async () => {
        throw new Error('NotAllowedError')
      },
    })
    expect((await resolveCableSink({ requestPermission: true })).status).toBe('permission-denied')
  })
})
