import { describe, expect, it } from 'vitest'
import type { VoiceShortcut } from '../../../shared/types'
import {
  HOTKEY_SLOTS,
  formatHotkeyDisplay,
  generateShortcutId,
  isHotkeyTaken,
  isReservedHotkey,
  suggestNextHotkey,
  validateVoiceShortcut,
} from './voiceShortcuts'

function makeShortcut(overrides: Partial<VoiceShortcut> = {}): VoiceShortcut {
  return {
    id: 'test-id',
    name: 'Teste',
    hotkey: 'CommandOrControl+Shift+1',
    enabled: true,
    voiceSource: 'cloud',
    voice: 'pt-BR-AntonioNeural',
    text: 'Ola pessoal!',
    speed: 1.0,
    ...overrides,
  }
}

describe('voiceShortcuts utilities', () => {
  it('reserves system hotkeys', () => {
    expect(isReservedHotkey('CommandOrControl+Shift+F')).toBe(true)
    expect(isReservedHotkey('CommandOrControl+Shift+1')).toBe(false)
  })

  it('formats hotkey for display', () => {
    expect(formatHotkeyDisplay('CommandOrControl+Shift+1')).toBe('Ctrl + Shift + 1')
    expect(formatHotkeyDisplay('CommandOrControl+Alt+F5')).toBe('Ctrl + Alt + F5')
  })

  it('detects conflict with existing shortcuts', () => {
    const existing: VoiceShortcut[] = [makeShortcut({ id: 'a', hotkey: 'CommandOrControl+Shift+1' })]
    expect(isHotkeyTaken('CommandOrControl+Shift+1', existing)).toBe(true)
    expect(isHotkeyTaken('CommandOrControl+Shift+2', existing)).toBe(false)
  })

  it('allows same hotkey when editing the same shortcut', () => {
    const existing: VoiceShortcut[] = [makeShortcut({ id: 'a', hotkey: 'CommandOrControl+Shift+1' })]
    expect(isHotkeyTaken('CommandOrControl+Shift+1', existing, 'a')).toBe(false)
  })

  it('considers reserved hotkeys as taken', () => {
    expect(isHotkeyTaken('CommandOrControl+Shift+F', [])).toBe(true)
  })

  it('suggests the first free hotkey', () => {
    const used: VoiceShortcut[] = [
      makeShortcut({ id: 'a', hotkey: HOTKEY_SLOTS[0] }),
      makeShortcut({ id: 'b', hotkey: HOTKEY_SLOTS[1] }),
    ]
    expect(suggestNextHotkey(used)).toBe(HOTKEY_SLOTS[2])
  })

  it('generates unique ids', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i += 1) {
      ids.add(generateShortcutId())
    }
    expect(ids.size).toBe(100)
  })

  it('validates required fields', () => {
    expect(validateVoiceShortcut(makeShortcut({ name: '' }))).toContain('Nome obrigatorio.')
    expect(validateVoiceShortcut(makeShortcut({ text: '' }))).toContain('Texto obrigatorio.')
    expect(validateVoiceShortcut(makeShortcut({ voice: '' }))).toContain('Selecione uma voz.')
    expect(validateVoiceShortcut(makeShortcut({ speed: 3.0 }))).toContain('Velocidade entre 0.5 e 2.0.')
    expect(validateVoiceShortcut(makeShortcut({ hotkey: 'CommandOrControl+Shift+F' }))).toContain(
      'Atalho reservado pelo sistema.',
    )
    expect(validateVoiceShortcut(makeShortcut())).toHaveLength(0)
  })
})
