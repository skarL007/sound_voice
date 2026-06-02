import { useEffect, useMemo, useState } from 'react'
import { Keyboard, Loader2, PlayCircle, Trash2 } from 'lucide-react'
import { acceleratorFromEvent, formatHotkeyDisplay, isHotkeyTaken } from '../utils/voiceShortcuts'
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

/**
 * Capturador de tecla livre: a pessoa clica e aperta a combinacao que quiser
 * (Ctrl/Alt/Win + tecla). Valida contra atalhos em uso e teclas reservadas e
 * so confirma quando a combinacao e valida. Esc cancela.
 */
export function HotkeyCapture({
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
  const [capturing, setCapturing] = useState(false)
  const [preview, setPreview] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  const stop = () => {
    setCapturing(false)
    setPreview('')
    setHint(null)
  }

  useEffect(() => {
    if (!capturing) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat) return
      if (event.key === 'Escape') {
        stop()
        return
      }
      const result = acceleratorFromEvent(event)
      setPreview(result.preview)
      if (result.pending) {
        setHint(null)
        return
      }
      if (!result.accelerator) {
        setHint(result.error ?? 'Combinacao invalida.')
        return
      }
      if (isHotkeyTaken(result.accelerator, shortcuts, excludeId)) {
        setHint('Essa tecla ja esta em uso. Tente outra.')
        return
      }
      onChange(result.accelerator)
      stop()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing, shortcuts, excludeId, onChange])

  if (capturing) {
    return (
      <span className="inline-flex flex-col gap-1">
        <button
          type="button"
          onClick={stop}
          className="input-field font-mono text-xs inline-flex items-center gap-2"
          style={{ width: 'auto', borderColor: 'var(--vl-state-live-border)', color: 'var(--vl-state-live-text)' }}
          aria-label={`${ariaLabel}: aperte a combinacao desejada, Esc cancela`}
          aria-live="polite"
        >
          <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--vl-state-live)' }} />
          {preview || 'Aperte as teclas...'}
        </button>
        <span className="text-[10px]" style={hint ? { color: 'var(--vl-state-warn-text)' } : undefined}>
          {hint ?? 'Esc cancela'}
        </span>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setCapturing(true)
        setPreview('')
        setHint(null)
      }}
      className="input-field font-mono text-xs inline-flex items-center gap-1.5"
      style={{ width: 'auto' }}
      aria-label={ariaLabel}
      title="Clique e aperte a combinacao de teclas que quiser"
    >
      <Keyboard className="h-3.5 w-3.5 opacity-70" />
      {value ? formatHotkeyDisplay(value) : 'Definir tecla'}
    </button>
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
        <HotkeyCapture
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
