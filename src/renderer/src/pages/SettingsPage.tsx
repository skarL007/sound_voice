import { useEffect, useState } from 'react'
import type { BackendStatus } from '../../../shared/types'
import { useAppStore } from '../stores/appStore'
import {
  AlertTriangle,
  Contrast,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-medium text-white">Backend Python</h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus.phase === 'running'
                  ? 'bg-green-400'
                  : backendStatus.phase === 'starting'
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
              }`}
            />
            <span className="text-sm text-slate-400">
              {backendLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <span className="text-slate-500">Porta</span>
            <p className="text-white font-medium">{backendStatus.port}</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <span className="text-slate-500">Uptime</span>
            <p className="text-white font-medium">{backendStatus.uptime}s</p>
          </div>
        </div>

        <button onClick={restartBackend} className="btn-secondary text-sm flex items-center gap-2" aria-label="Reiniciar backend Python">
          <RefreshCw className="w-4 h-4" />
          {backendStatus.phase === 'starting' ? 'Reiniciar backend' : 'Tentar novamente'}
        </button>
        {backendStatus.lastError && (
          <p className="mt-3 text-sm text-red-300">{backendStatus.lastError}</p>
        )}
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-center gap-3 mb-4">
          <Mic className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-medium text-white">Microfone Virtual</h2>
        </div>

        {!vbCableInstalled ? (
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-200 text-sm font-medium">VB-Audio Virtual Cable nao detectado</p>
              <p className="text-yellow-200/70 text-sm mt-1">
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
                  className="text-sm text-brand-300 hover:text-brand-200 flex items-center gap-1"
                  aria-label="Tentar abrir o instalador do VB-Audio Virtual Cable"
                >
                  <Wrench className="w-3 h-3" />
                  Tentar instalador do pacote
                </button>
                <button
                  onClick={() => window.electronAPI.openExternal('https://vb-audio.com/Cable/')}
                  className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1"
                  aria-label="Abrir site oficial do VB-Audio Virtual Cable"
                >
                  <ExternalLink className="w-3 h-3" />
                  Site oficial
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Info className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-200 text-sm font-medium">VB-Audio Virtual Cable detectado</p>
              <p className="text-green-200/70 text-sm mt-1">
                O dispositivo &quot;CABLE Output&quot; esta disponivel como microfone em seus aplicativos.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Dispositivos de audio detectados</h3>
          <div className="space-y-1 max-h-48 overflow-auto">
            {audioDevices.map((device) => (
              <div
                key={device.id}
                className={`flex items-center gap-2 text-sm p-2 rounded ${
                  device.name.toLowerCase().includes('cable')
                    ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                    : 'text-slate-400'
                }`}
              >
                {device.isInput ? <Mic className="w-3 h-3" /> : <Headphones className="w-3 h-3" />}
                <span>{device.name}</span>
                {device.isDefault && <span className="text-xs bg-slate-700 px-1.5 rounded">padrao</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-center gap-3 mb-4">
          <Contrast className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-medium text-white">Acessibilidade</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <Contrast className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-white">Alto contraste</p>
                <p className="text-xs text-slate-500">Cores de alto contraste para melhor visibilidade</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(event) => setHighContrast(event.target.checked)}
              className="w-5 h-5 accent-brand-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-white">Fontes grandes</p>
                <p className="text-xs text-slate-500">Aumenta o tamanho do texto em toda a interface</p>
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

      <div className="glass-panel p-5">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-medium text-white">Politica do MVP local</h2>
        </div>

        <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
          <div>
            <p className="text-sm font-medium text-white">Mostrar modelos experimentais</p>
            <p className="text-xs text-slate-500">
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

      <div className="glass-panel p-5">
        <h2 className="text-lg font-medium text-white mb-3">Sobre o VoiceLaunch TTS</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          VoiceLaunch TTS e uma ferramenta de acessibilidade gratuita e open source projetada para pessoas com deficiencia na fala.
          Toda a sintese principal acontece localmente no seu computador.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <span className="text-slate-500 block mb-1">Versao</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <span className="text-slate-500 block mb-1">Licenca</span>
            <span className="text-white">MIT</span>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <span className="text-slate-500 block mb-1">Fluxo principal</span>
            <span className="text-white">Piper, Kokoro, microfone virtual</span>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <span className="text-slate-500 block mb-1">Recurso avancado</span>
            <span className="text-white">XTTS v2 apos validar NVIDIA/CUDA</span>
          </div>
        </div>
      </div>
    </div>
  )
}
