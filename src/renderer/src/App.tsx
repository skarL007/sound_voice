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
} from 'lucide-react'

import DashboardPage from './pages/DashboardPage'
import ModelsPage from './pages/ModelsPage'
import TTSPage from './pages/TTSPage'
import ClonePage from './pages/ClonePage'
import SettingsPage from './pages/SettingsPage'
import LogsPage from './pages/LogsPage'
import { useAppStore } from './stores/appStore'
import OnboardingTutorial from './components/OnboardingTutorial'
import ToastContainer from './components/ToastContainer'
import LocalSetupCard from './components/LocalSetupCard'
import { useCommunicationSettings } from './hooks/useCommunicationSettings'
import { buildHistoryItem, pushHistoryItem, sanitizeCommunicationState, serializeCommunicationState } from './utils/communicationState'
import { getVisibleInstalledModels, resolveActiveModelForMvp } from './utils/modelSupport'
import { toast } from './utils/toast'
import type { BackendStatus, ModelInfo } from '../../shared/types'

const navItems = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/dashboard', icon: Cpu, label: 'Hardware' },
  { to: '/models', icon: Download, label: 'Modelos' },
  { to: '/tts', icon: Volume2, label: 'Falar' },
  { to: '/clone', icon: UserCircle, label: 'Clonar Voz' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
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
}: {
  status: BackendStatus
  retrying: boolean
  onRetry: () => void
}) {
  if (status.running) return null

  const isStarting = status.phase === 'starting'
  const title = isStarting ? 'Iniciando backend local' : 'Backend local indisponivel'
  const description = isStarting
    ? 'A interface ja esta pronta. A fala sera liberada assim que o backend terminar de subir.'
    : status.lastError || 'Tente reiniciar o backend para liberar a sintese e o microfone virtual.'

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          {isStarting ? (
            <RefreshCw className="mt-0.5 h-4 w-4 animate-spin text-amber-300" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
          )}
          <div>
            <p className="text-sm font-medium text-amber-100">{title}</p>
            <p className="text-sm text-amber-200/80">{description}</p>
          </div>
        </div>
        <button
          onClick={onRetry}
          disabled={retrying}
          className="btn-secondary inline-flex items-center gap-2 self-start text-sm text-amber-100 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

function TitleBar() {
  const { alwaysOnTop, setAlwaysOnTop, compactMode, setCompactMode } = useAppStore()

  return (
    <div className="h-12 flex items-center justify-between border-b border-chrome-700/70 bg-chrome-950/80 px-2 select-none app-drag-region">
      <div className="flex items-center gap-3 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-400/10">
          <Mic className="w-4 h-4 text-brand-300" />
        </div>
        <div>
          <span className="block text-sm font-semibold text-slate-100">VoiceLaunch TTS</span>
          <span className="block text-[11px] uppercase tracking-[0.24em] text-slate-500">Local Voice Console</span>
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
    <nav className="flex h-full w-20 flex-col border-r border-chrome-700/70 bg-chrome-950/55 px-3 py-4 lg:w-64">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          aria-label={item.label}
          className={({ isActive }) =>
            [
              'nav-link',
              isActive
                ? 'border border-brand-400/25 bg-brand-400/10 text-brand-200 shadow-[inset_3px_0_0_0_rgba(73,230,255,0.9)]'
                : 'text-slate-400 hover:border hover:border-chrome-600 hover:bg-chrome-900/80 hover:text-slate-200',
            ].join(' ')
          }
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block text-sm font-medium">{item.label}</span>
        </NavLink>
      ))}

      <div className="mt-auto px-4 py-3">
        <div className="hidden lg:block text-xs text-slate-600">
          <p>VoiceLaunch TTS v1.0</p>
          <p>100% Offline · Open Source</p>
        </div>
      </div>
    </nav>
  )
}

function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="panel-surface animate-lift-in p-8 lg:p-10">
          <div className="status-pill border-brand-400/30 bg-brand-400/10 text-brand-200">Modo local assistivo</div>
          <h1 className="mt-6 text-4xl font-bold text-slate-50">Uma estacao de voz local para falar rapido, com clareza.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            O fluxo principal continua focado em Piper e Kokoro, com microfone virtual, frases rapidas e comunicacao assistiva.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#/tts" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base">
              <Volume2 className="h-5 w-5" />
              Falar agora
            </a>
            <a href="#/models" className="btn-secondary inline-flex items-center gap-2 px-6 py-3 text-base">
              <Download className="h-5 w-5" />
              Preparar modelos
            </a>
          </div>
        </section>

        <aside className="panel-surface p-6">
          <div className="status-pill border-chrome-600 bg-chrome-900/80 text-slate-300">Fluxo principal</div>
          <div className="mt-4 grid gap-3">
            <div className="panel-muted flex items-center justify-between p-3">
              <span className="text-sm text-slate-300">Backend</span>
              <span className="text-xs font-medium text-brand-200">Local</span>
            </div>
            <div className="panel-muted flex items-center justify-between p-3">
              <span className="text-sm text-slate-300">Modelos principais</span>
              <span className="text-xs font-medium text-slate-100">Piper e Kokoro</span>
            </div>
            <div className="panel-muted flex items-center justify-between p-3">
              <span className="text-sm text-slate-300">Microfone virtual</span>
              <span className="text-xs font-medium text-slate-100">Disponivel quando ativado</span>
            </div>
            <div className="panel-muted flex items-center justify-between p-3">
              <span className="text-sm text-slate-300">Modo compacto</span>
              <span className="text-xs font-medium text-slate-100">Atalho Ctrl+Shift+V</span>
            </div>
          </div>
        </aside>
      </div>

      <LocalSetupCard />
    </div>
  )
}

