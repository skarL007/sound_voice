import { useEffect, useState, useRef } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  AlertTriangle,
  Mic,
  Cpu,
  Settings,
  UserCircle,
  Volume2,
  Download,
  Home,
  Minus,
  Square,
  X,
  Pin,
  Terminal,
  PictureInPicture,
  RefreshCw,
  Send,
  History,
  ChevronDown,
  Sparkles,
  Activity,
  Zap,
  Keyboard,
  PlayCircle,
} from 'lucide-react'

import DashboardPage from './pages/DashboardPage'
import ModelsPage from './pages/ModelsPage'
import TTSPage from './pages/TTSPage'
import ClonePage from './pages/ClonePage'
import SettingsPage from './pages/SettingsPage'
import LogsPage from './pages/LogsPage'
import VoiceShortcutsPage from './pages/VoiceShortcutsPage'
import { useAppStore } from './stores/appStore'
import OnboardingTutorial from './components/OnboardingTutorial'
import ToastContainer from './components/ToastContainer'
import LocalSetupCard from './components/LocalSetupCard'
import ProfileSwitcher from './components/ProfileSwitcher'
import { useCommunicationSettings } from './hooks/useCommunicationSettings'
import { buildHistoryItem, pushHistoryItem, sanitizeCommunicationState, serializeCommunicationState } from './utils/communicationState'
import { getVisibleInstalledModels, resolveActiveModelForMvp } from './utils/modelSupport'
import { toast } from './utils/toast'
import { playCloudAudio } from './utils/cloudAudio'
import type { BackendStatus, ModelInfo } from '../../shared/types'

