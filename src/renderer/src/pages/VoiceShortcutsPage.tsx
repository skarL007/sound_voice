import { useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, Loader2, PlayCircle, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import DiscordVRChatGuide from '../components/DiscordVRChatGuide'
import { playCloudAudio } from '../utils/cloudAudio'
import { toast } from '../utils/toast'
import {
  HOTKEY_SLOTS,
  formatHotkeyDisplay,
  generateShortcutId,
  isHotkeyTaken,
  isReservedHotkey,
  suggestNextHotkey,
} from '../utils/voiceShortcuts'
import type { CloudVoice, VoiceShortcut } from '../../../shared/types'

function cleanVoiceName(voice: CloudVoice): string {
  return voice.FriendlyName.replace(/^Microsoft\s+/i, '').replace(/\s+Online\s+\(Natural\).*$/i, '')
}

function localeRank(locale: string): number {
  if (locale === 'pt-BR') return 0
  if (locale === 'pt-PT') return 1
  if (locale.startsWith('pt')) return 2
  if (locale === 'en-US') return 3
  return 9
}

function deriveName(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.slice(0, 40) || 'Atalho'
}

export default function VoiceShortcutsPage() {
  const voiceShortcuts = useAppStore((state) => state.voiceShortcuts)
  const addVoiceShortcut = useAppStore((state) => state.addVoiceShortcut)
  const updateVoiceShortcut = useAppStore((state) => state.updateVoiceShortcut)
  const deleteVoiceShortcut = useAppStore((state) => state.deleteVoiceShortcut)
  const cloudVoiceDefault = useAppStore((state) => state.cloudVoice)
  const cableDeviceId = useAppStore((state) => state.cableDeviceId)

  const [cloudVoices, setCloudVoices] = useState<CloudVoice[]>([])
  const [cloudError, setCloudError] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Rascunho do "novo atalho" (criacao inline, sem modal).
  const [draftText, setDraftText] = useState('')
  const [draftVoice, setDraftVoice] = useState(cloudVoiceDefault ?? '')
  const [draftHotkey, setDraftHotkey] = useState<string>(suggestNextHotkey(voiceShortcuts) ?? HOTKEY_SLOTS[0])

  useEffect(() => {
    let active = true
    window.electronAPI.listCloudVoices().then((response) => {
      if (!active) return
      if (response.success) {
        setCloudVoices(response.voices)
        setCloudError(null)
        if (!draftVoice && (cloudVoiceDefault || response.voices[0])) {
          setDraftVoice(cloudVoiceDefault ?? response.voices[0]?.ShortName ?? '')
        }
      } else {
        setCloudError(response.error || 'Falha ao carregar vozes online.')
      }
    })

    const handleShortcutTriggered = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      setActiveId(id)
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current)
      activeTimerRef.current = setTimeout(() => setActiveId(null), 2000)
    }
    window.addEventListener('voicelaunch:shortcut-triggered', handleShortcutTriggered as EventListener)
    return () => {
      active = false
      window.removeEventListener('voicelaunch:shortcut-triggered', handleShortcutTriggered as EventListener)
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-aquece o cache do Edge TTS para os atalhos dispararem instantaneamente.
  useEffect(() => {
    let cancelled = false
    const targets = voiceShortcuts.filter((s) => s.enabled && s.text.trim() && s.voice)
    void (async () => {
      for (const s of targets) {
        if (cancelled) break
        try {
          await window.electronAPI.synthesizeCloud({ text: s.text, voice: s.voice, speed: s.speed, pitch: s.pitch })
        } catch {
          /* best-effort */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [voiceShortcuts])

  const handleAdd = () => {
    const text = draftText.trim()
    if (!text) {
      toast('Escreva a frase', 'Digite o que o atalho deve falar.', 'warning')
      return
    }
    if (!draftVoice) {
      toast('Escolha uma voz', 'Selecione a voz online do atalho.', 'warning')
      return
    }
    if (isHotkeyTaken(draftHotkey, voiceShortcuts)) {
      toast('Atalho em uso', 'Essa tecla ja esta ocupada. Escolha outra.', 'warning')
      return
    }
    const shortcut: VoiceShortcut = {
      id: generateShortcutId(),
      name: deriveName(text),
      hotkey: draftHotkey,
      enabled: true,
      voiceSource: 'cloud',
      voice: draftVoice,
      text,
      speed: 1.0,
    }
    addVoiceShortcut(shortcut)
    toast('Atalho criado', `${formatHotkeyDisplay(shortcut.hotkey)} → fala sua frase`, 'success')
    setDraftText('')
    setDraftHotkey(suggestNextHotkey([...voiceShortcuts, shortcut]) ?? draftHotkey)
  }

  const handleTest = async (shortcut: VoiceShortcut) => {
    if (testingId) return
    setTestingId(shortcut.id)
    try {
      const response = await window.electronAPI.synthesizeCloud({
        text: shortcut.text,
        voice: shortcut.voice,
        speed: shortcut.speed,
        pitch: shortcut.pitch,
      })
      if (!response.success || !response.audioBase64) {
        toast('Falha no teste', response.error || 'Nao foi possivel gerar a voz.', 'error')
        return
      }
      await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm', cableDeviceId ?? undefined, {
        monitor: Boolean(cableDeviceId),
      })
    } catch (error) {
      toast('Falha no teste', String(error), 'error')
    } finally {
      setTestingId(null)
    }
  }

  const sortedShortcuts = useMemo(
    () => [...voiceShortcuts].sort((a, b) => HOTKEY_SLOTS.indexOf(a.hotkey) - HOTKEY_SLOTS.indexOf(b.hotkey)),
    [voiceShortcuts],
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ border: '1px solid var(--vl-hud-border-strong)', background: 'var(--vl-surface-raised)' }}
        >
          <Keyboard className="h-5 w-5" style={{ color: 'var(--vl-state-ready)' }} />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-ink-strong">Atalhos de voz</h1>
          <p className="max-w-2xl text-sm text-ink-soft">
            Escreva a frase, escolha a tecla e pronto. Aperte o atalho em qualquer lugar (Discord, jogo) e a voz sai na hora.
          </p>
        </div>
      </div>

      {cloudError && (
        <div
          className="rounded-2xl p-3 text-sm"
          style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)', color: 'var(--vl-state-warn-text)' }}
        >
          Vozes online indisponiveis ({cloudError}). Verifique a internet e recarregue.
        </div>
      )}

      {/* Criar atalho — inline, sem janela */}
      <div className="hud-frame p-4 space-y-3" style={{ background: 'var(--vl-surface-raised)' }}>
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-sm font-semibold text-ink-strong">Novo atalho</h2>
        </div>
        <textarea
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              handleAdd()
            }
          }}
          placeholder="O que dizer quando apertar o atalho? (ex: GG, partida excelente!)"
          className="terminal-textarea w-full p-3 text-sm min-h-[72px] font-mono"
          maxLength={500}
        />
        <div className="flex flex-wrap items-center gap-2">
          <VoiceSelect voices={cloudVoices} value={draftVoice} onChange={setDraftVoice} ariaLabel="Voz do novo atalho" />
          <HotkeySelect value={draftHotkey} onChange={setDraftHotkey} shortcuts={voiceShortcuts} ariaLabel="Tecla do novo atalho" />
          <button onClick={handleAdd} className="btn-primary btn-primary--armed inline-flex items-center gap-2 text-sm ml-auto">
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      {sortedShortcuts.length === 0 ? (
        <p className="text-center text-sm text-ink-soft py-6">Nenhum atalho ainda. Crie o primeiro acima. 👆</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sortedShortcuts.map((shortcut) => (
            <ShortcutCard
              key={shortcut.id}
              shortcut={shortcut}
              voices={cloudVoices}
              allShortcuts={voiceShortcuts}
              isTesting={testingId === shortcut.id}
              isActive={activeId === shortcut.id}
              onUpdate={(patch) => updateVoiceShortcut(shortcut.id, patch)}
              onDelete={() => {
                deleteVoiceShortcut(shortcut.id)
                toast('Atalho removido', shortcut.name, 'info')
              }}
              onTest={() => void handleTest(shortcut)}
            />
          ))}
        </div>
      )}

      <DiscordVRChatGuide defaultExpanded={false} />
    </div>
  )
}

function ShortcutCard({
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

function HotkeySelect({
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
      className="input-field font-mono text-xs w-auto"
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

function VoiceSelect({
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
