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
  Wrench,
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
import VirtualMicSetupPanel from '../components/VirtualMicSetupPanel'
import {
  detectVBCable,
  resolveVBCableInstallState,
  type VBCableDownloadProgress,
  type VBCableInstallState,
} from '../utils/virtualMicSetup'
import { ShortcutCard } from '../components/ShortcutControls'
import { useVoiceShortcuts } from '../hooks/useVoiceShortcuts'
import { formatHotkeyDisplay } from '../utils/voiceShortcuts'

/**
 * Acha o dispositivo de saida "CABLE Input" para rotear a voz online (Edge TTS)
 * pelo navegador (setSinkId). Pede permissao de microfone se os nomes vierem
 * vazios. Retorna null se nao encontrar.
 */
async function autoSelectCableOutput(): Promise<{ id: string; label: string } | null> {
  if (!navigator.mediaDevices?.enumerateDevices) return null
  const pick = (list: MediaDeviceInfo[]) => {
    const outs = list.filter((d) => d.kind === 'audiooutput')
    return outs.find((d) => /cable input/i.test(d.label)) || outs.find((d) => /cable/i.test(d.label)) || null
  }
  let found = pick(await navigator.mediaDevices.enumerateDevices())
  if (!found && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      found = pick(await navigator.mediaDevices.enumerateDevices())
    } catch {
      /* permissao negada — sem nomes nao da pra auto-selecionar */
    }
  }
  return found ? { id: found.deviceId, label: found.label || 'CABLE Input' } : null
}

