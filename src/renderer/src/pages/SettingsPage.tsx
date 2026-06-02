import { useEffect, useState } from 'react'
import type { BackendStatus } from '../../../shared/types'
import { useAppStore } from '../stores/appStore'
import {
  BookOpen,
  ChevronRight,
  Contrast,
  Cpu,
  Eye,
  Mic,
  RefreshCw,
  Settings,
  Type,
} from 'lucide-react'
import { toast } from '../utils/toast'
import AudioOutputPicker from '../components/AudioOutputPicker'
import VirtualMicSetupPanel from '../components/VirtualMicSetupPanel'
import {
  detectVBCable,
  resolveVBCableInstallState,
  type VBCableDownloadProgress,
  type VBCableInstallState,
} from '../utils/virtualMicSetup'

export default function SettingsPage() {
  const {
    highContrast,
    setHighContrast,
    largeFont,
    setLargeFont,
    showExperimentalModels,
    setShowExperimentalModels,
    setTutorialSeen,
  } = useAppStore()
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    running: false,
    port: 9472,
    version: '1.0.0',
    uptime: 0,
    phase: 'starting',
  })
  const [vbCableInstalled, setVbCableInstalled] = useState(false)
  const [installState, setInstallState] = useState<VBCableInstallState>('idle')
  const [installMessage, setInstallMessage] = useState<string | undefined>(undefined)
  const [installing, setInstalling] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<VBCableDownloadProgress | null>(null)

  useEffect(() => {
    loadStatus()
    loadAudioDevices()
    const offProgress = window.electronAPI.onVBCableDownloadProgress((data) => {
      setInstallState('downloading')
      setDownloadProgress(data)
    })
    const offComplete = window.electronAPI.onVBCableDownloadComplete(() => {
      setDownloadProgress(null)
    })
    return () => {
      offProgress()
      offComplete()
    }
  }, [])

  const loadStatus = async () => {
    const status = await window.electronAPI.getBackendStatus()
    setBackendStatus(status)
  }

  const loadAudioDevices = async () => {
    const devices = await window.electronAPI.listAudioDevices()
    const hasVbCable = detectVBCable(devices)
    setVbCableInstalled(hasVbCable)
    if (hasVbCable) {
      setInstallState('idle')
      setInstallMessage(undefined)
    }
  }

  const restartBackend = async () => {
    await window.electronAPI.restartBackend()
    setTimeout(loadStatus, 3000)
  }

  const installVirtualMic = async () => {
    setInstalling(true)
    setInstallState('launching')
    setInstallMessage(undefined)
    try {
      const result = await window.electronAPI.downloadVBCable()
      const resolved = resolveVBCableInstallState(result)
      setInstallState(resolved.state)
      setInstallMessage(resolved.message)
      if (resolved.state === 'launched') {
        toast('Instalador aberto', 'Clique em "Install Driver" no VB-Cable. Depois clique em Verificar instalacao.', 'success')
      } else if (resolved.state === 'manual') {
        toast('Download manual', resolved.message, 'info')
      } else {
        toast('Erro', resolved.message, 'error')
      }
    } finally {
      setInstalling(false)
      setDownloadProgress(null)
    }
  }

  const verifyVirtualMic = async () => {
    await window.electronAPI.refreshVirtualMic()
    const devices = await window.electronAPI.listAudioDevices()
    const detected = detectVBCable(devices)
    setVbCableInstalled(detected)
    if (detected) {
      setInstallState('idle')
      setInstallMessage(undefined)
      toast('VB-Cable detectado', 'Agora selecione CABLE Output como microfone no Discord, Zoom ou jogo.', 'success')
    } else {
      toast('Ainda nao detectado', 'Se o instalador terminou, reinicie o Windows e clique em Verificar instalacao.', 'warning')
    }
  }

  const backendLabel =
    backendStatus.phase === 'running'
      ? 'Online'
      : backendStatus.phase === 'starting'
        ? 'Iniciando'
        : backendStatus.phase === 'error'
          ? 'Falha'
          : 'Offline'

  const statusDotColor = backendStatus.phase === 'running'
    ? 'var(--vl-state-success)'
    : backendStatus.phase === 'starting'
      ? 'var(--vl-state-warn)'
      : 'var(--vl-state-error)'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7" style={{ color: 'var(--vl-state-ready)' }} />
        <h1 className="text-2xl font-bold text-ink-strong">Configuracoes</h1>
      </div>

      <a
        href="#/dashboard"
        className="hud-frame card-hover p-5 flex items-center gap-4 group"
        aria-label="Abrir informacoes de hardware"
      >
        <Cpu className="w-6 h-6" style={{ color: 'var(--vl-state-ready)' }} />
        <div className="flex-1">
          <p className="text-base font-medium text-ink-strong">Meu computador</p>
          <p className="text-sm text-ink-soft">CPU, RAM, GPU detectados e classificacao da maquina.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-soft group-hover:translate-x-1 transition-transform" />
      </a>

      <div className="hud-frame p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
            <h2 className="text-lg font-medium text-ink-strong">Backend Python (vozes locais)</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: statusDotColor }} />
            <span className="text-sm text-ink-soft">{backendLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="panel-muted p-3">
            <span className="text-ink-mute">Porta</span>
            <p className="text-ink-strong font-medium font-mono">{backendStatus.port}</p>
          </div>
          <div className="panel-muted p-3">
            <span className="text-ink-mute">Uptime</span>
            <p className="text-ink-strong font-medium font-mono">{backendStatus.uptime}s</p>
          </div>
        </div>

        <button onClick={restartBackend} className="btn-secondary text-sm flex items-center gap-2" aria-label="Reiniciar backend Python">
          <RefreshCw className="w-4 h-4" />
          {backendStatus.phase === 'starting' ? 'Reiniciar backend' : 'Tentar novamente'}
        </button>
        {backendStatus.lastError && (
          <p className="mt-3 text-sm" style={{ color: 'var(--vl-state-error)' }}>{backendStatus.lastError}</p>
        )}
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center gap-3 mb-4">
          <Mic className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-medium text-ink-strong">Microfone Virtual</h2>
        </div>

        <VirtualMicSetupPanel
          detected={vbCableInstalled}
          installState={installState}
          message={installMessage}
          progress={downloadProgress}
          installing={installing}
          onInstall={() => void installVirtualMic()}
          onVerify={() => void verifyVirtualMic()}
        />

        <div className="mt-4 space-y-3">
          <AudioOutputPicker />
        </div>
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center gap-3 mb-4">
          <Contrast className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-medium text-ink-strong">Acessibilidade</h2>
        </div>

        <div className="space-y-3">
          <label className="panel-muted flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-brand-500/8">
            <div className="flex items-center gap-3">
              <Contrast className="w-5 h-5 text-ink-soft" />
              <div>
                <p className="text-sm font-medium text-ink-strong">Alto contraste</p>
                <p className="text-xs text-ink-mute">Cores de alto contraste para melhor visibilidade</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(event) => setHighContrast(event.target.checked)}
              className="w-5 h-5 accent-brand-500"
            />
          </label>

          <label className="panel-muted flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-brand-500/8">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-ink-soft" />
              <div>
                <p className="text-sm font-medium text-ink-strong">Fontes grandes</p>
                <p className="text-xs text-ink-mute">Aumenta o tamanho do texto em toda a interface</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={largeFont}
              onChange={(event) => setLargeFont(event.target.checked)}
              className="w-5 h-5 accent-brand-500"
            />
          </label>
        </div>
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-medium text-ink-strong">Politica do MVP local</h2>
        </div>

        <label className="panel-muted flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-brand-500/8">
          <div>
            <p className="text-sm font-medium text-ink-strong">Mostrar modelos experimentais</p>
            <p className="text-xs text-ink-mute">
              Exibe Bark, Fish Speech e outros itens fora do fluxo principal. Eles continuam fora do caminho recomendado para usuario final.
            </p>
          </div>
          <input
            type="checkbox"
            checked={showExperimentalModels}
            onChange={(event) => setShowExperimentalModels(event.target.checked)}
            className="w-5 h-5 accent-brand-500"
          />
        </label>
      </div>

      <div className="hud-frame p-5">
        <h2 className="text-lg font-medium text-ink-strong mb-3">Atalhos globais</h2>
        <p className="text-sm text-ink-soft mb-3">
          Pressione qualquer combinacao a partir de qualquer app. Edicao customizada chega na proxima versao.
        </p>
        <ul className="space-y-2 text-sm">
          {[
            ['Ctrl+Shift+F', 'Foca a janela e o campo de texto'],
            ['Ctrl+Shift+V', 'Abre o modo compacto'],
            ['Ctrl+Shift+M', 'Liga/desliga microfone virtual'],
            ['Ctrl+Shift+S', 'Para o audio em execucao'],
            ['Ctrl+Shift+1..9', 'Fala a frase rapida 1 a 9'],
          ].map(([shortcut, desc]) => (
            <li key={shortcut} className="panel-muted flex items-center justify-between p-2.5">
              <span className="text-ink-body">{desc}</span>
              <code className="badge-shortcut text-[11px] px-2 w-auto" style={{ minWidth: 'auto', width: 'auto', height: 'auto', padding: '2px 6px' }}>
                {shortcut}
              </code>
            </li>
          ))}
        </ul>
      </div>

      <div className="hud-frame p-5">
        <h2 className="text-lg font-medium text-ink-strong mb-3">Sobre o VoiceLaunch TTS</h2>
        <p className="text-sm text-ink-soft leading-relaxed mb-4">
          VoiceLaunch TTS e uma ferramenta gratuita e open source de comunicacao assistiva local.
          Ela ajuda quem prefere, precisa ou escolhe transformar texto em voz com rapidez, autonomia e privacidade.
        </p>
        <button
          onClick={() => setTutorialSeen(false)}
          className="btn-secondary inline-flex items-center gap-2 text-sm mb-4"
          aria-label="Rever tutorial de introducao"
        >
          <BookOpen className="w-4 h-4" />
          Rever tutorial de introducao
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="panel-muted p-3">
            <span className="text-ink-mute block mb-1">Versao</span>
            <span className="text-ink-strong">1.0.0</span>
          </div>
          <div className="panel-muted p-3">
            <span className="text-ink-mute block mb-1">Licenca</span>
            <span className="text-ink-strong">MIT</span>
          </div>
          <div className="panel-muted p-3">
            <span className="text-ink-mute block mb-1">Fluxo principal</span>
            <span className="text-ink-strong">Piper, Kokoro, microfone virtual</span>
          </div>
          <div className="panel-muted p-3">
            <span className="text-ink-mute block mb-1">Recurso avancado</span>
            <span className="text-ink-strong">XTTS v2 apos validar NVIDIA/CUDA</span>
          </div>
        </div>
      </div>
    </div>
  )
}
