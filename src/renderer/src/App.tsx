import { useEffect, useState, useRef } from 'react'
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import {
  AlertTriangle,
  Mic,
  Settings,
  Volume2,
  Minus,
  Square,
  X,
  Pin,
  PictureInPicture,
  RefreshCw,
  Send,
  History,
  ChevronDown,
  MoreHorizontal,
  Keyboard,
} from 'lucide-react'

import TTSPage from './pages/TTSPage'
import SettingsPage from './pages/SettingsPage'
import VoiceShortcutsPage from './pages/VoiceShortcutsPage'
import { isEdgeHealthy, useAppStore } from './stores/appStore'
import { routeEngine, type EngineRouteInput } from './utils/engineRouter'
import OnboardingTutorial from './components/OnboardingTutorial'
import ToastContainer from './components/ToastContainer'
import { useCommunicationSettings } from './hooks/useCommunicationSettings'
import { buildHistoryItem, pushHistoryItem, sanitizeCommunicationState, serializeCommunicationState } from './utils/communicationState'
import { getVisibleInstalledModels } from './utils/modelSupport'
import { toast } from './utils/toast'
import { listOutputAudioDevices, playCloudAudio, stopCloudAudio } from './utils/cloudAudio'
import { pickCableOutput, resolveCableSink } from './utils/virtualMicSetup'
import { formatHotkeyDisplay } from './utils/voiceShortcuts'
import type { BackendStatus, ModelInfo } from '../../shared/types'

