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
    .replace(/Super/g, 'Win')
    .replace(/\+/g, ' + ')
}

export interface HotkeyEventLike {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  code: string
  key: string
  repeat?: boolean
}

export interface HotkeyCaptureResult {
  /** Accelerator pronto para registrar, ou null se incompleto/invalido. */
  accelerator: string | null
  /** Texto para mostrar enquanto a pessoa segura as teclas. */
  preview: string
  /** true quando so ha modificadores apertados (aguardando a tecla principal). */
  pending: boolean
  /** Motivo de a combinacao nao servir (mostrado como dica). */
  error?: string
}

const MODIFIER_CODES = new Set<string>([
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'ShiftLeft',
  'ShiftRight',
  'MetaLeft',
  'MetaRight',
])

// Converte o `code` fisico da tecla (independente de layout) no token aceito
// pelo accelerator do Electron. Retorna null para teclas nao suportadas.
function mainKeyFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^Numpad[0-9]$/.test(code)) return `num${code.slice(6)}`
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code
  switch (code) {
    case 'ArrowUp':
      return 'Up'
    case 'ArrowDown':
      return 'Down'
    case 'ArrowLeft':
      return 'Left'
    case 'ArrowRight':
      return 'Right'
    case 'Space':
      return 'Space'
    case 'Enter':
      return 'Return'
    case 'Tab':
      return 'Tab'
    case 'Backspace':
      return 'Backspace'
    case 'Delete':
      return 'Delete'
    case 'Insert':
      return 'Insert'
    case 'Home':
      return 'Home'
    case 'End':
      return 'End'
    case 'PageUp':
      return 'PageUp'
    case 'PageDown':
      return 'PageDown'
    default:
      return null
  }
}

function previewLabel(parts: string[]): string {
  return parts
    .map((part) => (part === 'CommandOrControl' ? 'Ctrl' : part === 'Super' ? 'Win' : part))
    .join(' + ')
}

/**
 * Converte um evento de teclado em um accelerator do Electron
 * (ex.: Ctrl+Shift+G -> "CommandOrControl+Shift+G"). A ordem canonica dos
 * modificadores (Ctrl, Alt, Shift, Win) casa com os slots legados, entao a
 * deteccao de conflito por string continua valendo. Exige pelo menos um
 * modificador forte (Ctrl/Alt/Win) para nao sequestrar a digitacao normal.
 */
export function acceleratorFromEvent(event: HotkeyEventLike): HotkeyCaptureResult {
  const mods: string[] = []
  if (event.ctrlKey) mods.push('CommandOrControl')
  if (event.altKey) mods.push('Alt')
  if (event.shiftKey) mods.push('Shift')
  if (event.metaKey) mods.push('Super')

  if (MODIFIER_CODES.has(event.code)) {
    return { accelerator: null, pending: true, preview: previewLabel([...mods, '...']) }
  }

  const mainKey = mainKeyFromCode(event.code)
  if (!mainKey) {
    return {
      accelerator: null,
      pending: false,
      preview: previewLabel(mods),
      error: 'Unsupported key. Use letters, numbers, F1-F24, or arrows.',
    }
  }

  const hasStrongModifier = event.ctrlKey || event.altKey || event.metaKey
  if (!hasStrongModifier) {
    return {
      accelerator: null,
      pending: false,
      preview: previewLabel([...mods, mainKey]),
      error: 'Combine with Ctrl or Alt (avoids conflicting with typing).',
    }
  }

  return {
    accelerator: [...mods, mainKey].join('+'),
    pending: false,
    preview: previewLabel([...mods, mainKey]),
  }
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
  if (!shortcut.name.trim()) errors.push('Name is required.')
  if (!shortcut.text.trim()) errors.push('Text is required.')
  if (!shortcut.hotkey) errors.push('Hotkey is required.')
  else if (isReservedHotkey(shortcut.hotkey)) errors.push('Hotkey is reserved by the system.')
  if (!shortcut.voice) errors.push('Select a voice.')
  if (shortcut.speed < 0.5 || shortcut.speed > 2.0) errors.push('Speed between 0.5 and 2.0.')
  return errors
}

export function defaultShortcuts(cloudVoice: string | null): VoiceShortcut[] {
  if (!cloudVoice) return []
  return [
    {
      id: 'gg-triunfante',
      name: 'GG well played',
      hotkey: 'CommandOrControl+Shift+1',
      enabled: true,
      voiceSource: 'cloud',
      voice: cloudVoice,
      text: 'GG, great match!',
      speed: 1.0,
    },
    {
      id: 'cuidado',
      name: 'Watch out!',
      hotkey: 'CommandOrControl+Shift+2',
      enabled: true,
      voiceSource: 'cloud',
      voice: cloudVoice,
      text: 'Watch out, enemy incoming!',
      speed: 1.0,
    },
    {
      id: 'oi-pessoal',
      name: 'Greeting',
      hotkey: 'CommandOrControl+Shift+3',
      enabled: true,
      voiceSource: 'cloud',
      voice: cloudVoice,
      text: 'Hey everyone, how are you doing?',
      speed: 1.0,
    },
  ]
}
