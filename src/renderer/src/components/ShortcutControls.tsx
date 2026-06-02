import { useEffect, useMemo, useState } from 'react'
import { Loader2, PlayCircle, Trash2 } from 'lucide-react'
import { toast } from '../utils/toast'
import {
  HOTKEY_SLOTS,
  formatHotkeyDisplay,
  isHotkeyTaken,
  isReservedHotkey,
} from '../utils/voiceShortcuts'
import type { CloudVoice, VoiceShortcut } from '../../../shared/types'

// Helpers compartilhados entre a tela Falar (cards) e a tela Atalhos (lista).
export function cleanVoiceName(voice: CloudVoice): string {
  return voice.FriendlyName.replace(/^Microsoft\s+/i, '').replace(/\s+Online\s+\(Natural\).*$/i, '')
}

export function localeRank(locale: string): number {
  if (locale === 'pt-BR') return 0
  if (locale === 'pt-PT') return 1
  if (locale.startsWith('pt')) return 2
  if (locale === 'en-US') return 3
  return 9
}

export function deriveName(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.slice(0, 40) || 'Atalho'
}

export function HotkeySelect({
  value,
  onChange,
  shortcuts,
  excludeId,
  ariaLabel,
}: {
  value: string
  onChange: (hotkey: string) => void
  shortcuts: VoiceShortcut[]
  excludeId?: string
  ariaLabel: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => {
        const next = event.target.value
        if (isHotkeyTaken(next, shortcuts, excludeId)) {
          toast('Tecla em uso', 'Essa combinacao ja esta ocupada ou e reservada.', 'warning')
          return
        }
        onChange(next)
      }}
      className="input-field font-mono text-xs"
      style={{ width: 'auto' }}
      aria-label={ariaLabel}
    >
      {HOTKEY_SLOTS.map((slot) => {
        const taken = isHotkeyTaken(slot, shortcuts, excludeId) || isReservedHotkey(slot)
        return (
          <option key={slot} value={slot} disabled={taken && slot !== value}>
            {formatHotkeyDisplay(slot)}
            {taken && slot !== value ? ' (em uso)' : ''}
          </option>
        )
      })}
    </select>
  )
}

export function VoiceSelect({
  voices,
  value,
  onChange,
  ariaLabel,
}: {
  voices: CloudVoice[]
  value: string
  onChange: (voice: string) => void
  ariaLabel: string
}) {
  const grouped = useMemo(() => {
    const byLocale = new Map<string, CloudVoice[]>()
    for (const voice of voices) {
      const list = byLocale.get(voice.Locale) ?? []
      list.push(voice)
      byLocale.set(voice.Locale, list)
    }
    return Array.from(byLocale.entries()).sort(
      (a, b) => localeRank(a[0]) - localeRank(b[0]) || a[0].localeCompare(b[0]),
    )
  }, [voices])

  if (voices.length === 0) {
    return <span className="text-xs text-ink-soft">Carregando vozes...</span>
  }

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="input-field text-sm flex-1 min-w-[180px]"
      aria-label={ariaLabel}
    >
      <option value="">Escolher voz...</option>
      {grouped.map(([locale, list]) => (
        <optgroup key={locale} label={locale}>
          {list
            .slice()
            .sort((a, b) => a.ShortName.localeCompare(b.ShortName))
            .map((voice) => (
              <option key={voice.ShortName} value={voice.ShortName}>
                {cleanVoiceName(voice)} ({voice.Gender === 'Female' ? 'F' : 'M'})
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}

/**
 * Card de atalho editavel inline (frase salva ao sair do campo; tecla e voz
 * salvam direto). Usado na tela Atalhos (lista) e na tela Falar (grid de cards).
 */
export function ShortcutCard({
  shortcut,
  voices,
  allShortcuts,
  isTesting,
  isActive,
  onUpdate,
  onDelete,
  onTest,
}: {
  shortcut: VoiceShortcut
  voices: CloudVoice[]
  allShortcuts: VoiceShortcut[]
  isTesting: boolean
  isActive: boolean
  onUpdate: (patch: Partial<VoiceShortcut>) => void
  onDelete: () => void
  onTest: () => void
}) {
  const [text, setText] = useState(shortcut.text)
  useEffect(() => setText(shortcut.text), [shortcut.text])

  const commitText = () => {
    const next = text.trim()
    if (next && next !== shortcut.text) onUpdate({ text: next, name: deriveName(next) })
    else if (!next) setText(shortcut.text)
  }

  const voiceLabel = useMemo(() => {
    const found = voices.find((voice) => voice.ShortName === shortcut.voice)
    return found ? cleanVoiceName(found) : shortcut.voice
  }, [voices, shortcut.voice])

  return (
    <div
      className={`hud-frame p-4 space-y-3 transition-all duration-300 ${shortcut.enabled ? '' : 'opacity-60'}`}
      style={isActive ? { boxShadow: '0 0 0 2px var(--vl-state-ready)', borderColor: 'var(--vl-state-ready)' } : {}}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="flex items-center gap-2">
        <HotkeySelect
          value={shortcut.hotkey}
          onChange={(hotkey) => onUpdate({ hotkey })}
          shortcuts={allShortcuts}
          excludeId={shortcut.id}
          ariaLabel="Tecla do atalho"
        />
        {voiceLabel && (
          <span className="text-[11px] px-2 py-0.5 rounded-full truncate max-w-[140px]" style={{ background: 'var(--vl-surface-overlay)', color: 'var(--vl-state-live-text)' }}>
            {voiceLabel}
          </span>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none">
          <input
            type="checkbox"
            checked={shortcut.enabled}
            onChange={(event) => onUpdate({ enabled: event.target.checked })}
            className="accent-brand-500"
          />
          {shortcut.enabled ? 'Ativo' : 'Inativo'}
        </label>
        <button
          onClick={onDelete}
          className="btn-ghost p-1.5"
          style={{ color: 'var(--vl-state-error)' }}
          aria-label={`Excluir atalho ${shortcut.name}`}
          title="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commitText}
        placeholder="O que esse atalho fala..."
        className="terminal-textarea w-full p-3 text-sm min-h-[64px] font-mono"
        maxLength={500}
      />

      <div className="flex flex-wrap items-center gap-2">
        <VoiceSelect voices={voices} value={shortcut.voice} onChange={(voice) => onUpdate({ voice })} ariaLabel="Voz do atalho" />
        <button onClick={onTest} disabled={isTesting} className="btn-primary inline-flex items-center gap-1.5 text-xs ml-auto">
          {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
          {isTesting ? 'Tocando...' : 'Testar'}
        </button>
      </div>
    </div>
  )
}