export default function TTSPage() {
  const {
    defaultModelId,
    defaultSpeed,
    setDefaultModelId,
    setDefaultSpeed,
    showExperimentalModels,
    voiceSource,
    setVoiceSource,
    storedCloudVoiceShortName,
    setStoredCloudVoice,
    cableDeviceId,
    setCableDevice,
    monitorDeviceId,
  } = useAppStore(
    useShallow((s) => ({
      defaultModelId: s.defaultModelId,
      defaultSpeed: s.defaultSpeed,
      setDefaultModelId: s.setDefaultModelId,
      setDefaultSpeed: s.setDefaultSpeed,
      showExperimentalModels: s.showExperimentalModels,
      voiceSource: s.voiceSource,
      setVoiceSource: s.setVoiceSource,
      storedCloudVoiceShortName: s.cloudVoice,
      setStoredCloudVoice: s.setCloudVoice,
      cableDeviceId: s.cableDeviceId,
      setCableDevice: s.setCableDevice,
      monitorDeviceId: s.monitorDeviceId,
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
  const [micInstallState, setMicInstallState] = useState<VBCableInstallState>('idle')
  const [micInstallMessage, setMicInstallMessage] = useState<string | undefined>(undefined)
  const [installingMic, setInstallingMic] = useState(false)
  const [micDownloadProgress, setMicDownloadProgress] = useState<VBCableDownloadProgress | null>(null)
  const shortcuts = useVoiceShortcuts()
  const [shortcutDraft, setShortcutDraft] = useState('')

  const handleCloudVoiceSelect = useCallback((voice: CloudVoice) => {
    setLocalCloudVoice(voice)
    setStoredCloudVoice(voice.ShortName)
  }, [setStoredCloudVoice])
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const cancelRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const micPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const micAutoActivatedRef = useRef(false)

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
    const offMicProgress = window.electronAPI.onVBCableDownloadProgress((data) => {
      setMicInstallState('downloading')
      setMicDownloadProgress(data)
    })
    const offMicComplete = window.electronAPI.onVBCableDownloadComplete(() => {
      setMicDownloadProgress(null)
    })

    const syncVirtualMic = (event: Event) => {
      setVirtualMicEnabled((event as CustomEvent<boolean>).detail)
    }

    window.addEventListener('voicelaunch:virtual-mic-changed', syncVirtualMic as EventListener)

    return () => {
      unsubFocus()
      unsubStop()
      offMicProgress()
      offMicComplete()
      window.removeEventListener('voicelaunch:virtual-mic-changed', syncVirtualMic as EventListener)
      if (micPollRef.current) clearInterval(micPollRef.current)
    }
  }, [])

  useEffect(() => {
    isSpeakingRef.current = isSpeaking
  }, [isSpeaking])

  useEffect(() => {
    loadRuntimeState()
  }, [showExperimentalModels])

  // App focado no online: a fonte de voz e sempre Edge TTS (sem caminho local).
  useEffect(() => {
    if (voiceSource !== 'cloud') setVoiceSource('cloud')
  }, [voiceSource, setVoiceSource])

  const loadRuntimeState = async () => {
    const [registry, detectedHardware] = await Promise.all([
      window.electronAPI.getModelRegistry(),
      window.electronAPI.getHardwareInfo(),
    ])

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
      toast('Historico vazio', 'Nao ha frases no historico para exportar.', 'info')
      return
    }
    const entries = history.map((item) => ({
      timestamp: item.timestamp,
      voice: item.modelId,
      text: item.text,
    }))
    const csv = buildCsv(entries)
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(csv, `historico-tts-${date}.csv`)
    toast('CSV exportado', `${entries.length} frases exportadas com sucesso.`, 'success')
  }, [history])

  const speak = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) return
    if (voiceSource === 'local' && !modelId) return
    if (voiceSource === 'cloud' && !cloudVoice) {
      toast('Escolha uma voz online', 'Selecione uma voz na lista de Edge TTS antes de falar.', 'warning')
      return
    }

    // Usa ref para evitar race condition: estado React ainda pode não ter atualizado
    if (isSpeakingRef.current) {
      cancelRef.current = true
      await window.electronAPI.stopAudio()
      stopCloudAudio()
      setIsSpeaking(false)
      isSpeakingRef.current = false
      return
    }

    cancelRef.current = false
    isSpeakingRef.current = true
    setIsSpeaking(true)
    setIsSynthesizing(true)

    try {
      if (voiceSource === 'cloud' && cloudVoice) {
        const response = await window.electronAPI.synthesizeCloud({
          text: textToSpeak,
          voice: cloudVoice.ShortName,
          speed,
        })
        if (cancelRef.current) return
        setIsSynthesizing(false)
        if (response.success && response.audioBase64) {
          await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm', {
            cableDeviceId: virtualMicEnabled ? cableDeviceId : undefined,
            monitorDeviceId,
          })
          addHistoryItem(
            buildHistoryItem({
              text: textToSpeak,
              modelId: `cloud:${cloudVoice.ShortName}`,
              voiceId: cloudVoice.ShortName,
            }),
          )
          if (!keepTextAfterSpeak) setText('')
        } else {
          const msg = response.error || 'Nao foi possivel gerar a voz online.'
          notify('Erro na voz online', msg)
          toast('Erro na voz online', msg, 'error')
        }
      } else {
        const response = await window.electronAPI.synthesize({
          text: textToSpeak,
          modelId,
          voiceId: voiceId || undefined,
          speed,
        })
        if (cancelRef.current) return
        setIsSynthesizing(false)
        if (response.success && response.audioPath) {
          await window.electronAPI.playAudio(response.audioPath)
          if (cancelRef.current) return
          addHistoryItem(
            buildHistoryItem({
              text: textToSpeak,
              modelId,
              voiceId: voiceId || undefined,
              audioPath: response.audioPath,
            }),
          )
          if (!keepTextAfterSpeak) setText('')
        } else {
          const msg = response.error || 'Nao foi possivel gerar o audio.'
          notify('Erro na fala', msg)
          toast('Erro na fala', msg, 'error')
        }
      }
    } catch (error) {
      if (cancelRef.current) return
      const msg = String(error)
      notify('Erro na fala', msg)
      toast('Erro na fala', msg, 'error')
    } finally {
      isSpeakingRef.current = false
      setIsSpeaking(false)
      setIsSynthesizing(false)
      textAreaRef.current?.focus()
    }
  }

  const loadMicDevices = async () => {
    try {
      const devices = await window.electronAPI.listAudioDevices()
      const detected = detectVBCable(devices)
      setVbCableDetected(detected)
      if (detected) {
        setMicInstallState('idle')
        setMicInstallMessage(undefined)
      }
      return detected
    } catch {
      setVbCableDetected(false)
      return false
    }
  }

  // Liga o microfone virtual: garante uma saida de cabo (auto-seleciona o CABLE
  // Input se preciso) e ativa o roteamento. Reusado pelo toggle manual, pelo
  // "Verificar" e pela auto-ativacao apos a instalacao.
  const activateVirtualMic = async (announce = true): Promise<boolean> => {
    if (voiceSource === 'cloud' && !cableDeviceId) {
      const cable = await autoSelectCableOutput()
      if (cable) {
        setCableDevice(cable.id, cable.label)
      } else if (announce) {
        toast(
          'Escolha a saida de audio',
          'Abra Ajustes > Microfone Virtual e selecione CABLE Input para o Discord ouvir a voz online.',
          'warning',
        )
      }
    }
    const success = await window.electronAPI.setVirtualMic(true)
    if (success) {
      setVirtualMicEnabled(true)
      window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: true }))
      setShowDiscordBanner(true)
    }
    return success
  }

  const stopMicAutoPoll = () => {
    if (micPollRef.current) {
      clearInterval(micPollRef.current)
      micPollRef.current = null
    }
  }

  // Apos abrir o instalador, verifica sozinho (a cada 3s, ate ~2min) ate o driver
  // aparecer; quando aparece, ativa o mic automaticamente — sem clique manual.
  const startMicAutoDetect = () => {
    if (micPollRef.current) return
    let elapsed = 0
    const tick = async () => {
      elapsed += 3000
      await window.electronAPI.refreshVirtualMic().catch(() => undefined)
      const detected = await loadMicDevices()
      if (detected) {
        stopMicAutoPoll()
        if (!micAutoActivatedRef.current) {
          micAutoActivatedRef.current = true
          await activateVirtualMic(false)
          toast('Microfone virtual pronto', 'Detectado e ativado. No Discord, escolha CABLE Output.', 'success')
        }
      } else if (elapsed >= 120000) {
        stopMicAutoPoll()
      }
    }
    micPollRef.current = setInterval(() => void tick(), 3000)
  }

  const installVirtualMic = async () => {
    setInstallingMic(true)
    setMicInstallState('launching')
    setMicInstallMessage(undefined)
    micAutoActivatedRef.current = false
    try {
      const result = await window.electronAPI.downloadVBCable()
      const resolved = resolveVBCableInstallState(result)
      setMicInstallState(resolved.state)
      setMicInstallMessage(resolved.message)
      if (resolved.state === 'launched') {
        toast('Instalador aberto', 'Clique em "Install Driver". Eu detecto e ativo sozinho quando terminar.', 'success')
        startMicAutoDetect()
      } else if (resolved.state === 'manual') {
        toast('Download manual', resolved.message, 'info')
      } else {
        toast('Erro', resolved.message, 'error')
      }
    } finally {
      setInstallingMic(false)
      setMicDownloadProgress(null)
    }
  }

  const verifyVirtualMic = async () => {
    await window.electronAPI.refreshVirtualMic()
    const detected = await loadMicDevices()
    if (detected) {
      stopMicAutoPoll()
      toast('VB-Cable detectado', 'Ativando o microfone virtual...', 'success')
      await activateVirtualMic()
    } else {
      toast('Ainda nao detectado', 'Se o instalador terminou, reinicie o Windows e tente de novo.', 'warning')
    }
  }

  const toggleVirtualMic = async () => {
    if (!vbCableDetected) {
      await installVirtualMic()
      return
    }
    if (virtualMicEnabled) {
      const success = await window.electronAPI.setVirtualMic(false)
      if (success) {
        setVirtualMicEnabled(false)
        window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: false }))
      }
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
  const canSpeak = voiceSource === 'cloud' ? Boolean(cloudVoice) : !noReadyModel
  const speakDisabled = !canSpeak || (voiceSource === 'local' && noReadyModel)

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
              <h1 className="text-page font-bold tracking-tight text-ink-strong">Falar</h1>
              <p className="max-w-2xl text-sm text-ink-soft">
                Console principal para composicao, repeticao e disparo rapido de voz.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {vbCableDetected ? (
              <button
                onClick={toggleVirtualMic}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                  virtualMicEnabled ? 'status-pill--live' : 'btn-secondary'
                }`}
                title="Envia a voz gerada como microfone virtual para outros aplicativos"
              >
                <Mic className="h-4 w-4" />
                {virtualMicEnabled ? 'Microfone virtual ativo' : 'Ativar microfone virtual'}
              </button>
            ) : (
              <button
                onClick={() => void installVirtualMic()}
                disabled={installingMic || micInstallState === 'downloading'}
                className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
                title="Baixa e instala o VB-Cable para Discord, Zoom e jogos ouvirem a voz como microfone"
              >
                <Wrench className="h-4 w-4" />
                {installingMic || micInstallState === 'downloading' ? 'Instalando...' : 'Instalar microfone virtual'}
              </button>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`btn-secondary inline-flex items-center gap-2 text-sm ${
                showHistory ? 'border-brand-400/60 text-brand-100' : ''
              }`}
              title="Historico de frases"
              aria-label="Historico de frases"
            >
              <History className="h-4 w-4" />
              {showHistory ? 'Ocultar historico' : 'Abrir historico'}
            </button>
            <button
              onClick={exportHistory}
              disabled={history.length === 0}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
              title="Exportar historico como CSV"
              aria-label="Exportar historico como CSV"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="hud-frame flex flex-wrap items-center gap-3 p-3">
          <span className="status-pill">
            <Cloud className="h-3.5 w-3.5" />
            {cloudVoice
              ? cloudVoice.FriendlyName.replace(/^Microsoft\s+/i, '').replace(/\s+Online\s+\(Natural\).*$/i, '')
              : 'Escolha uma voz'}
          </span>
          <span className={`status-pill ${virtualMicEnabled ? 'status-pill--live' : ''}`}>
            <Mic className="h-3.5 w-3.5" />
            {virtualMicEnabled ? 'Mic virtual ligado' : 'Mic virtual desligado'}
          </span>
          {(isSynthesizing || isSpeaking) && (
            <span className="status-pill status-pill--live">
              {isSynthesizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MonitorUp className="h-3.5 w-3.5" />}
              {isSynthesizing ? 'Gerando audio...' : 'Falando agora'}
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

      {!vbCableDetected && micInstallState !== 'idle' && (
        <div className="mb-4">
          <VirtualMicSetupPanel
            detected={false}
            installState={micInstallState}
            message={micInstallMessage}
            progress={micDownloadProgress}
            installing={installingMic}
            compact
            onInstall={() => void installVirtualMic()}
            onVerify={() => void verifyVirtualMic()}
            onOpenSettings={() => {
              window.location.hash = '#/settings'
            }}
          />
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <CloudVoicePicker
            selectedVoice={cloudVoice?.ShortName ?? storedCloudVoiceShortName ?? null}
            onSelect={handleCloudVoiceSelect}
          />
          <div className="hud-frame p-4 space-y-3 min-w-0">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" style={{ color: 'var(--vl-state-ready)' }} />
              <h3 className="text-sm font-semibold text-ink-strong">Velocidade</h3>
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
                aria-label="Velocidade de fala"
                aria-valuemin={0.5}
                aria-valuemax={2.0}
                aria-valuenow={speed}
                aria-valuetext={`${speed.toFixed(1)}x`}
              />
              <span className="w-12 text-sm text-ink-body font-mono">{speed.toFixed(1)}x</span>
            </div>
            <p className="text-xs text-ink-soft">
              Vozes online vem do Microsoft Edge TTS. Funcionam imediatamente, sem instalacao, mas precisam de internet.
            </p>
            {cloudVoice && (
              <div className="panel-muted p-2.5 text-xs text-ink-body">
                Voz selecionada: <span className="font-medium text-ink-strong">{cloudVoice.FriendlyName.replace(/^Microsoft\s+/i, '')}</span>
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
              placeholder="> digite uma frase. Enter envia. Shift+Enter quebra linha."
              className="min-h-[280px] flex-1 resize-none bg-transparent text-xl leading-8 text-ink-strong outline-none placeholder:text-ink-mute font-mono"
              autoFocus
              disabled={voiceSource === 'local' && noReadyModel}
            />

            <div className="mt-4 flex flex-col gap-3 border-t border-chrome-600/70 pt-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full border px-3 py-1 text-ink-soft" style={{ borderColor: 'var(--vl-hud-border)', background: 'var(--vl-surface-sunken)' }}>
                    {text.length} caracteres
                  </span>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={keepTextAfterSpeak}
                    onChange={(event) => setKeepTextAfterSpeak(event.target.checked)}
                    className="accent-brand-500"
                  />
                  Manter texto apos falar
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                  onClick={() => {
                    setText('')
                    textAreaRef.current?.focus()
                  }}
                  className="btn-secondary text-sm"
                  aria-label="Limpar texto"
                >
                  Limpar
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
                  aria-label="Salvar frase atual como atalho rapido"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Salvar frase
                </button>
                <button
                  onClick={() => void speak(text)}
                  disabled={(!isSpeaking && !text.trim()) || speakDisabled}
                  className={`btn-primary ${canSpeak && text.trim() ? 'btn-primary--armed' : ''} inline-flex min-w-[158px] items-center justify-center gap-2 px-5 py-3 text-sm`}
                  aria-label={isSpeaking ? (isSynthesizing ? 'Gerando audio...' : 'Parar de falar') : 'Falar texto'}
                  aria-busy={isSynthesizing}
                >
                  {isSpeaking ? (
                    isSynthesizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        Parar
                      </>
                    )
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Falar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="hud-frame p-4 min-w-0 2xl:w-[380px] 2xl:shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="h-4 w-4" style={{ color: 'var(--vl-state-ready)' }} />
              <h3 className="text-sm font-semibold text-ink-strong">Atalhos rapidos</h3>
            </div>
            <p className="mb-3 text-xs text-ink-soft">
              Escreva a frase, clique em <strong>Criar atalho</strong> e dispare com a tecla em qualquer lugar (Discord, jogo).
            </p>

            {/* Criar atalho no card — escreva e crie, sem sair da tela */}
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
                placeholder="O que dizer ao apertar o atalho? (ex: GG, partida excelente!)"
                className="terminal-textarea w-full p-3 text-sm min-h-[60px] font-mono"
                maxLength={500}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-soft">
                  Tecla: <span className="font-mono text-ink-body">{formatHotkeyDisplay(shortcuts.suggestedHotkey)}</span>
                </span>
                <button
                  onClick={() => { if (shortcuts.createShortcut(shortcutDraft)) setShortcutDraft('') }}
                  disabled={!shortcutDraft.trim()}
                  className="btn-primary btn-primary--armed inline-flex items-center gap-2 text-sm ml-auto"
                >
                  <Plus className="h-4 w-4" />
                  Criar atalho
                </button>
              </div>
            </div>

            {shortcuts.sortedShortcuts.length === 0 ? (
              <p className="text-center text-xs text-ink-soft py-4">Nenhum atalho ainda. Crie o primeiro acima.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
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
              <h3 className="text-sm font-semibold text-slate-200">Historico persistente</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma frase ainda.</p>
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
                      aria-label={`Carregar frase: ${item.text.slice(0, 30)}`}
                    >
                      <p className="line-clamp-3 text-sm text-slate-200">{item.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full border px-2 py-1 text-[11px] text-ink-soft"
                          style={{ borderColor: 'var(--vl-hud-border)', background: 'var(--vl-surface-overlay)' }}
                        >
                          {item.modelId}
                        </span>
                        <span className="text-xs text-slate-400">
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
                        Repetir
                      </button>
                      <button
                        onClick={() => {
                          shortcuts.createShortcut(item.text)
                        }}
                        className="btn-secondary flex items-center gap-1 text-xs"
                      >
                        <Pin className="w-3 h-3" />
                        Fixar
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
            O audio gerado sera enviado para o <strong>microfone virtual</strong>.
            Selecione &quot;CABLE Output&quot; como microfone no Discord, Zoom ou jogos.
          </span>
        </div>
      )}
    </div>
  )
}
