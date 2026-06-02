import { useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, Plus } from 'lucide-react'
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
} from '../utils/voiceShortcuts'
import { HotkeySelect, ShortcutCard, VoiceSelect, deriveName } from '../components/ShortcutControls'
import type { CloudVoice, VoiceShortcut } from '../../../shared/types'

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