function CompactView({ backendStatus }: { backendStatus: BackendStatus }) {
  const { defaultModelId, defaultSpeed } = useAppStore()
  const { text, setText, history, quickPhrases, keepTextAfterSpeak, setKeepTextAfterSpeak, addHistoryItem } = useCommunicationSettings()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [virtualMicEnabled, setVirtualMicEnabled] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
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
      ? `${activeModel.name} disponivel`
      : 'Instale um modelo em Modelos para usar o compacto'

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
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={toggleVirtualMic}
          className={`status-pill transition-colors ${
            virtualMicEnabled
              ? 'border-green-500/30 bg-green-500/10 text-green-200'
              : 'border-chrome-600 bg-chrome-900 text-slate-300'
          }`}
        >
          {virtualMicEnabled ? 'Mic ativo' : 'Mic desligado'}
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={keepTextAfterSpeak}
            onChange={(event) => setKeepTextAfterSpeak(event.target.checked)}
            className="accent-brand-400"
          />
          Manter texto
        </label>
      </div>

      <p className={`text-xs ${canSpeak ? 'text-slate-400' : 'text-amber-300'}`}>{compactStatusText}</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite uma frase e aperte Enter para falar"
        className="panel-muted min-h-[180px] flex-1 resize-none p-4 text-base leading-6 text-slate-50 outline-none placeholder:text-slate-500"
        autoFocus
      />

      <div className="space-y-3 overflow-auto">
        <div className="grid grid-cols-2 gap-2">
          {quickPhrases.slice(0, 4).map((phrase) => (
            <button
              key={phrase}
              onClick={() => {
                setText(phrase)
                void speak(phrase)
              }}
              disabled={!canSpeak}
              className="panel-muted px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:border-brand-400/35 hover:bg-brand-400/10"
            >
              {phrase}
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2 overflow-auto pb-1">
            <History className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
            {history.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => setText(item.text)}
                className="whitespace-nowrap rounded-xl border border-chrome-700/80 bg-chrome-900/90 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-brand-400/30 hover:text-slate-100"
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
        className="btn-primary flex items-center justify-center gap-2 py-3 text-sm font-semibold"
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
  const { alwaysOnTop, highContrast, largeFont, compactMode, setCompactMode } = useAppStore()
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
      const [settings, runtimeStatus, detectedHardware, registry] = await Promise.all([
        window.electronAPI.loadSettings(),
        window.electronAPI.getBackendStatus(),
        window.electronAPI.getHardwareInfo(),
        window.electronAPI.getModelRegistry(),
      ])
      const communication = sanitizeCommunicationState(settings)
      const phrase = communication.quickPhrases[index]

      if (!phrase) {
        toast('Atalho sem frase', 'Configure as frases rapidas na aba Falar.', 'warning')
        return
      }

      if (!runtimeStatus.running) {
        toast('Backend iniciando', 'Os atalhos de fala serao liberados quando o backend local terminar de subir.', 'info')
        return
      }

      const activeModel = resolveActiveModelForMvp(
        registry,
        detectedHardware,
        settings.defaultModelId,
        settings.showExperimentalModels ?? false,
      )

      if (!activeModel) {
        toast('Sem modelo pronto', 'Instale Piper ou Kokoro na aba Modelos antes de usar atalhos globais.', 'warning')
        return
      }

      const speed = settings.defaultSpeed || 1

      try {
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
            buildHistoryItem({
              text: phrase,
              modelId: activeModel.id,
              audioPath: response.audioPath,
            }),
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

    return () => {
      unsubQuickPhrase()
      unsubOpenCompact()
      unsubToggleVirtualMic()
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
        <BackendBanner status={backendStatus} retrying={retryingBackend} onRetry={() => void retryBackend()} />
        <CompactView backendStatus={backendStatus} />
        <ToastContainer />
      </div>
    )
  }

  return (
    <HashRouter>
      <div className={rootClass}>
        <TitleBar />
        <BackendBanner status={backendStatus} retrying={retryingBackend} onRetry={() => void retryBackend()} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-5">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/tts" element={<TTSPage />} />
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
