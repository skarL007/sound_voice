import { describe, expect, it } from 'vitest'
import type { VoiceShortcut } from '../../../shared/types'
import {
  acceleratorFromEvent,
  HOTKEY_SLOTS,
  formatHotkeyDisplay,
  generateShortcutId,
  isHotkeyTaken,
  isReservedHotkey,
  suggestNextHotkey,
  validateVoiceShortcut,
} from './voiceShortcuts'
import type { HotkeyEventLike } from './voiceShortcuts'

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

describe('acceleratorFromEvent', () => {
  const ev = (overrides: Partial<HotkeyEventLike>): HotkeyEventLike => ({
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    code: '',
    key: '',
    ...overrides,
  })

  it('builds a Ctrl+Shift+letter accelerator', () => {
    const result = acceleratorFromEvent(ev({ ctrlKey: true, shiftKey: true, code: 'KeyG' }))
    expect(result.accelerator).toBe('CommandOrControl+Shift+G')
    expect(result.pending).toBe(false)
  })

  it('matches the canonical legacy slot format for Ctrl+Shift+digit', () => {
    const result = acceleratorFromEvent(ev({ ctrlKey: true, shiftKey: true, code: 'Digit1' }))
    expect(result.accelerator).toBe('CommandOrControl+Shift+1')
    expect(result.accelerator).toBe(HOTKEY_SLOTS[0])
  })

  it('supports Ctrl+Alt, function keys and arrows', () => {
    expect(acceleratorFromEvent(ev({ ctrlKey: true, altKey: true, code: 'KeyM' })).accelerator).toBe(
      'CommandOrControl+Alt+M',
    )
    expect(acceleratorFromEvent(ev({ ctrlKey: true, code: 'F5' })).accelerator).toBe('CommandOrControl+F5')
    expect(acceleratorFromEvent(ev({ altKey: true, code: 'ArrowUp' })).accelerator).toBe('Alt+Up')
  })

  it('keeps canonical modifier order Ctrl, Alt, Shift', () => {
    const result = acceleratorFromEvent(ev({ ctrlKey: true, altKey: true, shiftKey: true, code: 'KeyK' }))
    expect(result.accelerator).toBe('CommandOrControl+Alt+Shift+K')
  })

  it('is pending while only modifiers are held', () => {
    const result = acceleratorFromEvent(ev({ ctrlKey: true, code: 'ControlLeft' }))
    expect(result.pending).toBe(true)
    expect(result.accelerator).toBeNull()
    expect(result.preview).toContain('Ctrl')
  })

  it('requires a strong modifier (rejects bare key and Shift-only)', () => {
    expect(acceleratorFromEvent(ev({ code: 'KeyG' })).accelerator).toBeNull()
    const shiftOnly = acceleratorFromEvent(ev({ shiftKey: true, code: 'KeyG' }))
    expect(shiftOnly.accelerator).toBeNull()
    expect(shiftOnly.error).toBeTruthy()
  })

  it('rejects unsupported keys', () => {
    const result = acceleratorFromEvent(ev({ ctrlKey: true, code: 'IntlBackslash' }))
    expect(result.accelerator).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('produces an accelerator that round-trips through formatHotkeyDisplay', () => {
    const result = acceleratorFromEvent(ev({ ctrlKey: true, altKey: true, code: 'KeyZ' }))
    expect(result.accelerator).toBe('CommandOrControl+Alt+Z')
    expect(formatHotkeyDisplay(result.accelerator!)).toBe('Ctrl + Alt + Z')
  })
})
