import { describe, expect, it } from 'vitest'
import type { AudioDevice } from '../../../shared/types'
import {
  detectVBCable,
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
