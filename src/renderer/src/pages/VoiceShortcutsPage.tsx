import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Cloud,
  HardDrive,
  Keyboard,
  Loader2,
  PlayCircle,
  Plus,
  Save,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import DiscordVRChatGuide from '../components/DiscordVRChatGuide'
import { playCloudAudio } from '../utils/cloudAudio'
import { toast } from '../utils/toast'
import {
  HOTKEY_SLOTS,
  formatHotkeyDisplay,
  generateShortcutId,
  isHotkeyTaken,
  suggestNextHotkey,
  validateVoiceShortcut,
} from '../utils/voiceShortcuts'
import type { CloudVoice, ModelInfo, VoiceShortcut, VoiceSource } from '../../../shared/types'

function emptyShortcut(suggestedHotkey: string | null, defaultVoice?: string | null): VoiceShortcut {
  return {
    id: generateShortcutId(),
    name: '',
    hotkey: suggestedHotkey ?? 'CommandOrControl+Shift+1',
    enabled: true,
    voiceSource: 'cloud',
    voice: defaultVoice ?? '',
    text: '',
    speed: 1.0,
  }
}

export default function VoiceShortcutsPage() {
  const voiceShortcuts = useAppStore((state) => state.voiceShortcuts)
  const addVoiceShortcut = useAppStore((state) => state.addVoiceShortcut)
  const updateVoiceShortcut = useAppStore((state) => state.updateVoiceShortcut)
  const deleteVoiceShortcut = useAppStore((state) => state.deleteVoiceShortcut)
  const cloudVoiceDefault = useAppStore((state) => state.cloudVoice)
  const cableDeviceId = useAppStore((state) => state.cableDeviceId)

  const [editing, setEditing] = useState<VoiceShortcut | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [cloudVoices, setCloudVoices] = useState<CloudVoice[]>([])
  const [localModels, setLocalModels] = useState<ModelInfo[]>([])
  const [cloudError, setCloudError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    window.electronAPI.listCloudVoices().then((response) => {
      if (!active) return
      if (response.success) {
        setCloudVoices(response.voices)
        setCloudError(null)
      } else {
        setCloudError(response.error || 'Falha ao carregar vozes online.')
      }
    })
    window.electronAPI.getModelRegistry().then((registry) => {
      if (!active) return
      setLocalModels(registry.filter((model) => model.installed))
    })
    return () => {
      active = false
    }
  }, [])

  const handleNew = () => {
    setEditing(emptyShortcut(suggestNextHotkey(voiceShortcuts), cloudVoiceDefault))
    setIsNew(true)
  }

  const handleEdit = (shortcut: VoiceShortcut) => {
    setEditing({ ...shortcut })
    setIsNew(false)
  }

  const handleCancel = () => {
    setEditing(null)
    setIsNew(false)
  }

  const handleSave = (shortcut: VoiceShortcut) => {
    const errors = validateVoiceShortcut(shortcut)
    if (errors.length > 0) {
      toast('Atalho invalido', errors.join(' '), 'error')
      return
    }
    if (isHotkeyTaken(shortcut.hotkey, voiceShortcuts, isNew ? undefined : shortcut.id)) {
      toast('Atalho ja usado', 'Esse atalho ja esta em uso. Escolha outro.', 'warning')
      return
    }
    if (isNew) {
      addVoiceShortcut(shortcut)
      toast('Atalho criado', `${shortcut.name} → ${formatHotkeyDisplay(shortcut.hotkey)}`, 'success')
    } else {
      updateVoiceShortcut(shortcut.id, shortcut)
      toast('Atalho atualizado', shortcut.name, 'success')
    }
    setEditing(null)
    setIsNew(false)
  }

  const handleDelete = (shortcut: VoiceShortcut) => {
    deleteVoiceShortcut(shortcut.id)
    toast('Atalho removido', shortcut.name, 'info')
  }

  const handleTest = async (shortcut: VoiceShortcut) => {
    if (testingId) return
    setTestingId(shortcut.id)
    try {
      if (shortcut.voiceSource === 'cloud') {
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
        await playCloudAudio(
          response.audioBase64,
          response.mimeType ?? 'audio/webm',
          cableDeviceId ?? undefined,
        )
      } else {
        const response = await window.electronAPI.synthesize({
          text: shortcut.text,
          modelId: shortcut.voice,
          speed: shortcut.speed,
        })
        if (response.success && response.audioPath) {
          await window.electronAPI.playAudio(response.audioPath)
        } else {
          toast('Falha no teste', response.error || 'Backend Python indisponivel.', 'error')
        }
      }
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              border: '1px solid var(--vl-hud-border-strong)',
              background: 'rgba(139,92,246,0.14)',
              boxShadow: '0 0 24px rgba(139,92,246,0.25)',
            }}
          >
            <Keyboard className="h-5 w-5 neon-glow" style={{ color: 'var(--vl-state-ready)' }} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-ink-strong">Atalhos de voz</h1>
            <p className="max-w-2xl text-sm text-ink-soft">
              Cada atalho dispara uma frase com voz e velocidade fixas. Funciona mesmo com o app em segundo plano (no Discord, VRChat ou jogo).
            </p>
          </div>
        </div>
        <button onClick={handleNew} className="btn-primary inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo atalho
        </button>
      </div>

      {cloudError && (
        <div
          className="rounded-2xl p-3 text-sm"
          style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)', color: 'var(--vl-state-warn-text)' }}
        >
          Vozes online indisponiveis ({cloudError}). Atalhos cloud ainda podem ser criados mas so funcionam quando voltar a conexao.
        </div>
      )}

      {sortedShortcuts.length === 0 ? (
        <EmptyState onCreate={handleNew} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sortedShortcuts.map((shortcut) => (
            <ShortcutCard
              key={shortcut.id}
              shortcut={shortcut}
              isTesting={testingId === shortcut.id}
              cloudVoices={cloudVoices}
              localModels={localModels}
              onTest={() => void handleTest(shortcut)}
              onEdit={() => handleEdit(shortcut)}
              onDelete={() => handleDelete(shortcut)}
              onToggleEnabled={(enabled) => updateVoiceShortcut(shortcut.id, { enabled })}
            />
          ))}
        </div>
      )}

      <DiscordVRChatGuide defaultExpanded={false} />

      {editing && (
        <ShortcutEditor
          shortcut={editing}
          isNew={isNew}
          cloudVoices={cloudVoices}
          localModels={localModels}
          existingShortcuts={voiceShortcuts}
          onChange={setEditing}
          onCancel={handleCancel}
          onSave={() => handleSave(editing)}
        />
      )}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="hud-frame hud-frame--hero scanline p-10 text-center space-y-4">
      <Keyboard className="h-12 w-12 mx-auto neon-glow" style={{ color: 'var(--vl-state-ready)' }} />
      <h2 className="text-2xl font-bold text-ink-strong">Crie seu primeiro atalho</h2>
      <p className="text-ink-body max-w-md mx-auto">
        Salve frases que voce usa muito (GG, cuidado, oi pessoal) com voz fixa e dispare via teclado a qualquer hora.
      </p>
      <button onClick={onCreate} className="btn-primary btn-primary--armed inline-flex items-center gap-2 mx-auto">
        <Plus className="h-4 w-4" />
        Criar atalho
      </button>
    </div>
  )
}