// App focado no online (Edge TTS): jornada começa → fala → atalho → ajustes.
// As telas locais (instalar modelos, clonar voz) saem da navegacao.
const navItems = [
  { to: '/', icon: Volume2, label: 'Falar' },
  { to: '/shortcuts', icon: Keyboard, label: 'Atalhos' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
]

const INITIAL_BACKEND_STATUS: BackendStatus = {
  running: false,
  port: 9472,
  version: '1.0.0',
  uptime: 0,
  phase: 'starting',
}

function BackendBanner({
  status,
  retrying,
  onRetry,
  voiceSource,
}: {
  status: BackendStatus
  retrying: boolean
  onRetry: () => void
  voiceSource: 'auto' | 'local' | 'cloud'
}) {
  if (status.running) return null

  const isStarting = status.phase === 'starting'
  // 'auto' e online-first: o backend fora do ar nao bloqueia a fala.
  const userOnCloud = voiceSource !== 'local'

  // Quando o usuario esta na trilha cloud e o backend nao subiu, o banner cheio assusta
  // sem motivo. Mostramos um chip discreto e deixamos o detalhe em Ajustes.
  if (userOnCloud && !isStarting) {
    return null
  }

  const title = isStarting ? 'Iniciando backend local' : 'Vozes locais indisponiveis'
  const description = isStarting
    ? 'A interface ja esta pronta. As vozes locais ficam disponiveis quando o backend terminar de subir. As vozes online (Edge TTS) ja podem ser usadas em "Falar".'
    : (status.lastError ? `${status.lastError}. ` : '') +
      'Voce ainda pode usar vozes online (Edge TTS) sem instalacao em "Falar". Para liberar Piper/Kokoro, use Tentar novamente ou abra Ajustes.'

  const containerStyle = isStarting
    ? { borderBottomColor: 'var(--vl-state-warn-border)', background: 'var(--vl-state-warn-bg)' }
    : { borderBottomColor: 'var(--vl-state-error-border)', background: 'var(--vl-state-error-bg)' }

  const accentColor = isStarting ? 'var(--vl-state-warn)' : 'var(--vl-state-error)'

  const diagnostics = status.diagnostics
  const hasDetails = Boolean(diagnostics && (diagnostics.command || diagnostics.detail || diagnostics.url))

  return (
    <div className="border-b px-4 py-3" style={containerStyle}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          {isStarting ? (
            <RefreshCw className="mt-0.5 h-4 w-4 animate-spin" style={{ color: accentColor }} />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4" style={{ color: accentColor }} />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink-strong">{title}</p>
            <p className="text-sm text-ink-body">{description}</p>
            {!isStarting && hasDetails && (
              <div className="mt-2 rounded-lg p-2 font-mono text-[11px] leading-5 grid gap-1" style={{ background: 'var(--vl-surface-sunken)', border: '1px solid var(--vl-state-error-border)' }}>
                {diagnostics?.command && <div><span className="text-ink-mute">command:</span> {diagnostics.command}</div>}
                {diagnostics?.executor && <div><span className="text-ink-mute">executor:</span> {diagnostics.executor}</div>}
                {diagnostics?.url && <div><span className="text-ink-mute">url:</span> {diagnostics.url}</div>}
                {diagnostics?.detail && <div><span className="text-ink-mute">detail:</span> {diagnostics.detail}</div>}
              </div>
            )}
            {isStarting && hasDetails && (
              <details className="mt-2 text-xs text-ink-soft">
                <summary className="cursor-pointer inline-flex items-center gap-1 select-none hover:text-ink-strong">
                  <ChevronDown className="h-3 w-3" />
                  Diagnostico
                </summary>
                <div className="mt-2 grid gap-1 font-mono text-[11px] leading-5">
                  {diagnostics?.command && <div><span className="text-ink-mute">command:</span> {diagnostics.command}</div>}
                  {diagnostics?.executor && <div><span className="text-ink-mute">executor:</span> {diagnostics.executor}</div>}
                  {diagnostics?.url && <div><span className="text-ink-mute">url:</span> {diagnostics.url}</div>}
                  {diagnostics?.detail && <div><span className="text-ink-mute">detail:</span> {diagnostics.detail}</div>}
                </div>
              </details>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRetry}
            disabled={retrying}
            className="btn-secondary inline-flex items-center gap-2 self-start text-sm disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  )
}

function TitleBar({
  backendStatus,
  onCheatsheet,
}: {
  backendStatus: BackendStatus
  onCheatsheet: () => void
}) {
  const alwaysOnTop = useAppStore((state) => state.alwaysOnTop)
  const setAlwaysOnTop = useAppStore((state) => state.setAlwaysOnTop)
  const compactMode = useAppStore((state) => state.compactMode)
  const setCompactMode = useAppStore((state) => state.setCompactMode)

  const subtitleText = backendStatus.running
    ? 'Pronto para falar'
    : backendStatus.phase === 'starting'
      ? 'Iniciando...'
      : backendStatus.phase === 'error'
        ? 'Backend com falha'
        : 'Offline'

  const subtitleColor = backendStatus.running
    ? 'var(--vl-state-ready)'
    : backendStatus.phase === 'starting'
      ? 'var(--vl-state-warn)'
      : 'var(--vl-state-error)'

  return (
    <div
      className="h-12 flex items-center justify-between px-2 select-none app-drag-region relative"
      style={{
        borderBottom: '1px solid var(--vl-hud-border)',
        background: 'var(--vl-surface-raised)',
        boxShadow: '0 1px 0 rgba(255, 255, 255, 0.04) inset',
      }}
    >
      <div className="flex items-center gap-3 px-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg relative"
          style={{
            border: '1px solid var(--vl-hud-border)',
            background: 'var(--vl-surface-overlay)',
          }}
        >
          <Mic className="w-4 h-4" style={{ color: 'var(--vl-state-ready)' }} />
        </div>
        <div>
          <span className="block text-sm font-semibold text-ink-strong">VoiceLaunch TTS</span>
          <span className="block text-[10px] uppercase tracking-[0.3em] transition-colors" style={{ color: subtitleColor }}>{subtitleText}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 no-drag-region">
        <button
          onClick={onCheatsheet}
          className="titlebar-btn text-slate-400 hover:bg-chrome-800 hover:text-brand-300"
          title="Atalhos de teclado"
          aria-label="Ver atalhos de teclado"
        >
          <Keyboard className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCompactMode(!compactMode)}
          className={`titlebar-btn ${compactMode ? 'bg-brand-400/10 text-brand-300' : 'text-slate-400 hover:bg-chrome-800 hover:text-brand-300'}`}
          title="Modo compacto"
          aria-label="Alternar modo compacto"
        >
          <PictureInPicture className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAlwaysOnTop(!alwaysOnTop)}
          className={`titlebar-btn ${alwaysOnTop ? 'bg-brand-400/10 text-brand-300' : 'text-slate-400 hover:bg-chrome-800 hover:text-brand-300'}`}
          title="Sempre no topo"
          aria-label="Sempre no topo"
        >
          <Pin className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="titlebar-btn text-slate-400 hover:bg-chrome-800 hover:text-slate-100"
          aria-label="Minimizar janela"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="titlebar-btn text-slate-400 hover:bg-chrome-800 hover:text-slate-100"
          aria-label="Maximizar janela"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="titlebar-btn text-slate-400 hover:bg-red-500/80 hover:text-white"
          aria-label="Fechar janela"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function Sidebar() {
  return (
    <nav
      className="flex h-full w-20 flex-col px-3 py-4 lg:w-64 transition-[width] duration-200 ease-in-out"
      style={{
        borderRight: '1px solid var(--vl-hud-border)',
        background: 'var(--vl-surface-sunken)',
      }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          aria-label={item.label}
          className={({ isActive }) =>
            [
              'nav-link',
              isActive
                ? 'border border-brand-500/40 bg-brand-500/12 text-brand-100 shadow-[inset_3px_0_0_0_#6D5DE6]'
                : 'text-ink-soft hover:bg-white/5 hover:text-ink-strong',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className="w-5 h-5 flex-shrink-0"
                style={isActive ? { color: 'var(--vl-state-ready)' } : undefined}
              />
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}

      <div className="mt-auto px-1 py-3 space-y-3">
        <div className="hidden lg:block text-xs text-ink-mute px-3">
          <p>VoiceLaunch TTS v1.0</p>
          <p>Voz online (Edge TTS) · Open Source</p>
        </div>
      </div>
    </nav>
  )
}

function CompactView({ backendStatus }: { backendStatus: BackendStatus }) {
  const defaultModelId = useAppStore((state) => state.defaultModelId)
  const setDefaultModelId = useAppStore((state) => state.setDefaultModelId)
  const defaultSpeed = useAppStore((state) => state.defaultSpeed)
  const setDefaultSpeed = useAppStore((state) => state.setDefaultSpeed)
  const { text, setText, history, quickPhrases, keepTextAfterSpeak, setKeepTextAfterSpeak, addHistoryItem } = useCommunicationSettings()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [virtualMicEnabled, setVirtualMicEnabled] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    const loadCompactState = async () => {
      const [detectedHardware, registry] = await Promise.all([
        window.electronAPI.getHardwareInfo(),
        window.electronAPI.getModelRegistry(),
      ])

      const visibleInstalledModels = getVisibleInstalledModels(registry, detectedHardware, false)
      setAvailableModels(visibleInstalledModels)
    }

    window.electronAPI.getVirtualMicStatus().then(setVirtualMicEnabled)
    void loadCompactState()

    const syncVirtualMic = (event: Event) => {
      setVirtualMicEnabled((event as CustomEvent<boolean>).detail)
    }

    window.addEventListener('voicelaunch:virtual-mic-changed', syncVirtualMic as EventListener)
    return () => {
      window.removeEventListener('voicelaunch:virtual-mic-changed', syncVirtualMic as EventListener)
    }
  }, [])

  const activeModel =
    availableModels.find((model) => model.id === defaultModelId) ??
    availableModels[0] ??
    null

  const voiceSource = useAppStore((state) => state.voiceSource)
  const cloudVoice = useAppStore((state) => state.cloudVoice)
  const cableDeviceId = useAppStore((state) => state.cableDeviceId)
  const monitorDeviceId = useAppStore((state) => state.monitorDeviceId)
  const edgeUnhealthyUntil = useAppStore((state) => state.edgeUnhealthyUntil)

  const buildRouteInput = (textLength: number): EngineRouteInput => ({
    mode: voiceSource,
    online: navigator.onLine,
    edgeHealthy: isEdgeHealthy({ edgeUnhealthyUntil }),
    installedModels: availableModels.map((model) => model.id),
    textLength,
    preferredLocalModelId: activeModel?.id,
  })

  const routePreview = routeEngine(buildRouteInput(text.length))
  const cloudReady = routePreview.engine === 'edge' && Boolean(cloudVoice)
  const localReady = Boolean(activeModel) && backendStatus.running
  const canSpeak = cloudReady || (routePreview.engine !== 'edge' && localReady) || (voiceSource === 'auto' && localReady)
  const compactStatusText =
    routePreview.engine === 'edge'
      ? cloudVoice
        ? routePreview.label
        : 'Escolha uma voz online na tela Falar'
      : routePreview.engine
        ? localReady
          ? routePreview.label
          : 'Backend local iniciando...'
        : routePreview.label
  const statusColor = canSpeak ? 'var(--vl-state-ready)' : 'var(--vl-state-warn)'

  const speakLocalCompact = async (textToSpeak: string, localModelId: string): Promise<boolean> => {
    if (!backendStatus.running) {
      toast('Backend iniciando', 'A fala sera liberada quando o backend local terminar de subir.', 'info')
      return false
    }
    const response = await window.electronAPI.synthesize({
      text: textToSpeak,
      modelId: localModelId,
      speed: defaultSpeed,
    })
    if (cancelRef.current) return true
    if (!response.success || !response.audioPath) {
      if (response.error) toast('Erro na fala', response.error, 'error')
      return false
    }
    await window.electronAPI.playAudio(response.audioPath)
    if (cancelRef.current) return true
    addHistoryItem(
      buildHistoryItem({
        text: textToSpeak,
        modelId: localModelId,
        audioPath: response.audioPath,
      }),
    )
    if (!keepTextAfterSpeak) setText('')
    return true
  }

  const speak = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) return
    if (isSpeaking) {
      cancelRef.current = true
      await window.electronAPI.stopAudio()
      stopCloudAudio()
      setIsSpeaking(false)
      return
    }
    cancelRef.current = false
    setIsSpeaking(true)
    try {
      const decision = routeEngine(buildRouteInput(textToSpeak.length))
      if (decision.engine === 'edge' && cloudVoice) {
        const response = await window.electronAPI.synthesizeCloud({
          text: textToSpeak,
          voice: cloudVoice,
          speed: defaultSpeed,
        })
        if (cancelRef.current) return
        if (response.success && response.audioBase64) {
          useAppStore.getState().reportEdgeSuccess()
          await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm', {
            cableDeviceId: virtualMicEnabled ? cableDeviceId : undefined,
            monitorDeviceId,
          })
          if (cancelRef.current) return
          addHistoryItem(buildHistoryItem({ text: textToSpeak, modelId: `cloud:${cloudVoice}`, voiceId: cloudVoice }))
          if (!keepTextAfterSpeak) setText('')
          return
        }
        useAppStore.getState().reportEdgeFailure()
        const fallback = voiceSource === 'auto'
          ? routeEngine({ ...buildRouteInput(textToSpeak.length), online: false })
          : null
        if (fallback?.engine && fallback.modelId) {
          toast('Voz online falhou', `Falando com a voz local (${fallback.engine}).`, 'info')
          await speakLocalCompact(textToSpeak, fallback.modelId)
          return
        }
        toast('Erro na voz online', response.error || 'Nao foi possivel gerar a voz.', 'error')
        return
      }
      if (decision.engine && decision.modelId) {
        await speakLocalCompact(textToSpeak, decision.modelId)
        return
      }
      if (decision.engine === 'edge' && !cloudVoice) {
        toast('Sem voz online', 'Escolha uma voz online na tela Falar.', 'warning')
        return
      }
      toast('Sem voz disponivel', `${decision.label}.`, 'warning')
    } catch (error) {
      toast('Erro na fala', String(error), 'error')
    } finally {
      setIsSpeaking(false)
    }
  }

  const toggleVirtualMic = async () => {
    // Online-first: o estado do mic nao depende do backend (a voz e roteada no
    // renderer via setSinkId). setVirtualMic e best-effort (so as vozes locais usam).
    const nextState = !virtualMicEnabled
    setVirtualMicEnabled(nextState)
    void window.electronAPI.setVirtualMic(nextState)
    window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: nextState }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void speak(text)
    }
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden p-3">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleVirtualMic}
          className={`status-pill transition-colors ${virtualMicEnabled ? 'status-pill--live' : 'status-pill--ready'}`}
          aria-pressed={virtualMicEnabled}
        >
          <Mic className="h-3.5 w-3.5" />
          {virtualMicEnabled ? 'Mic ON' : 'Mic OFF'}
        </button>
        <select
          value={activeModel?.id ?? ''}
          onChange={(e) => setDefaultModelId(e.target.value)}
          disabled={availableModels.length === 0}
          className="input-field flex-1 min-w-0 py-1.5 text-xs"
          aria-label="Modelo de voz"
        >
          {availableModels.length === 0 && <option value="">Sem modelo</option>}
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowAdvanced((value) => !value)}
          className="btn-ghost px-2 py-1.5 text-xs"
          aria-expanded={showAdvanced}
          aria-label="Mais opcoes"
          title="Velocidade e ajustes"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {showAdvanced && (
        <div className="hud-frame flex items-center gap-3 p-3 text-xs">
          <span className="text-ink-soft">Vel</span>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={defaultSpeed}
            onChange={(e) => setDefaultSpeed(parseFloat(e.target.value))}
            className="flex-1 accent-brand-400"
            aria-label="Velocidade de fala"
            aria-valuemin={0.5}
            aria-valuemax={2.0}
            aria-valuenow={defaultSpeed}
            aria-valuetext={`${defaultSpeed.toFixed(1)}x`}
          />
          <span className="w-8 text-right font-mono text-ink-body">{defaultSpeed.toFixed(1)}x</span>
          <label className="flex items-center gap-1 text-ink-body">
            <input
              type="checkbox"
              checked={keepTextAfterSpeak}
              onChange={(event) => setKeepTextAfterSpeak(event.target.checked)}
              className="accent-brand-500"
            />
            Manter
          </label>
        </div>
      )}

      <p className="text-xs" style={{ color: statusColor }}>{compactStatusText}</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="> digite e aperte Enter"
        className="terminal-textarea min-h-[150px] flex-1 resize-none p-3 text-base leading-6 outline-none placeholder:text-ink-mute"
        autoFocus
      />

      <div className="relative space-y-2">
        <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pb-1">
          {quickPhrases.map((phrase, index) => (
            <button
              key={phrase}
              onClick={() => {
                setText(phrase)
                void speak(phrase)
              }}
              disabled={!canSpeak}
              className="hud-frame relative px-3 py-2 text-left text-caption text-ink-body transition-colors hover:bg-brand-500/10 disabled:opacity-50"
            >
              <span className="badge-shortcut absolute top-1 right-1">{index + 1}</span>
              <span className="block pr-6 line-clamp-2">{phrase}</span>
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2 overflow-auto pb-1">
            <History className="h-3.5 w-3.5 flex-shrink-0 text-ink-mute" />
            {history.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => setText(item.text)}
                className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs text-ink-body transition-colors hover:text-ink-strong"
                style={{ borderColor: 'var(--vl-hud-border)', background: 'var(--vl-surface-overlay)' }}
              >
                {item.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => void speak(text)}
        disabled={isSpeaking ? false : !text.trim() || !canSpeak}
        className={`btn-primary ${canSpeak && text.trim() ? 'btn-primary--armed' : ''} flex items-center justify-center gap-2 py-3 text-sm font-semibold`}
        aria-label={isSpeaking ? 'Parar' : 'Falar'}
      >
        {isSpeaking ? (
          <>
            <Square className="w-4 h-4" />
            Parar
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Falar
          </>
        )}
      </button>
    </div>
  )
}

export default function App() {
  const alwaysOnTop = useAppStore((state) => state.alwaysOnTop)
  const highContrast = useAppStore((state) => state.highContrast)
  const largeFont = useAppStore((state) => state.largeFont)
  const compactMode = useAppStore((state) => state.compactMode)
  const setCompactMode = useAppStore((state) => state.setCompactMode)
  const voiceSource = useAppStore((state) => state.voiceSource)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(INITIAL_BACKEND_STATUS)
  const [retryingBackend, setRetryingBackend] = useState(false)
  const [showCheatsheet, setShowCheatsheet] = useState(false)

  useEffect(() => {
    window.electronAPI.setAlwaysOnTop(alwaysOnTop || compactMode)
  }, [alwaysOnTop, compactMode])

  useEffect(() => {
    let active = true

    const syncBackendStatus = async () => {
      try {
        const status = await window.electronAPI.getBackendStatus()
        if (active) {
          setBackendStatus(status)
        }
      } catch {
        if (active) {
          setBackendStatus((prev) => ({
            ...prev,
            running: false,
            phase: 'error',
            lastError: 'Nao foi possivel consultar o backend local.',
          }))
        }
      }
    }

    void syncBackendStatus()
    const interval = window.setInterval(() => {
      void syncBackendStatus()
    }, 2000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const retryBackend = async () => {
    setRetryingBackend(true)
    setBackendStatus((prev) => ({ ...prev, running: false, phase: 'starting', lastError: undefined }))
    try {
      const restarted = await window.electronAPI.restartBackend()
      if (!restarted) {
        toast('Backend local', 'O backend nao confirmou reinicio imediato. Vou continuar monitorando.', 'warning')
      }
      const status = await window.electronAPI.getBackendStatus()
      setBackendStatus(status)
    } catch (error) {
      setBackendStatus((prev) => ({
        ...prev,
        running: false,
        phase: 'error',
        lastError: String(error),
      }))
    } finally {
      setRetryingBackend(false)
    }
  }

  // Mantem o CABLE Input resolvido desde o boot (e a cada troca de devices).
  // Sem isso, atalhos globais disparados antes de abrir a tela Falar roteavam
  // com cableDeviceId null e o Discord ficava mudo — falha silenciosa P0.
  // So auto-define quando nao ha escolha valida do usuario (null ou device
  // removido); nunca sobrescreve uma selecao manual que ainda existe.
  useEffect(() => {
    let disposed = false

    const syncCableDevice = async () => {
      const state = useAppStore.getState()
      if (!state._hydrated || disposed) return
      const outputs = await listOutputAudioDevices()
      if (disposed) return
      const stillExists = state.cableDeviceId
        ? outputs.some((device) => device.deviceId === state.cableDeviceId)
        : false
      if (stillExists) return
      const pick = pickCableOutput(outputs)
      if (pick && pick.id !== state.cableDeviceId) {
        state.setCableDevice(pick.id, pick.label)
      } else if (!pick && state.cableDeviceId) {
        // Device sumiu (VB-Cable desinstalado?) — zera para a UI mostrar o estado real.
        state.setCableDevice(null, null)
      }
    }

    const waitHydrationThenSync = () => {
      if (useAppStore.getState()._hydrated) {
        void syncCableDevice()
        return () => undefined
      }
      const unsub = useAppStore.subscribe((s) => {
        if (s._hydrated) {
          unsub()
          void syncCableDevice()
        }
      })
      return unsub
    }

    const unsubHydration = waitHydrationThenSync()
    const onDeviceChange = () => void syncCableDevice()
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
    return () => {
      disposed = true
      unsubHydration()
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
    }
  }, [])

  useEffect(() => {
    // Resolve o cabo na hora do disparo global. Se o mic esta ligado mas nao ha
    // cabo utilizavel, avisa — a voz vai tocar no alto-falante, nao no Discord.
    const ensureCableForSpeak = async (
      stored: string | null | undefined,
      micOn: boolean,
    ): Promise<string | undefined> => {
      if (!micOn) return undefined
      if (stored) return stored
      const result = await resolveCableSink()
      if (result.status === 'found') {
        void window.electronAPI.saveSettings({ cableDeviceId: result.id, cableDeviceLabel: result.label })
        return result.id
      }
      toast(
        'Mic virtual sem cabo',
        'A voz vai tocar no alto-falante, nao no Discord. Abra Ajustes > Microfone Virtual.',
        'warning',
      )
      return undefined
    }

    const speakQuickPhrase = async (index: number) => {
      const [settings, runtimeStatus, detectedHardware, registry, virtualMicOn] = await Promise.all([
        window.electronAPI.loadSettings(),
        window.electronAPI.getBackendStatus(),
        window.electronAPI.getHardwareInfo(),
        window.electronAPI.getModelRegistry(),
        window.electronAPI.getVirtualMicStatus(),
      ])
      const communication = sanitizeCommunicationState(settings)
      const phrase = communication.quickPhrases[index]
      const source = settings.voiceSource ?? 'auto'
      const speed = settings.defaultSpeed || 1

      if (!phrase) {
        toast('Atalho sem frase', 'Configure as frases rapidas na aba Falar.', 'warning')
        return
      }

      const cableDeviceId = await ensureCableForSpeak(settings.cableDeviceId, virtualMicOn)

      const persistHistory = async (entryModelId: string, audioPath?: string) => {
        const nextCommunication = {
          ...communication,
          ttsDraft: communication.keepTextAfterSpeak ? phrase : '',
          ttsHistory: pushHistoryItem(
            communication.ttsHistory,
            buildHistoryItem({ text: phrase, modelId: entryModelId, audioPath }),
          ),
        }
        const serialized = serializeCommunicationState(nextCommunication)
        await window.electronAPI.saveSettings(serialized)
        window.dispatchEvent(new CustomEvent('voicelaunch:communication-updated', { detail: serialized }))
      }

      const routeInput: EngineRouteInput = {
        mode: source,
        online: navigator.onLine,
        edgeHealthy: isEdgeHealthy(useAppStore.getState()),
        hardwareTier: detectedHardware?.recommendedTier,
        installedModels: registry.filter((model) => model.installed).map((model) => model.id),
        textLength: phrase.length,
        preferredLocalModelId: settings.defaultModelId,
      }

      const speakLocalPhrase = async (localModelId: string): Promise<boolean> => {
        if (!runtimeStatus.running) {
          toast('Backend offline', 'Vozes locais indisponiveis. Troque para Online na aba Falar.', 'info')
          return false
        }
        const response = await window.electronAPI.synthesize({
          text: phrase,
          modelId: localModelId,
          speed,
        })
        if (!response.success || !response.audioPath) {
          toast('Erro na fala', response.error || 'Nao foi possivel gerar o audio.', 'error')
          return false
        }
        await window.electronAPI.playAudio(response.audioPath)
        await persistHistory(localModelId, response.audioPath)
        return true
      }

      try {
        const decision = routeEngine(routeInput)
        if (decision.engine === null) {
          toast('Sem voz disponivel', `${decision.label}.`, 'warning')
          return
        }
        if (decision.engine === 'edge') {
          const cloudVoice = settings.cloudVoice
          if (!cloudVoice) {
            toast('Sem voz online', 'Escolha uma voz online na aba Falar antes de usar atalhos.', 'warning')
            return
          }
          const response = await window.electronAPI.synthesizeCloud({
            text: phrase,
            voice: cloudVoice,
            speed,
          })
          if (!response.success || !response.audioBase64) {
            useAppStore.getState().reportEdgeFailure()
            // Auto: falhou online, fala com a voz local na mesma acao.
            const fallback = source === 'auto' ? routeEngine({ ...routeInput, online: false }) : null
            if (fallback?.engine && fallback.modelId && (await speakLocalPhrase(fallback.modelId))) {
              toast('Voz online falhou', `Frase falada com a voz local (${fallback.engine}).`, 'info')
              return
            }
            toast('Erro na voz online', response.error || 'Nao foi possivel gerar a voz.', 'error')
            return
          }
          useAppStore.getState().reportEdgeSuccess()
          await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm', {
            cableDeviceId,
            monitorDeviceId: settings.monitorDeviceId,
          })
          await persistHistory(`cloud:${cloudVoice}`)
          return
        }
        if (decision.modelId) {
          await speakLocalPhrase(decision.modelId)
        }
      } catch (error) {
        toast('Erro no atalho', String(error), 'error')
      }
    }

    const toggleVirtualMic = async () => {
      // Online-first: nao bloqueia no backend; setVirtualMic e best-effort.
      const current = await window.electronAPI.getVirtualMicStatus().catch(() => false)
      const nextState = !current
      void window.electronAPI.setVirtualMic(nextState)
      window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: nextState }))
      toast(
        'Microfone virtual',
        nextState ? 'Microfone virtual ativado.' : 'Microfone virtual desativado.',
        'info',
      )
    }

    const unsubQuickPhrase = window.electronAPI.onGlobalSpeakQuickPhrase((index) => {
      void speakQuickPhrase(index)
    })
    const unsubOpenCompact = window.electronAPI.onGlobalOpenCompact(() => {
      setCompactMode(true)
    })
    const unsubToggleVirtualMic = window.electronAPI.onGlobalToggleVirtualMic(() => {
      void toggleVirtualMic()
    })
    const unsubShortcutConflict = window.electronAPI.onGlobalShortcutConflict((conflicted) => {
      if (!conflicted || conflicted.length === 0) return
      const conflictList = conflicted.slice(0, 3).map(formatHotkeyDisplay).join(', ') + (conflicted.length > 3 ? '...' : '')
      toast(
        `${conflicted.length} atalho(s) bloqueado(s)`,
        `Outro app ja usa: ${conflictList}. Tente combinacoes Ctrl+Alt ou F-keys em "Atalhos".`,
        'warning',
      )
    })

    const speakVoiceShortcut = async (shortcutId: string) => {
      const [settings, runtimeStatus, detectedHardware, registry, virtualMicOn] = await Promise.all([
        window.electronAPI.loadSettings(),
        window.electronAPI.getBackendStatus(),
        window.electronAPI.getHardwareInfo(),
        window.electronAPI.getModelRegistry(),
        window.electronAPI.getVirtualMicStatus(),
      ])
      const shortcuts = Array.isArray(settings.voiceShortcuts) ? settings.voiceShortcuts : []
      const shortcut = shortcuts.find((entry) => entry.id === shortcutId)
      if (!shortcut || !shortcut.enabled) return
      // Feedback visual imediato na página de atalhos
      window.dispatchEvent(new CustomEvent('voicelaunch:shortcut-triggered', { detail: shortcutId }))
      const cableDeviceId = await ensureCableForSpeak(settings.cableDeviceId, virtualMicOn)

      const speakLocalShortcut = async (localModelId: string): Promise<boolean> => {
        if (!runtimeStatus.running) {
          toast('Backend offline', 'O atalho local precisa do backend Python ativo.', 'warning')
          return false
        }
        const response = await window.electronAPI.synthesize({
          text: shortcut.text,
          modelId: localModelId,
          speed: shortcut.speed,
        })
        if (!response.success || !response.audioPath) {
          toast('Falha no atalho', response.error || 'Nao foi possivel gerar o audio local.', 'error')
          return false
        }
        await window.electronAPI.playAudio(response.audioPath)
        return true
      }

      const localFallbackFor = (textLength: number) =>
        routeEngine({
          mode: 'auto',
          online: false,
          edgeHealthy: false,
          hardwareTier: detectedHardware?.recommendedTier,
          installedModels: registry.filter((model) => model.installed).map((model) => model.id),
          textLength,
          preferredLocalModelId: settings.defaultModelId,
        })

      try {
        if (shortcut.voiceSource === 'cloud' || shortcut.voiceSource === 'auto') {
          // Atalhos migrados de frases rapidas podem nao ter voz propria — cai
          // para a voz online global nesse caso.
          const voice = shortcut.voice || settings.cloudVoice

          // Offline ou Edge em cooldown: roteia direto para a voz local.
          const edgeUsable = navigator.onLine && isEdgeHealthy(useAppStore.getState())
          if (!edgeUsable) {
            const fallback = localFallbackFor(shortcut.text.length)
            if (fallback.engine && fallback.modelId) {
              await speakLocalShortcut(fallback.modelId)
              return
            }
            toast('Sem voz disponivel', `${fallback.label}.`, 'warning')
            return
          }

          if (!voice) {
            toast('Sem voz online', 'Escolha uma voz no atalho ou na tela Falar.', 'warning')
            return
          }
          const response = await window.electronAPI.synthesizeCloud({
            text: shortcut.text,
            voice,
            speed: shortcut.speed,
            pitch: shortcut.pitch,
          })
          if (!response.success || !response.audioBase64) {
            useAppStore.getState().reportEdgeFailure()
            const fallback = localFallbackFor(shortcut.text.length)
            if (fallback.engine && fallback.modelId && (await speakLocalShortcut(fallback.modelId))) {
              toast('Voz online falhou', `Atalho falado com a voz local (${fallback.engine}).`, 'info')
              return
            }
            toast('Falha no atalho', response.error || 'Nao foi possivel gerar a voz.', 'error')
            return
          }
          useAppStore.getState().reportEdgeSuccess()
          await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm', {
            cableDeviceId,
            monitorDeviceId: settings.monitorDeviceId,
          })
          return
        }
        await speakLocalShortcut(shortcut.voice)
      } catch (error) {
        toast('Falha no atalho', String(error), 'error')
      }
    }

    const unsubVoiceShortcut = window.electronAPI.onGlobalSpeakVoiceShortcut((shortcutId) => {
      void speakVoiceShortcut(shortcutId)
    })

    return () => {
      unsubQuickPhrase()
      unsubOpenCompact()
      unsubToggleVirtualMic()
      unsubShortcutConflict()
      unsubVoiceShortcut()
    }
  }, [setCompactMode])

  const rootClass = [
    'app-shell h-full flex flex-col',
    highContrast ? 'high-contrast' : '',
    largeFont ? 'large-font' : '',
  ].filter(Boolean).join(' ')

  if (compactMode) {
    return (
      <div className={rootClass}>
        <TitleBar backendStatus={backendStatus} onCheatsheet={() => setShowCheatsheet(true)} />
        <BackendBanner status={backendStatus} retrying={retryingBackend} onRetry={() => void retryBackend()} voiceSource={voiceSource} />
        <CompactView backendStatus={backendStatus} />
        <ToastContainer />
        {showCheatsheet && <CheatsheetModal onClose={() => setShowCheatsheet(false)} />}
      </div>
    )
  }

  return (
    <HashRouter>
      <div className={rootClass}>
        <TitleBar backendStatus={backendStatus} onCheatsheet={() => setShowCheatsheet(true)} />
        <BackendBanner status={backendStatus} retrying={retryingBackend} onRetry={() => void retryBackend()} voiceSource={voiceSource} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-5">
            <Routes>
              <Route path="/" element={<TTSPage />} />
              <Route path="/tts" element={<Navigate to="/" replace />} />
              <Route path="/shortcuts" element={<VoiceShortcutsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
        <OnboardingTutorial />
        <ToastContainer />
        {showCheatsheet && <CheatsheetModal onClose={() => setShowCheatsheet(false)} />}
      </div>
    </HashRouter>
  )
}

