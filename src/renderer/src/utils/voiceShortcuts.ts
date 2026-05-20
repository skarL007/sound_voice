import type { VoiceShortcut } from '../../../shared/types'

export const HOTKEY_SLOTS: string[] = [
  ...Array.from({ length: 9 }, (_, i) => `CommandOrControl+Shift+${i + 1}`),
  'CommandOrControl+Shift+0',
  ...Array.from({ length: 9 }, (_, i) => `CommandOrControl+Alt+${i + 1}`),
  'CommandOrControl+Alt+0',
  ...Array.from({ length: 12 }, (_, i) => `CommandOrControl+Shift+F${i + 1}`),
]

const RESERVED_HOTKEYS = new Set<string>([
  'CommandOrControl+Shift+F',
  'CommandOrControl+Shift+S',
  'CommandOrControl+Shift+V',
  'CommandOrControl+Shift+M',
])

export function isReservedHotkey(hotkey: string): boolean {
  return RESERVED_HOTKEYS.has(hotkey)
}

export function formatHotkeyDisplay(accelerator: string): string {
  return accelerator
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/\+/g, ' + ')
}

export function isHotkeyTaken(hotkey: string, shortcuts: VoiceShortcut[], excludeId?: string): boolean {
  if (isReservedHotkey(hotkey)) return true
  return shortcuts.some((shortcut) => shortcut.id !== excludeId && shortcut.hotkey === hotkey && shortcut.enabled)
}

export function generateShortcutId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `vs_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  }
  return `vs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function suggestNextHotkey(shortcuts: VoiceShortcut[]): string | null {
  for (const slot of HOTKEY_SLOTS) {
    if (!shortcuts.some((shortcut) => shortcut.hotkey === slot)) {
      return slot
    }
  }
  return null
}

export function validateVoiceShortcut(shortcut: VoiceShortcut): string[] {
  const errors: string[] = []
  if (!shortcut.name.trim()) errors.push('Nome obrigatorio.')
  if (!shortcut.text.trim()) errors.push('Texto obrigatorio.')
  if (!shortcut.hotkey) errors.push('Atalho obrigatorio.')
  else if (isReservedHotkey(shortcut.hotkey)) errors.push('Atalho reservado pelo sistema.')
  if (!shortcut.voice) errors.push('Selecione uma voz.')
  if (shortcut.speed < 0.5 || shortcut.speed > 2.0) errors.push('Velocidade entre 0.5 e 2.0.')
  return errors
}

export function defaultShortcuts(cloudVoice: string | null): VoiceShortcut[] {
  if (!cloudVoice) return []
  return [
    {
      id: 'gg-triunfante',
      name: 'GG Triunfante',
      hotkey: 'CommandOrControl+Shift+1',
      enabled: true,
      voiceSource: 'cloud',
      voice: cloudVoice,
      text: 'GG, partida excelente!',
      speed: 1.0,
    },
    {
      id: 'cuidado',
      name: 'Cuidado!',
      hotkey: 'CommandOrControl+Shift+2',
      enabled: true,
      voiceSource: 'cloud',
      voice: cloudVoice,
      text: 'Cuidado, inimigo se aproximando!',
      speed: 1.0,
    },
    {
      id: 'oi-pessoal',
      name: 'Cumprimento',
      hotkey: 'CommandOrControl+Shift+3',
      enabled: true,
      voiceSource: 'cloud',
      voice: cloudVoice,
      text: 'Oi pessoal, tudo bem com voces?',
      speed: 1.0,
    },
  ]
}