function ShortcutCard({
  shortcut,
  isTesting,
  cloudVoices,
  localModels,
  onTest,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  shortcut: VoiceShortcut
  isTesting: boolean
  cloudVoices: CloudVoice[]
  localModels: ModelInfo[]
  onTest: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: (enabled: boolean) => void
}) {
  const voiceLabel = useMemo(() => {
    if (shortcut.voiceSource === 'cloud') {
      const found = cloudVoices.find((voice) => voice.ShortName === shortcut.voice)
      return found ? `${found.FriendlyName.replace(/^Microsoft\s+/i, '').replace(/\s+Online\s+\(Natural\).*$/i, '')} · ${found.Locale}` : shortcut.voice
    }
    const found = localModels.find((model) => model.id === shortcut.voice)
    return found?.name ?? shortcut.voice
  }, [shortcut, cloudVoices, localModels])

  return (
    <div className={`hud-frame card-hover p-4 space-y-3 ${shortcut.enabled ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="badge-shortcut" style={{ width: 'auto', height: 'auto', padding: '2px 8px', minWidth: 'auto' }}>
              {formatHotkeyDisplay(shortcut.hotkey)}
            </span>
            <span
              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1"
              style={{
                background: shortcut.voiceSource === 'cloud' ? 'rgba(73,230,255,0.14)' : 'rgba(139,92,246,0.18)',
                color: shortcut.voiceSource === 'cloud' ? '#A5F0FF' : '#D3B8FF',
              }}
            >
              {shortcut.voiceSource === 'cloud' ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
              {shortcut.voiceSource === 'cloud' ? 'Online' : 'Local'}
            </span>
          </div>
          <h3 className="font-semibold text-ink-strong text-base truncate">{shortcut.name}</h3>
          <p className="text-xs text-ink-soft mt-0.5 truncate">{voiceLabel} · {shortcut.speed.toFixed(1)}x</p>
        </div>
        <label
          className="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none"
          title={shortcut.enabled ? 'Desativar atalho' : 'Ativar atalho'}
        >
          <input
            type="checkbox"
            checked={shortcut.enabled}
            onChange={(event) => onToggleEnabled(event.target.checked)}
            className="accent-brand-500"
          />
          {shortcut.enabled ? 'Ativo' : 'Inativo'}
        </label>
      </div>

      <p className="terminal-textarea px-3 py-2 text-sm text-ink-body line-clamp-3 font-mono">{shortcut.text}</p>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onTest}
          disabled={isTesting}
          className="btn-primary inline-flex items-center gap-1.5 text-xs"
        >
          {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
          {isTesting ? 'Tocando...' : 'Testar'}
        </button>
        <button onClick={onEdit} className="btn-secondary inline-flex items-center gap-1.5 text-xs">
          Editar
        </button>
        <button
          onClick={onDelete}
          className="btn-ghost text-xs"
          style={{ color: 'var(--vl-state-error)' }}
          aria-label={`Excluir atalho ${shortcut.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </button>
      </div>
    </div>
  )
}

function ShortcutEditor({
  shortcut,
  isNew,
  cloudVoices,
  localModels,
  existingShortcuts,
  onChange,
  onCancel,
  onSave,
}: {
  shortcut: VoiceShortcut
  isNew: boolean
  cloudVoices: CloudVoice[]
  localModels: ModelInfo[]
  existingShortcuts: VoiceShortcut[]
  onChange: (next: VoiceShortcut) => void
  onCancel: () => void
  onSave: () => void
}) {
  const set = (patch: Partial<VoiceShortcut>) => onChange({ ...shortcut, ...patch })

  const hotkeyConflict =
    isHotkeyTaken(shortcut.hotkey, existingShortcuts, isNew ? undefined : shortcut.id) &&
    !existingShortcuts.some((entry) => entry.id === shortcut.id && entry.hotkey === shortcut.hotkey)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="hud-frame hud-frame--hero w-full max-w-2xl p-6 space-y-4 animate-lift-in">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink-strong">{isNew ? 'Novo atalho' : 'Editar atalho'}</h2>
          <button onClick={onCancel} className="btn-ghost p-1.5" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nome">
            <input
              type="text"
              value={shortcut.name}
              onChange={(event) => set({ name: event.target.value })}
              placeholder="Ex: GG Triunfante"
              className="input-field"
              maxLength={48}
              autoFocus
            />
          </Field>

          <Field label="Atalho de teclado">
            <select
              value={shortcut.hotkey}
              onChange={(event) => set({ hotkey: event.target.value })}
              className="input-field font-mono text-sm"
            >
              {HOTKEY_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {formatHotkeyDisplay(slot)}
                </option>
              ))}
            </select>
            {hotkeyConflict && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--vl-state-warn)' }}>
                <AlertCircle className="h-3 w-3" /> Essa combinacao ja esta em uso.
              </p>
            )}
          </Field>

          <Field label="Origem da voz">
            <div className="flex items-center gap-2">
              {(['cloud', 'local'] as VoiceSource[]).map((source) => (
                <button
                  key={source}
                  onClick={() => set({ voiceSource: source, voice: '' })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all ${
                    shortcut.voiceSource === source ? 'btn-primary' : 'btn-secondary'
                  }`}
                  aria-pressed={shortcut.voiceSource === source}
                >
                  {source === 'cloud' ? <Cloud className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
                  {source === 'cloud' ? 'Online (Edge TTS)' : 'Local (Piper/Kokoro)'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Voz">
            {shortcut.voiceSource === 'cloud' ? (
              <CloudVoiceSelect
                voices={cloudVoices}
                value={shortcut.voice}
                onChange={(voice) => set({ voice })}
              />
            ) : (
              <select
                value={shortcut.voice}
                onChange={(event) => set({ voice: event.target.value })}
                className="input-field text-sm"
                disabled={localModels.length === 0}
              >
                {localModels.length === 0 && <option value="">Nenhum modelo instalado</option>}
                {localModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Frase que sera falada">
            <textarea
              value={shortcut.text}
              onChange={(event) => set({ text: event.target.value })}
              placeholder="Digite a frase exata que esse atalho vai falar..."
              className="terminal-textarea p-3 w-full text-sm min-h-[88px] font-mono"
              maxLength={500}
            />
            <p className="text-xs text-ink-mute mt-1">{shortcut.text.length}/500 caracteres</p>
          </Field>

          <Field label="Velocidade">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={shortcut.speed}
                onChange={(event) => set({ speed: parseFloat(event.target.value) })}
                className="flex-1 accent-brand-400"
              />
              <span className="w-12 text-sm font-mono text-ink-body">{shortcut.speed.toFixed(1)}x</span>
            </div>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--vl-hud-border)' }}>
          <button onClick={onCancel} className="btn-secondary inline-flex items-center gap-2">
            <Square className="h-4 w-4" />
            Cancelar
          </button>
          <button onClick={onSave} className="btn-primary inline-flex items-center gap-2">
            <Save className="h-4 w-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.18em] text-ink-mute">{label}</span>
      {children}
    </label>
  )
}

function CloudVoiceSelect({
  voices,
  value,
  onChange,
}: {
  voices: CloudVoice[]
  value: string
  onChange: (voice: string) => void
}) {
  const [localeFilter, setLocaleFilter] = useState<string>('pt-BR')
  const locales = useMemo(() => {
    const set = new Set<string>()
    for (const voice of voices) set.add(voice.Locale)
    return Array.from(set).sort()
  }, [voices])
  const filtered = useMemo(() => {
    return voices
      .filter((voice) => (localeFilter === 'all' ? true : voice.Locale === localeFilter))
      .sort((a, b) => a.ShortName.localeCompare(b.ShortName))
  }, [voices, localeFilter])

  if (voices.length === 0) {
    return (
      <div className="text-sm text-ink-soft inline-flex items-center gap-2">
        <Volume2 className="h-4 w-4" />
        Carregando vozes online ou sem internet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <select
        value={localeFilter}
        onChange={(event) => setLocaleFilter(event.target.value)}
        className="input-field text-xs w-40"
        aria-label="Idioma"
      >
        <option value="all">Todos os idiomas</option>
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {locale}
          </option>
        ))}
      </select>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-field text-sm"
      >
        <option value="">Selecione uma voz...</option>
        {filtered.map((voice) => (
          <option key={voice.ShortName} value={voice.ShortName}>
            {voice.FriendlyName.replace(/^Microsoft\s+/i, '').replace(/\s+Online\s+\(Natural\).*$/i, '')} ({voice.Gender === 'Female' ? 'F' : 'M'})
          </option>
        ))}
      </select>
    </div>
  )
}
