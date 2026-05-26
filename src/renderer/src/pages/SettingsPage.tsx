import { useEffect, useState } from 'react'
import type { BackendStatus } from '../../../shared/types'
import { useAppStore } from '../stores/appStore'
import {
  AlertTriangle,
  ChevronRight,
  Contrast,
  Cpu,
  ExternalLink,
  Eye,
  Headphones,
  Info,
  Mic,
  RefreshCw,
  Settings,
  Type,
  Wrench,
} from 'lucide-react'
import { toast } from '../utils/toast'
import AudioOutputPicker from '../components/AudioOutputPicker'

export default function SettingsPage() {
  const {
    highContrast,
    setHighContrast,
    largeFont,
    setLargeFont,
    showExperimentalModels,
    setShowExperimentalModels,
  } = useAppStore()
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    running: false,
    port: 9472,
    version: '1.0.0',
    uptime: 0,
    phase: 'starting',
  })
  const [audioDevices, setAudioDevices] = useState<any[]>([])
  const [vbCableInstalled, setVbCableInstalled] = useState(false)

  useEffect(() => {
    loadStatus()
    loadAudioDevices()
  }, [])

  const loadStatus = async () => {
    const status = await window.electronAPI.getBackendStatus()
    setBackendStatus(status)
  }

  const loadAudioDevices = async () => {
    const devices = await window.electronAPI.listAudioDevices()
    setAudioDevices(devices)
    const hasVbCable = devices.some((device: any) => device.name.toLowerCase().includes('cable'))
    setVbCableInstalled(hasVbCable)
  }

  const restartBackend = async () => {
    await window.electronAPI.restartBackend()
    setTimeout(loadStatus, 3000)
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

        {!vbCableInstalled ? (
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-warn)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--vl-state-warn-text)' }}>VB-Audio Virtual Cable nao detectado</p>
              <p className="text-sm mt-1 text-ink-body">
                Para usar o microfone virtual, instale o VB-Audio Virtual Cable. Se o instalador nao estiver embutido neste pacote, o site oficial sera aberto.
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={async () => {
                    const result = await window.electronAPI.installVBCable()
                    if (result.success && result.launched) {
                      toast('Instalador iniciado', 'Siga as instrucoes na tela para instalar o VB-Cable.', 'success')
                    } else if (result.message) {
                      toast('Download manual', result.message, 'info')
                    } else {
                      toast('Erro', result.error || 'Nao foi possivel iniciar a instalacao.', 'error')
                    }
                  }}
                  className="btn-ghost text-sm"
                  aria-label="Tentar abrir o instalador do VB-Audio Virtual Cable"
                >
                  <Wrench className="w-3 h-3" />
                  Tentar instalador do pacote
                </button>
                <button
                  onClick={() => window.electronAPI.openExternal('https://vb-audio.com/Cable/')}
                  className="btn-ghost text-sm"
                  aria-label="Abrir site oficial do VB-Audio Virtual Cable"
                >
                  <ExternalLink className="w-3 h-3" />
                  Site oficial
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: 'var(--vl-state-success-bg)', border: '1px solid var(--vl-state-success-border)' }}
          >
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-success)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--vl-state-success-text)' }}>VB-Audio Virtual Cable detectado</p>
              <p className="text-sm mt-1 text-ink-body">
                O dispositivo &quot;CABLE Output&quot; esta disponivel como microfone em seus aplicativos.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <AudioOutputPicker />

          {audioDevices.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-ink-soft hover:text-ink-strong select-none">
                Dispositivos detectados pelo backend Python ({audioDevices.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-48 overflow-auto">
                {audioDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`flex items-center gap-2 text-sm p-2 rounded ${
                      device.name.toLowerCase().includes('cable') ? 'status-pill status-pill--live' : 'text-ink-soft'
                    }`}
                  >
                    {device.isInput ? <Mic className="w-3 h-3" /> : <Headphones className="w-3 h-3" />}
                    <span>{device.name}</span>
                    {device.isDefault && (
                      <span
                        className="text-xs px-1.5 rounded text-ink-soft"
                        style={{ background: 'rgba(19,9,43,0.7)' }}
                      >
                        padrao
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
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
