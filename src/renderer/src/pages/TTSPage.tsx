import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookmarkPlus,
  Cloud,
  Download,
  History,
  Keyboard,
  Loader2,
  Mic,
  MonitorUp,
  Pin,
  Plus,
  Send,
  Square,
  Volume2,
} from 'lucide-react'
import type { CloudVoice, ModelInfo } from '../../../shared/types'
import VirtualKeyboard from '../components/VirtualKeyboard'
import DiscordReadyBanner from '../components/DiscordReadyBanner'
import CloudVoicePicker from '../components/CloudVoicePicker'
import { useCommunicationSettings } from '../hooks/useCommunicationSettings'
import { useAppStore } from '../stores/appStore'
import { useShallow } from 'zustand/react/shallow'
import { notify } from '../utils/notify'
import { toast } from '../utils/toast'
import { buildHistoryItem } from '../utils/communicationState'
import { isModelVisibleInMvp } from '../utils/modelSupport'
import { playCloudAudio, stopCloudAudio } from '../utils/cloudAudio'
import { buildCsv, downloadCsv } from '../utils/historyExport'
import { detectVBCable, resolveCableSink } from '../utils/virtualMicSetup'
import { routeEngine, type EngineRouteInput } from '../utils/engineRouter'
import { isEdgeHealthy } from '../stores/appStore'
import { ShortcutCard } from '../components/ShortcutControls'
import { useVoiceShortcuts } from '../hooks/useVoiceShortcuts'
import { formatHotkeyDisplay } from '../utils/voiceShortcuts'