const navItems = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/tts', icon: Volume2, label: 'Falar' },
  { to: '/shortcuts', icon: Keyboard, label: 'Atalhos' },
  { to: '/models', icon: Download, label: 'Vozes' },
  { to: '/clone', icon: UserCircle, label: 'Clonar' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
  { to: '/logs', icon: Terminal, label: 'Logs' },
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
  voiceSource: 'local' | 'cloud'
}) {
  if (status.running) return null

  const isStarting = status.phase === 'starting'
  const userOnCloud = voiceSource === 'cloud'

  // Quando o usuario esta na trilha cloud e o backend nao subiu, o banner cheio assusta
  // sem motivo. Mostramos um chip discreto e deixamos o detalhe nos logs/ajustes.
  if (userOnCloud && !isStarting) {
    return null
  }

  const title = isStarting ? 'Iniciando backend local' : 'Vozes locais indisponiveis'
  const description = isStarting
    ? 'A interface ja esta pronta. As vozes locais ficam disponiveis quando o backend terminar de subir. As vozes online (Edge TTS) ja podem ser usadas em "Falar".'
    : (status.lastError ? `${status.lastError}. ` : '') +
      'Voce ainda pode usar vozes online (Edge TTS) sem instalacao em "Falar". Para liberar Piper/Kokoro, tente reiniciar o backend ou veja os logs.'

  const containerStyle = isStarting
    ? { borderBottomColor: 'rgba(255,193,90,0.3)', background: 'rgba(255,193,90,0.10)' }
    : { borderBottomColor: 'rgba(255,107,125,0.3)', background: 'rgba(255,107,125,0.10)' }

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
            {hasDetails && (
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
          <a
            href="#/logs"
            className="btn-ghost text-sm"
            aria-label="Abrir logs do app"
          >
            <Terminal className="h-4 w-4" />
            Abrir logs
          </a>
        </div>
      </div>
    </div>
  )
}

function TitleBar() {
  const { alwaysOnTop, setAlwaysOnTop, compactMode, setCompactMode } = useAppStore()

  return (
    <div
      className="h-12 flex items-center justify-between px-2 select-none app-drag-region relative"
      style={{
        borderBottom: '1px solid var(--vl-hud-border)',
        background: 'linear-gradient(180deg, rgba(20, 10, 46, 0.95), rgba(6, 3, 15, 0.92))',
        boxShadow: '0 1px 0 rgba(167, 139, 250, 0.10) inset, 0 8px 24px -12px rgba(0, 0, 0, 0.45)',
      }}
    >
      <div className="flex items-center gap-3 px-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl relative"
          style={{
            border: '1px solid var(--vl-hud-border-strong)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(95, 35, 194, 0.18))',
            boxShadow: '0 0 16px rgba(139, 92, 246, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
        >
          <Mic className="w-4 h-4 neon-glow" style={{ color: 'var(--vl-state-ready)' }} />
        </div>
        <div>
          <span className="block text-sm font-semibold text-ink-strong">VoiceLaunch TTS</span>
          <span className="block text-[10px] uppercase tracking-[0.3em] text-ink-soft">Local Voice Console</span>
        </div>
      </div>
      <div className="flex items-center gap-1 no-drag-region">
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
      className="flex h-full w-20 flex-col px-3 py-4 lg:w-64"
      style={{
        borderRight: '1px solid var(--vl-hud-border)',
        background: 'rgba(6, 3, 15, 0.6)',
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
                ? 'border border-brand-500/40 bg-brand-500/12 text-brand-100 shadow-[inset_3px_0_0_0_rgba(139,92,246,0.95)]'
                : 'text-ink-soft hover:bg-brand-500/8 hover:text-brand-200',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={`w-5 h-5 flex-shrink-0 ${isActive ? 'animate-glow-pulse' : ''}`}
                style={isActive ? { color: 'var(--vl-state-ready)' } : undefined}
              />
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}

      <div className="mt-auto px-1 py-3 space-y-3">
        <div className="hidden lg:block">
          <ProfileSwitcher />
        </div>
        <div className="hidden lg:block text-xs text-ink-mute px-3">
          <p>VoiceLaunch TTS v1.0</p>
          <p>100% Offline · Open Source</p>
        </div>
      </div>
    </nav>
  )
}

function HudStat({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof Mic
  label: string
  value: string
  tone: 'ready' | 'live' | 'warn' | 'error'
  hint?: string
}) {
  const toneVar = {
    ready: 'var(--vl-state-ready)',
    live: 'var(--vl-state-live)',
    warn: 'var(--vl-state-warn)',
    error: 'var(--vl-state-error)',
  }[tone]
  return (
    <div className="hud-frame card-hover p-5 flex flex-col gap-3 overflow-hidden relative">
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${toneVar}33 0%, transparent 70%)` }}
      />
      <div className="flex items-center justify-between relative">
        <span className="text-[11px] uppercase tracking-[0.22em] text-ink-soft">{label}</span>
        <Icon className="h-5 w-5 neon-glow" style={{ color: toneVar }} />
      </div>
      <div className="text-2xl font-bold text-ink-strong leading-tight relative">{value}</div>
      {hint && <p className="text-xs text-ink-soft leading-relaxed relative">{hint}</p>}
    </div>
  )
}

function HomePage({ backendStatus }: { backendStatus: BackendStatus }) {
  const { setCompactMode } = useAppStore()
  const [installedModelCount, setInstalledModelCount] = useState(0)
  const [virtualMicEnabled, setVirtualMicEnabled] = useState(false)
  const [vbCableDetected, setVbCableDetected] = useState<boolean | null>(null)

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [registry, micStatus, audioDevices] = await Promise.all([
          window.electronAPI.getModelRegistry(),
          window.electronAPI.getVirtualMicStatus(),
          window.electronAPI.listAudioDevices(),
        ])
        setInstalledModelCount(registry.filter((model) => model.installed).length)
        setVirtualMicEnabled(micStatus)
        setVbCableDetected(audioDevices.some((device) => device.name.toLowerCase().includes('cable')))
      } catch {
        // Backend pode estar offline; mantemos valores defaults.
      }
    }
    void loadCounts()
    const syncMic = (event: Event) => {
      setVirtualMicEnabled((event as CustomEvent<boolean>).detail)
    }
    window.addEventListener('voicelaunch:virtual-mic-changed', syncMic as EventListener)
    return () => window.removeEventListener('voicelaunch:virtual-mic-changed', syncMic as EventListener)
  }, [backendStatus.running])

  const backendTone: 'ready' | 'live' | 'warn' | 'error' = backendStatus.running
    ? 'live'
    : backendStatus.phase === 'error'
      ? 'error'
      : 'warn'
  const backendValue = backendStatus.running
    ? 'Online'
    : backendStatus.phase === 'starting'
      ? 'Iniciando'
      : backendStatus.phase === 'error'
        ? 'Falha'
        : 'Offline'

  const micTone: 'ready' | 'live' | 'warn' | 'error' = virtualMicEnabled
    ? 'live'
    : vbCableDetected === false
      ? 'warn'
      : 'ready'
  const micValue = virtualMicEnabled
    ? 'Transmitindo'
    : vbCableDetected === false
      ? 'VB-Cable ausente'
      : 'Pronto'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="hud-frame hud-frame--hero scanline animate-lift-in p-8 lg:p-10">
        <div className="status-pill status-pill--ready w-fit">
          <Sparkles className="h-3.5 w-3.5" />
          Modo local assistivo
        </div>
        <h1 className="mt-6 text-4xl lg:text-5xl font-bold tracking-tight text-display-gradient">
          Uma estacao de voz local para falar rapido, com clareza.
        </h1>
        <p className="mt-4 max-w-2xl text-base lg:text-lg leading-7 text-ink-body">
          Trilha principal em Piper + Kokoro, microfone virtual para Discord/jogos, frases rapidas com atalhos globais 1..9 e modo compacto sempre no topo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#/tts" className="btn-primary btn-primary--armed inline-flex items-center gap-2 px-6 py-3 text-base">
            <Volume2 className="h-5 w-5" />
            Falar agora
          </a>
          <button
            onClick={() => setCompactMode(true)}
            className="btn-secondary inline-flex items-center gap-2 px-5 py-3 text-base"
          >
            <PictureInPicture className="h-5 w-5" />
            Modo compacto
          </button>
          <a href="#/settings" className="btn-ghost text-base">
            <Keyboard className="h-5 w-5" />
            Configurar atalhos
          </a>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <HudStat
          icon={Activity}
          label="Backend"
          value={backendValue}
          tone={backendTone}
          hint={`Porta ${backendStatus.port}`}
        />
        <HudStat
          icon={Download}
          label="Modelos prontos"
          value={String(installedModelCount)}
          tone={installedModelCount > 0 ? 'live' : 'warn'}
          hint={installedModelCount > 0 ? 'Piper/Kokoro disponiveis' : 'Instale Piper para comecar'}
        />
        <HudStat
          icon={Mic}
          label="Microfone virtual"
          value={micValue}
          tone={micTone}
          hint={virtualMicEnabled ? 'CABLE Output ativo' : 'Selecione CABLE Output no Discord'}
        />
        <HudStat
          icon={Keyboard}
          label="Atalho aberto"
          value="Ctrl+Shift+F"
          tone="ready"
          hint="Foca o app de qualquer lugar"
        />
      </div>

      <LocalSetupCard />
    </div>
  )
}

function CompactView({ backendStatus }: { backendStatus: BackendStatus }) {
  const { defaultModelId, setDefaultModelId, defaultSpeed, setDefaultSpeed } = useAppStore()
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
  const canSpeak = Boolean(activeModel) && backendStatus.running
  const compactStatusText = !backendStatus.running
    ? backendStatus.phase === 'error'
      ? 'Backend local indisponivel. Use o retry para restaurar a fala.'
      : 'Iniciando backend local...'
    : activeModel
      ? `${activeModel.name} pronto`
      : 'Instale um modelo em Modelos para usar o compacto'
  const statusColor = !backendStatus.running
    ? 'var(--vl-state-warn)'
    : activeModel
      ? 'var(--vl-state-ready)'
      : 'var(--vl-state-warn)'

  const speak = async (textToSpeak: string) => {
    if (!backendStatus.running) {
      toast('Backend iniciando', 'A fala sera liberada quando o backend local terminar de subir.', 'info')
      return
    }
    if (!textToSpeak.trim() || !activeModel) return
    if (isSpeaking) {
      cancelRef.current = true
      await window.electronAPI.stopAudio()
      setIsSpeaking(false)
      return
    }
    cancelRef.current = false
    setIsSpeaking(true)
    try {
      const response = await window.electronAPI.synthesize({
        text: textToSpeak,
        modelId: activeModel.id,
        speed: defaultSpeed,
      })
      if (cancelRef.current) return
      if (response.success && response.audioPath) {
        await window.electronAPI.playAudio(response.audioPath)
        if (cancelRef.current) return
        addHistoryItem(
          buildHistoryItem({
            text: textToSpeak,
            modelId: activeModel.id,
            audioPath: response.audioPath,
          }),
        )
        if (!keepTextAfterSpeak) {
          setText('')
        }
      } else if (response.error) {
        toast('Erro na fala', response.error, 'error')
      }
    } catch (error) {
      toast('Erro na fala', String(error), 'error')
    } finally {
      setIsSpeaking(false)
    }
  }

  const toggleVirtualMic = async () => {
    if (!backendStatus.running) {
      toast('Backend indisponivel', 'Espere o backend iniciar antes de ativar o microfone virtual.', 'warning')
      return
    }
    const current = await window.electronAPI.getVirtualMicStatus()
    const nextState = !current
    const success = await window.electronAPI.setVirtualMic(nextState)
    if (success) {
      setVirtualMicEnabled(nextState)
      window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: nextState }))
    }
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
          •••
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

      <div className="space-y-2 overflow-auto">
        <div className="grid grid-cols-2 gap-2">
          {quickPhrases.slice(0, 4).map((phrase, index) => (
            <button
              key={phrase}
              onClick={() => {
                setText(phrase)
                void speak(phrase)
              }}
              disabled={!canSpeak}
              className="hud-frame relative px-3 py-2 text-left text-xs text-ink-body transition-colors hover:bg-brand-500/10 disabled:opacity-50"
            >
              <span className="badge-shortcut absolute top-1.5 right-1.5">{index + 1}</span>
              <span className="block pr-7 line-clamp-2">{phrase}</span>
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
                className="whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs text-ink-body transition-colors hover:text-ink-strong"
                style={{ borderColor: 'var(--vl-hud-border)', background: 'rgba(19,9,43,0.7)' }}
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
  const { alwaysOnTop, highContrast, largeFont, compactMode, setCompactMode, voiceSource } = useAppStore()
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(INITIAL_BACKEND_STATUS)
  const [retryingBackend, setRetryingBackend] = useState(false)

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

  useEffect(() => {
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
      const source = settings.voiceSource ?? 'cloud'
      const cableDeviceId = settings.cableDeviceId ?? null
      const speed = settings.defaultSpeed || 1

      if (!phrase) {
        toast('Atalho sem frase', 'Configure as frases rapidas na aba Falar.', 'warning')
        return
      }

      try {
        if (source === 'cloud') {
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
            toast('Erro na voz online', response.error || 'Nao foi possivel gerar a voz.', 'error')
            return
          }
          await playCloudAudio(
            response.audioBase64,
            response.mimeType ?? 'audio/mpeg',
            virtualMicOn && cableDeviceId ? cableDeviceId : undefined,
          )
          const nextCommunication = {
            ...communication,
            ttsDraft: communication.keepTextAfterSpeak ? phrase : '',
            ttsHistory: pushHistoryItem(
              communication.ttsHistory,
              buildHistoryItem({ text: phrase, modelId: `cloud:${cloudVoice}`, voiceId: cloudVoice }),
            ),
          }
          const serialized = serializeCommunicationState(nextCommunication)
          await window.electronAPI.saveSettings(serialized)
          window.dispatchEvent(new CustomEvent('voicelaunch:communication-updated', { detail: serialized }))
          return
        }

        if (!runtimeStatus.running) {
          toast('Backend offline', 'Vozes locais indisponiveis. Troque para Online na aba Falar.', 'info')
          return
        }
        const activeModel = resolveActiveModelForMvp(
          registry,
          detectedHardware,
          settings.defaultModelId,
          settings.showExperimentalModels ?? false,
        )
        if (!activeModel) {
          toast('Sem modelo pronto', 'Instale Piper ou Kokoro em Vozes antes de usar atalhos locais.', 'warning')
          return
        }
        const response = await window.electronAPI.synthesize({
          text: phrase,
          modelId: activeModel.id,
          speed,
        })
        if (!response.success || !response.audioPath) {
          toast('Erro na fala', response.error || 'Nao foi possivel gerar o audio.', 'error')
          return
        }
        await window.electronAPI.playAudio(response.audioPath)
        const nextCommunication = {
          ...communication,
          ttsDraft: communication.keepTextAfterSpeak ? phrase : '',
          ttsHistory: pushHistoryItem(
            communication.ttsHistory,
            buildHistoryItem({ text: phrase, modelId: activeModel.id, audioPath: response.audioPath }),
          ),
        }
        const serialized = serializeCommunicationState(nextCommunication)
        await window.electronAPI.saveSettings(serialized)
        window.dispatchEvent(new CustomEvent('voicelaunch:communication-updated', { detail: serialized }))
      } catch (error) {
        toast('Erro no atalho', String(error), 'error')
      }
    }

    const toggleVirtualMic = async () => {
      const runtimeStatus = await window.electronAPI.getBackendStatus()
      if (!runtimeStatus.running) {
        toast('Backend indisponivel', 'Espere o backend iniciar antes de ativar o microfone virtual.', 'warning')
        return
      }

      const current = await window.electronAPI.getVirtualMicStatus()
      const nextState = !current
      const success = await window.electronAPI.setVirtualMic(nextState)
      if (success) {
        window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: nextState }))
        toast(
          'Microfone virtual',
          nextState ? 'Microfone virtual ativado.' : 'Microfone virtual desativado.',
          'info',
        )
      }
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
      const conflictList = conflicted.slice(0, 3).join(', ') + (conflicted.length > 3 ? '...' : '')
      toast(
        `${conflicted.length} atalho(s) bloqueado(s)`,
        `Outro app ja usa: ${conflictList}. Tente combinacoes Ctrl+Alt ou F-keys em "Atalhos".`,
        'warning',
      )
    })

    const speakVoiceShortcut = async (shortcutId: string) => {
      const [settings, runtimeStatus, virtualMicOn] = await Promise.all([
        window.electronAPI.loadSettings(),
        window.electronAPI.getBackendStatus(),
        window.electronAPI.getVirtualMicStatus(),
      ])
      const shortcuts = Array.isArray(settings.voiceShortcuts) ? settings.voiceShortcuts : []
      const shortcut = shortcuts.find((entry) => entry.id === shortcutId)
      if (!shortcut || !shortcut.enabled) return
      const cableDeviceId = settings.cableDeviceId ?? null

      try {
        if (shortcut.voiceSource === 'cloud') {
          const response = await window.electronAPI.synthesizeCloud({
            text: shortcut.text,
            voice: shortcut.voice,
            speed: shortcut.speed,
            pitch: shortcut.pitch,
          })
          if (!response.success || !response.audioBase64) {
            toast('Falha no atalho', response.error || 'Nao foi possivel gerar a voz.', 'error')
            return
          }
          await playCloudAudio(
            response.audioBase64,
            response.mimeType ?? 'audio/mpeg',
            virtualMicOn && cableDeviceId ? cableDeviceId : undefined,
          )
          return
        }
        if (!runtimeStatus.running) {
          toast('Backend offline', 'O atalho local precisa do backend Python ativo.', 'warning')
          return
        }
        const response = await window.electronAPI.synthesize({
          text: shortcut.text,
          modelId: shortcut.voice,
          speed: shortcut.speed,
        })
        if (!response.success || !response.audioPath) {
          toast('Falha no atalho', response.error || 'Nao foi possivel gerar o audio local.', 'error')
          return
        }
        await window.electronAPI.playAudio(response.audioPath)
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
        <TitleBar />
        <BackendBanner status={backendStatus} retrying={retryingBackend} onRetry={() => void retryBackend()} voiceSource={voiceSource} />
        <CompactView backendStatus={backendStatus} />
        <ToastContainer />
      </div>
    )
  }

  return (
    <HashRouter>
      <div className={rootClass}>
        <TitleBar />
        <BackendBanner status={backendStatus} retrying={retryingBackend} onRetry={() => void retryBackend()} voiceSource={voiceSource} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-5">
            <Routes>
              <Route path="/" element={<HomePage backendStatus={backendStatus} />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/tts" element={<TTSPage />} />
              <Route path="/shortcuts" element={<VoiceShortcutsPage />} />
              <Route path="/clone" element={<ClonePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/logs" element={<LogsPage />} />
            </Routes>
          </main>
        </div>
        <OnboardingTutorial />
        <ToastContainer />
      </div>
    </HashRouter>
  )
}