// ─── Cheatsheet Modal ────────────────────────────────────────────────────────

const SHORTCUTS = [
  { keys: 'Ctrl+Shift+F', desc: 'Focar campo de texto' },
  { keys: 'Enter', desc: 'Falar texto' },
  { keys: 'Shift+Enter', desc: 'Nova linha' },
  { keys: 'Ctrl+Shift+1..9', desc: 'Atalho de voz 1–9' },
  { keys: 'Ctrl+Shift+M', desc: 'Ativar/desativar mic' },
  { keys: 'Ctrl+Shift+V', desc: 'Modo compacto' },
  { keys: 'Ctrl+Shift+S', desc: 'Parar audio' },
  { keys: 'Escape', desc: 'Fechar modal / parar' },
]

function CheatsheetModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement
    requestAnimationFrame(() => {
      const btn = dialogRef.current?.querySelector<HTMLElement>('button')
      btn?.focus()
    })
    return () => {
      if (previousFocusRef.current && (previousFocusRef.current as HTMLElement).focus) {
        ;(previousFocusRef.current as HTMLElement).focus()
      }
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab') return
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Atalhos de teclado"
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      <div className="hud-frame hud-frame--hero max-w-md w-full p-6 animate-lift-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-ink-strong flex items-center gap-2">
            <Keyboard className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
            Atalhos de teclado
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-soft hover:bg-brand-500/15 hover:text-ink-strong transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid gap-2">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={keys} className="flex items-center justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--vl-hud-border)' }}>
              <span className="text-xs text-ink-soft">{desc}</span>
              <kbd
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-mono font-semibold"
                style={{ background: 'rgba(109,93,230,0.14)', border: '1px solid var(--vl-hud-border-strong)', color: 'var(--vl-purple-200)' }}
              >
                {keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-mute">Ctrl+Alt+1..9 e Ctrl+Shift+F1..F12 disponíveis em Atalhos de Voz.</p>
      </div>
    </div>
  )
}