export default function TTSPage() {
  const {
    defaultModelId,
    defaultSpeed,
    setDefaultModelId,
    setDefaultSpeed,
    showExperimentalModels,
    voiceSource,
    storedCloudVoiceShortName,
    setStoredCloudVoice,
    cableDeviceId,
    setCableDevice,
    monitorDeviceId,
    edgeUnhealthyUntil,
  } = useAppStore(
    useShallow((s) => ({
      defaultModelId: s.defaultModelId,
      defaultSpeed: s.defaultSpeed,
      setDefaultModelId: s.setDefaultModelId,
      setDefaultSpeed: s.setDefaultSpeed,
      showExperimentalModels: s.showExperimentalModels,
      voiceSource: s.voiceSource,
      storedCloudVoiceShortName: s.cloudVoice,
      setStoredCloudVoice: s.setCloudVoice,
      cableDeviceId: s.cableDeviceId,
      setCableDevice: s.setCableDevice,
      monitorDeviceId: s.monitorDeviceId,
      edgeUnhealthyUntil: s.edgeUnhealthyUntil,
    })),
  )
  const {
    text,
    setText,
    history,
    keepTextAfterSpeak,
    setKeepTextAfterSpeak,
    addHistoryItem,
  } = useCommunicationSettings()
  const [modelId, setModelId] = useState(defaultModelId)
  const [voiceId, setVoiceId] = useState('')
  const [speed, setSpeed] = useState(defaultSpeed)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [virtualMicEnabled, setVirtualMicEnabled] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showDiscordBanner, setShowDiscordBanner] = useState(false)
  const [cloudVoice, setLocalCloudVoice] = useState<CloudVoice | null>(null)
  const [vbCableDetected, setVbCableDetected] = useState(false)
  const [installedModelIds, setInstalledModelIds] = useState<string[]>([])
  const [hardwareTier, setHardwareTier] = useState<string | undefined>(undefined)
  const shortcuts = useVoiceShortcuts()
  const [shortcutDraft, setShortcutDraft] = useState('')

  const handleCloudVoiceSelect = useCallback((voice: CloudVoice) => {
    setLocalCloudVoice(voice)
    setStoredCloudVoice(voice.ShortName)
  }, [setStoredCloudVoice])
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const cancelRef = useRef(false)
  const isSpeakingRef = useRef(false)

  useEffect(() => {
    window.electronAPI.getVirtualMicStatus().then((enabled) => {
      setVirtualMicEnabled(enabled)
    })
    void loadMicDevices()

    const unsubFocus = window.electronAPI.onGlobalFocusTTS(() => {
      textAreaRef.current?.focus()
    })
    const unsubStop = window.electronAPI.onGlobalStopAudio(() => {
      if (isSpeakingRef.current) {
        cancelRef.current = true
        window.electronAPI.stopAudio()
        stopCloudAudio()
        setIsSpeaking(false)
      }
    })
    const syncVirtualMic = (event: Event) => {
      setVirtualMicEnabled((event as CustomEvent<boolean>).detail)
    }

    window.addEventListener('voicelaunch:virtual-mic-changed', syncVirtualMic as EventListener)

    // Re-detecta o cabo quando os dispositivos de audio mudam (VB-Cable instalado
    // com o app aberto, ou backend subindo depois) — sem depender so do mount.
    const onDeviceChange = () => {
      void loadMicDevices()
    }
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)

    return () => {
      unsubFocus()
      unsubStop()
      window.removeEventListener('voicelaunch:virtual-mic-changed', syncVirtualMic as EventListener)
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
    }
  }, [])

  useEffect(() => {
    isSpeakingRef.current = isSpeaking
  }, [isSpeaking])

  useEffect(() => {
    loadRuntimeState()
  }, [showExperimentalModels])

  const loadRuntimeState = async () => {
    const [registry, detectedHardware] = await Promise.all([
      window.electronAPI.getModelRegistry(),
      window.electronAPI.getHardwareInfo(),
    ])

    // Para o roteamento Auto: modelos instalados (independente de visibilidade)
    // e o tier de hardware detectado.
    setInstalledModelIds(registry.filter((model) => model.installed).map((model) => model.id))
    setHardwareTier(detectedHardware?.recommendedTier)

    const visibleInstalledModels = registry.filter(
      (model) => model.installed && isModelVisibleInMvp(model, detectedHardware, showExperimentalModels),
    )
    setAvailableModels(visibleInstalledModels)

    if (visibleInstalledModels.length === 0) {
      setModelId('')
      return
    }

    if (!visibleInstalledModels.find((model) => model.id === modelId)) {
      const fallback = visibleInstalledModels[0].id
      setModelId(fallback)
      setDefaultModelId(fallback)
    }
  }

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed)
    setDefaultSpeed(newSpeed)
  }, [setDefaultSpeed])

  const saveCurrentPhrase = useCallback(() => {
    if (!text.trim()) return
    shortcuts.createShortcut(text)
  }, [text, shortcuts])

  const exportHistory = useCallback(() => {
    if (history.length === 0) {
      toast('Empty history', 'There are no phrases in the history to export.', 'info')
      return
    }
    const entries = history.map((item) => ({
      timestamp: item.timestamp,
      voice: item.modelId,
      text: item.text,
    }))
    const csv = buildCsv(entries)
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(csv, `tts-history-${date}.csv`)
    toast('CSV exported', `${entries.length} phrases exported successfully.`, 'success')
  }, [history])

  const buildRouteInput = (textLength: number): EngineRouteInput => ({
    mode: voiceSource,
    online: navigator.onLine,
    edgeHealthy: isEdgeHealthy(useAppStore.getState()),
    hardwareTier,
    installedModels: installedModelIds,
    textLength,
    preferredLocalModelId: modelId || defaultModelId,
  })

  /** Fala pelo Edge TTS. Retorna ok=false (com o motivo) para o fallback decidir. */
  const speakCloud = async (textToSpeak: string): Promise<{ ok: boolean; error?: string }> => {
    if (!cloudVoice) return { ok: false, error: 'no-cloud-voice' }
    const response = await window.electronAPI.synthesizeCloud({
      text: textToSpeak,
      voice: cloudVoice.ShortName,
      speed,
    })
    if (cancelRef.current) return { ok: true }
    setIsSynthesizing(false)
    if (!response.success || !response.audioBase64) {
      useAppStore.getState().reportEdgeFailure()
      return { ok: false, error: response.error || 'Could not generate the online voice.' }
    }
    useAppStore.getState().reportEdgeSuccess()
    await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm', {
      cableDeviceId: virtualMicEnabled ? cableDeviceId : undefined,
      monitorDeviceId,
    })
    if (cancelRef.current) return { ok: true }
    addHistoryItem(
      buildHistoryItem({
        text: textToSpeak,
        modelId: `cloud:${cloudVoice.ShortName}`,
        voiceId: cloudVoice.ShortName,
      }),
    )
    if (!keepTextAfterSpeak) setText('')
    return { ok: true }
  }

  /** Fala por um modelo local (Piper/Kokoro) via backend Python. */
  const speakLocal = async (textToSpeak: string, localModelId: string): Promise<boolean> => {
    const response = await window.electronAPI.synthesize({
      text: textToSpeak,
      modelId: localModelId,
      voiceId: voiceId || undefined,
      speed,
    })
    if (cancelRef.current) return true
    setIsSynthesizing(false)
    if (!response.success || !response.audioPath) {
      const msg = response.error || 'Could not generate the audio.'
      notify('Speech failed', msg)
      toast('Speech failed', msg, 'error')
      return false
    }
    const playResult = await window.electronAPI.playAudio(response.audioPath)
    if (cancelRef.current) return true
    // Diagnostico do backend: mic ligado mas a voz nao chegou ao cabo.
    if (virtualMicEnabled && playResult && playResult.routedToVirtualMic === false) {
      const reason = playResult.fallbackReason === 'device_not_found'
        ? 'CABLE Input not found'
        : playResult.fallbackReason || 'cable unavailable'
      toast(
        'Voice not on the virtual microphone',
        `The voice played on the speaker (${reason}) — Discord didn't hear it.`,
        'warning',
      )
    }
    addHistoryItem(
      buildHistoryItem({
        text: textToSpeak,
        modelId: localModelId,
        voiceId: voiceId || undefined,
        audioPath: response.audioPath,
      }),
    )
    if (!keepTextAfterSpeak) setText('')
    return true
  }

  const speak = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) return

    // Usa ref para evitar race condition: estado React ainda pode não ter atualizado
    if (isSpeakingRef.current) {
      cancelRef.current = true
      await window.electronAPI.stopAudio()
      stopCloudAudio()
      setIsSpeaking(false)
      isSpeakingRef.current = false
      return
    }

    const decision = routeEngine(buildRouteInput(textToSpeak.length))

    if (decision.engine === 'edge' && !cloudVoice) {
      toast('Choose an online voice', 'Select a voice from the Edge TTS list before speaking.', 'warning')
      return
    }
    if (decision.engine === null) {
      toast(
        'No voice available',
        `${decision.label}. Install Piper (50 MB) to speak offline.`,
        'warning',
      )
      return
    }

    cancelRef.current = false
    isSpeakingRef.current = true
    setIsSpeaking(true)
    setIsSynthesizing(true)

    try {
      if (decision.engine === 'edge') {
        const cloud = await speakCloud(textToSpeak)
        if (!cloud.ok && !cancelRef.current) {
          // A magica do Auto: falhou online, tenta local na mesma fala.
          const fallback = voiceSource === 'auto'
            ? routeEngine({ ...buildRouteInput(textToSpeak.length), online: false })
            : null
          if (fallback?.engine && fallback.modelId) {
            setIsSynthesizing(true)
            toast('Online voice failed', `Speaking with the local voice (${fallback.engine}).`, 'info')
            await speakLocal(textToSpeak, fallback.modelId)
          } else {
            const msg = cloud.error || 'Could not generate the online voice.'
            notify('Online voice error', msg)
            toast('Online voice error', msg, 'error')
          }
        }
      } else if (decision.modelId) {
        await speakLocal(textToSpeak, decision.modelId)
      }
    } catch (error) {
      if (cancelRef.current) return
      const msg = String(error)
      notify('Speech failed', msg)
      toast('Speech failed', msg, 'error')
    } finally {
      isSpeakingRef.current = false
      setIsSpeaking(false)
      setIsSynthesizing(false)
      textAreaRef.current?.focus()
    }
  }

  const loadMicDevices = async () => {
    // Deteccao primaria no renderer (online-first): nao depende do backend Python.
    // Reforco pelo backend (nomes via sounddevice) quando disponivel.
    let detected = false
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const outputs = await navigator.mediaDevices.enumerateDevices()
        detected = outputs.some((d) => d.kind === 'audiooutput' && /cable/i.test(d.label))
      }
    } catch {
      /* ignore — cai pro backend */
    }
    if (!detected) {
      try {
        const devices = await window.electronAPI.listAudioDevices()
        detected = detectVBCable(devices)
      } catch {
        /* ignore */
      }
    }
    setVbCableDetected(detected)
    return detected
  }

  // Liga o microfone virtual: garante uma saida de cabo (auto-seleciona o CABLE
  // Input se preciso) e ativa o roteamento. Reusado pelo toggle manual, pelo
  // "Verificar" e pela auto-ativacao apos a instalacao.
  const activateVirtualMic = async (announce = true): Promise<boolean> => {
    let deviceId = cableDeviceId
    if (!deviceId) {
      const cable = await resolveCableSink({ requestPermission: true })
      if (cable.status === 'found') {
        setCableDevice(cable.id, cable.label)
        deviceId = cable.id
      } else if (cable.status === 'permission-denied' && announce) {
        toast(
          'Microphone permission denied',
          "Without it the app can't see device names or find CABLE Input. Allow access and try again.",
          'warning',
        )
        return false
      }
    }
    if (!deviceId) {
      if (announce) {
        toast(
          'Choose the audio output',
          'Open Settings > Virtual microphone and select CABLE Input so Discord hears the online voice.',
          'warning',
        )
      }
      return false
    }
    // No modo online a voz e roteada pelo NAVEGADOR (setSinkId), entao ter um cabo ja
    // basta para o Discord ouvir. O backend e avisado em best-effort (usado por vozes
    // locais), sem bloquear — antes, uma falha do /mic/route deixava o mic "mudo".
    void window.electronAPI.setVirtualMic(true)
    setVirtualMicEnabled(true)
    window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: true }))
    setShowDiscordBanner(true)
    return true
  }

  const toggleVirtualMic = async () => {
    if (!vbCableDetected) {
      // O VB-Cable vem junto com o instalador do app. Re-detecta (caso tenha acabado
      // de instalar/reiniciar) e, se ainda nao aparecer, orienta — sem instalar nada.
      const ok = await loadMicDevices()
      if (!ok) {
        toast(
          'Virtual microphone not found',
          'It comes with the app installer. If you just installed it, restart Windows.',
          'warning',
        )
        return
      }
    }
    if (virtualMicEnabled) {
      setVirtualMicEnabled(false)
      void window.electronAPI.setVirtualMic(false)
      window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: false }))
      return
    }
    // No modo online a voz e roteada pelo NAVEGADOR (setSinkId), nao pelo backend.
    await activateVirtualMic()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void speak(text)
    }
  }

  const noReadyModel = availableModels.length === 0
  const canSpeak =
    voiceSource === 'cloud'
      ? Boolean(cloudVoice)
      : voiceSource === 'local'
        ? !noReadyModel
        : Boolean(cloudVoice) || installedModelIds.length > 0
  const speakDisabled = !canSpeak || (voiceSource === 'local' && noReadyModel)

  // Preview da decisao de roteamento para a linha de status ("Auto → Edge (online)").
  const routePreview = routeEngine({
    mode: voiceSource,
    online: navigator.onLine,
    edgeHealthy: isEdgeHealthy({ edgeUnhealthyUntil }),
    hardwareTier,
    installedModels: installedModelIds,
    textLength: text.length,
    preferredLocalModelId: modelId || defaultModelId,
  })

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                border: '1px solid var(--vl-hud-border-strong)',
                background: 'var(--vl-surface-raised)',
                boxShadow: 'none',
              }}
            >
              <Volume2 className="h-5 w-5" style={{ color: 'var(--vl-state-ready)' }} />
            </div>
            <div className="space-y-1">
              <h1 className="text-page font-bold tracking-tight text-ink-strong">Speak</h1>
              <p className="max-w-2xl text-sm text-ink-soft">
                Main console for composing, repeating, and quick-firing voice.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleVirtualMic}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                virtualMicEnabled ? 'status-pill--live' : 'btn-secondary'
              }`}
              title="Sends the voice as a virtual microphone to Discord, Zoom, and games"
            >
              <Mic className="h-4 w-4" />
              {virtualMicEnabled ? 'Virtual mic active' : 'Enable virtual mic'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`btn-secondary inline-flex items-center gap-2 text-sm ${
                showHistory ? 'border-brand-400/60 text-brand-100' : ''
              }`}
              title="Phrase history"
              aria-label="Phrase history"
            >
              <History className="h-4 w-4" />
              {showHistory ? 'Hide history' : 'Show history'}
            </button>
            <button
              onClick={exportHistory}
              disabled={history.length === 0}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
              title="Export history as CSV"
              aria-label="Export history as CSV"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="hud-frame flex flex-wrap items-center gap-3 p-3">
          <span className="status-pill">
            <Cloud className="h-3.5 w-3.5" />
            {cloudVoice
              ? cloudVoice.FriendlyName.replace(/^Microsoft\s+/i, '').replace(/\s+Online\s+\(Natural\).*$/i, '')
              : 'Choose a voice'}
          </span>
          <span className={`status-pill ${virtualMicEnabled ? 'status-pill--live' : ''}`}>
            <Mic className="h-3.5 w-3.5" />
            {virtualMicEnabled ? 'Virtual mic on' : 'Virtual mic off'}
          </span>
          {(isSynthesizing || isSpeaking) && (
            <span className="status-pill status-pill--live">
              {isSynthesizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MonitorUp className="h-3.5 w-3.5" />}
              {isSynthesizing ? 'Generating audio...' : 'Speaking now'}
            </span>
          )}
        </div>
      </div>

      <DiscordReadyBanner
        visible={showDiscordBanner && virtualMicEnabled}
        onClose={() => setShowDiscordBanner(false)}
        modelId={modelId}
        speed={speed}
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <CloudVoicePicker
            selectedVoice={cloudVoice?.ShortName ?? storedCloudVoiceShortName ?? null}
            onSelect={handleCloudVoiceSelect}
          />
          <div className="hud-frame p-4 space-y-3 min-w-0">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" style={{ color: 'var(--vl-state-ready)' }} />
              <h3 className="text-sm font-semibold text-ink-strong">Speed</h3>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="tts-speed-cloud"
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="flex-1 accent-brand-400"
                aria-label="Speech speed"
                aria-valuemin={0.5}
                aria-valuemax={2.0}
                aria-valuenow={speed}
                aria-valuetext={`${speed.toFixed(1)}x`}
              />
              <span className="w-12 text-sm text-ink-body font-mono">{speed.toFixed(1)}x</span>
            </div>
            <p className="text-xs text-ink-soft">
              Online voices come from Microsoft Edge TTS. They work instantly, with no installation, but need internet.
            </p>
            {cloudVoice && (
              <div className="panel-muted p-2.5 text-xs text-ink-body">
                Selected voice: <span className="font-medium text-ink-strong">{cloudVoice.FriendlyName.replace(/^Microsoft\s+/i, '')}</span>
              </div>
            )}
          </div>
        </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 2xl:flex-row 2xl:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="terminal-textarea flex min-h-0 flex-1 flex-col p-5">
            <textarea
              ref={textAreaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="> type a phrase. Enter sends. Shift+Enter for a new line."
              className="min-h-[280px] flex-1 resize-none bg-transparent text-xl leading-8 text-ink-strong outline-none placeholder:text-ink-mute font-mono"
              autoFocus
              disabled={voiceSource === 'local' && noReadyModel}
            />

            <div className="mt-4 flex flex-col gap-3 border-t border-chrome-600/70 pt-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full border px-3 py-1 text-ink-soft" style={{ borderColor: 'var(--vl-hud-border)', background: 'var(--vl-surface-sunken)' }}>
                    {text.length} characters
                  </span>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={keepTextAfterSpeak}
                    onChange={(event) => setKeepTextAfterSpeak(event.target.checked)}
                    className="accent-brand-500"
                  />
                  Keep text after speaking
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                  onClick={() => {
                    setText('')
                    textAreaRef.current?.focus()
                  }}
                  className="btn-secondary text-sm"
                  aria-label="Clear text"
                >
                  Clear
                </button>
                <VirtualKeyboard
                  onKeyPress={(key) => {
                    setText((prev) => prev + key)
                    setTimeout(() => textAreaRef.current?.focus(), 50)
                  }}
                  onBackspace={() => {
                    setText((prev) => prev.slice(0, -1))
                  }}
                  onSpace={() => {
                    setText((prev) => prev + ' ')
                  }}
                  onEnter={() => {
                    void speak(text)
                  }}
                />
                <button
                  onClick={saveCurrentPhrase}
                  disabled={!text.trim()}
                  className="btn-secondary text-sm flex items-center gap-2"
                  aria-label="Save current phrase as a quick shortcut"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Save phrase
                </button>
                <button
                  onClick={() => void speak(text)}
                  disabled={(!isSpeaking && !text.trim()) || speakDisabled}
                  className={`btn-primary ${canSpeak && text.trim() ? 'btn-primary--armed' : ''} inline-flex min-w-[158px] items-center justify-center gap-2 px-5 py-3 text-sm`}
                  aria-label={isSpeaking ? (isSynthesizing ? 'Generating audio...' : 'Stop speaking') : 'Speak text'}
                  aria-busy={isSynthesizing}
                >
                  {isSpeaking ? (
                    isSynthesizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        Stop
                      </>
                    )
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Speak
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-right text-xs text-ink-soft" aria-live="polite">
                {routePreview.label}
              </p>
            </div>
          </div>

          <div className="hud-frame p-4 min-w-0 2xl:w-[380px] 2xl:shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="h-4 w-4" style={{ color: 'var(--vl-state-ready)' }} />
              <h3 className="text-sm font-semibold text-ink-strong">Quick shortcuts</h3>
            </div>
            <p className="mb-3 text-xs text-ink-soft">
              Write the phrase, click <strong>Create shortcut</strong>, and trigger it with the key anywhere (Discord, game).
            </p>

            {/* Create a shortcut inline — write and create without leaving the screen */}
            <div className="hud-frame p-3 mb-3 space-y-2" style={{ background: 'var(--vl-surface-raised)' }}>
              <textarea
                value={shortcutDraft}
                onChange={(e) => setShortcutDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    if (shortcuts.createShortcut(shortcutDraft)) setShortcutDraft('')
                  }
                }}
                placeholder="What should the shortcut say? (e.g. GG, great match!)"
                className="terminal-textarea w-full p-3 text-sm min-h-[60px] font-mono"
                maxLength={500}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-soft">
                  Key: <span className="font-mono text-ink-body">{formatHotkeyDisplay(shortcuts.suggestedHotkey)}</span>
                </span>
                <button
                  onClick={() => { if (shortcuts.createShortcut(shortcutDraft)) setShortcutDraft('') }}
                  disabled={!shortcutDraft.trim()}
                  className="btn-primary btn-primary--armed inline-flex items-center gap-2 text-sm ml-auto"
                >
                  <Plus className="h-4 w-4" />
                  Create shortcut
                </button>
              </div>
            </div>

            {shortcuts.sortedShortcuts.length === 0 ? (
              <p className="text-center text-xs text-ink-soft py-4">No shortcuts yet. Create the first one above.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                {shortcuts.sortedShortcuts.map((entry) => (
                  <ShortcutCard
                    key={entry.id}
                    shortcut={entry}
                    voices={shortcuts.cloudVoices}
                    allShortcuts={shortcuts.voiceShortcuts}
                    isTesting={shortcuts.testingId === entry.id}
                    isActive={shortcuts.activeId === entry.id}
                    onUpdate={(patch) => shortcuts.updateShortcut(entry.id, patch)}
                    onDelete={() => shortcuts.deleteShortcut(entry.id)}
                    onTest={() => void shortcuts.testShortcut(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {showHistory && (
          <aside className="panel-surface w-full overflow-auto p-4 xl:w-80">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-brand-300" />
              <h3 className="text-sm font-semibold text-ink-strong">Persistent history</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-ink-soft">No phrases yet.</p>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border p-3"
                    style={{ borderColor: 'var(--vl-hud-border)', background: 'var(--vl-surface-sunken)' }}
                  >
                    <button
                      onClick={() => {
                        setText(item.text)
                        setModelId(item.modelId)
                        if (item.voiceId) setVoiceId(item.voiceId)
                      }}
                      className="w-full text-left"
                      aria-label={`Load phrase: ${item.text.slice(0, 30)}`}
                    >
                      <p className="line-clamp-3 text-sm text-ink-body">{item.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full border px-2 py-1 text-[11px] text-ink-soft"
                          style={{ borderColor: 'var(--vl-hud-border)', background: 'var(--vl-surface-overlay)' }}
                        >
                          {item.modelId}
                        </span>
                        <span className="text-xs text-ink-soft">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setText(item.text)
                          void speak(item.text)
                        }}
                        className="btn-secondary flex items-center gap-1 text-xs"
                      >
                        <Send className="w-3 h-3" />
                        Repeat
                      </button>
                      <button
                        onClick={() => {
                          shortcuts.createShortcut(item.text)
                        }}
                        className="btn-secondary flex items-center gap-1 text-xs"
                      >
                        <Pin className="w-3 h-3" />
                        Pin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {virtualMicEnabled && (
        <div
          className="mt-4 flex items-center gap-2 text-sm p-3 rounded-2xl"
          style={{ background: 'var(--vl-state-live-bg)', border: '1px solid var(--vl-state-live-border)', color: 'var(--vl-state-live-text)' }}
        >
          <MonitorUp className="w-4 h-4" />
          <span>
            The generated audio will be sent to the <strong>virtual microphone</strong>.
            Select &quot;CABLE Output&quot; as the microphone in Discord, Zoom, or games.
          </span>
        </div>
      )}
    </div>
  )
}
