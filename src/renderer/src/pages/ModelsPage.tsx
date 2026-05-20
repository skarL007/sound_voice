import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Download,
  Globe,
  Gauge,
  HardDrive,
  Loader2,
  Mic,
  Package,
  Sparkles,
  Star,
  Trash2,
  UserCircle,
  Wrench,
} from 'lucide-react'
import type { HardwareInfo, ModelInfo } from '../../../shared/types'
import { useAppStore } from '../stores/appStore'
import { notify } from '../utils/notify'
import { toast } from '../utils/toast'
import { getModelLevel, getRecommendedSetup, isModelVisibleInMvp } from '../utils/modelSupport'
import CloudVoicesTab from '../components/voices/CloudVoicesTab'
import ClonedVoicesTab from '../components/voices/ClonedVoicesTab'

type VoicesTab = 'cloud' | 'local' | 'cloned'

export default function ModelsPage() {
  const { showExperimentalModels } = useAppStore()
  const [activeTab, setActiveTab] = useState<VoicesTab>('cloud')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [installingDeps, setInstallingDeps] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [speeds, setSpeeds] = useState<Record<string, string>>({})
  const [etas, setEtas] = useState<Record<string, string>>({})

  useEffect(() => {
    window.electronAPI.getHardwareInfo().then(setHardware)
    loadModels()

    const unsubProgress = window.electronAPI.onDownloadProgress((data) => {
      setProgress((prev) => ({ ...prev, [data.modelId]: data.percent }))
      setSpeeds((prev) => ({ ...prev, [data.modelId]: data.speed }))
      setEtas((prev) => ({ ...prev, [data.modelId]: data.eta }))
    })

    const unsubComplete = window.electronAPI.onDownloadComplete((data) => {
      setDownloading((prev) => {
        const next = new Set(prev)
        next.delete(data.modelId)
        return next
      })

      if (data.success) {
        setInstalled((prev) => new Set(prev).add(data.modelId))
        const msg = `O modelo ${data.modelId} foi instalado com sucesso.`
        notify('Download concluido', msg)
        toast('Download concluido', msg, 'success')
        loadModels()
      } else {
        const msg = `Falha ao baixar o modelo ${data.modelId}: ${data.error || 'Erro desconhecido'}`
        notify('Erro no download', msg)
        toast('Erro no download', msg, 'error')
      }
    })

    return () => {
      unsubProgress()
      unsubComplete()
    }
  }, [])

  const loadModels = async () => {
    const registry = await window.electronAPI.getModelRegistry()
    setModels(registry)
    const installedIds = new Set<string>()
    for (const model of registry) {
      if (model.installed) installedIds.add(model.id)
    }
    setInstalled(installedIds)
  }

  const recommendation = getRecommendedSetup(hardware)

  const visibleModels = useMemo(() => {
    return models
      .filter((model) => isModelVisibleInMvp(model, hardware, showExperimentalModels))
      .sort((left, right) => {
        const order = { stable: 0, advanced: 1, experimental: 2 }
        return order[getModelLevel(left.id)] - order[getModelLevel(right.id)]
      })
  }, [hardware, models, showExperimentalModels])

  const hiddenCount = Math.max(models.length - visibleModels.length, 0)

  const handleDownload = async (modelId: string) => {
    setDownloading((prev) => new Set(prev).add(modelId))
    await window.electronAPI.downloadModel(modelId)
  }

  const handleCancelDownload = async (modelId: string) => {
    await window.electronAPI.cancelDownload(modelId)
    setDownloading((prev) => {
      const next = new Set(prev)
      next.delete(modelId)
      return next
    })
    setProgress((prev) => ({ ...prev, [modelId]: 0 }))
  }

  const handleUninstall = async (modelId: string) => {
    const ok = await window.electronAPI.uninstallModel(modelId)
    if (ok) {
      setInstalled((prev) => {
        const next = new Set(prev)
        next.delete(modelId)
        return next
      })
      loadModels()
    }
  }

  const handleInstallDeps = async (modelId: string) => {
    setInstallingDeps((prev) => new Set(prev).add(modelId))
    const result = await window.electronAPI.installModelDeps(modelId)
    setInstallingDeps((prev) => {
      const next = new Set(prev)
      next.delete(modelId)
      return next
    })
    if (result.success) {
      toast('Dependencias instaladas', `O engine ${modelId} esta pronto para uso local.`, 'success')
      loadModels()
    } else {
      toast('Erro na instalacao', result.error || 'Erro desconhecido', 'error')
    }
  }

  const canRun = (model: ModelInfo) => {
    const level = getModelLevel(model.id)
    if (level === 'experimental') return false
    if (level === 'advanced') return Boolean(hardware?.isCudaAvailable)
    return true
  }

  const getGpuBadge = () => {
    if (hardware?.isCudaAvailable) {
      return { text: 'NVIDIA CUDA', className: 'status-pill status-pill--success' }
    }
    if (hardware?.gpuVendor === 'amd') {
      return { text: 'AMD - Fluxo estavel', className: 'status-pill status-pill--error' }
    }
    return { text: 'Local estavel', className: 'status-pill status-pill--ready' }
  }

  const getLevelBadge = (modelId: string) => {
    const level = getModelLevel(modelId)
    if (level === 'stable') {
      return { text: 'Estavel', tier: 'A' as const }
    }
    if (level === 'advanced') {
      return { text: 'Avancado', tier: 'S' as const }
    }
    return { text: 'Experimental', tier: 'B' as const }
  }

  const getSupportNote = (modelId: string) => {
    const level = getModelLevel(modelId)
    if (level === 'stable') {
      return 'Faz parte do caminho principal do MVP local.'
    }
    if (level === 'advanced') {
      return 'Use apenas depois da primeira fala local e com NVIDIA/CUDA validado.'
    }
    return 'Fora do fluxo principal do MVP. Exibido apenas para transparencia tecnica.'
  }

  const gpuBadge = getGpuBadge()

  const tabs: { id: VoicesTab; label: string; icon: typeof Cloud }[] = [
    { id: 'cloud', label: 'Online', icon: Cloud },
    { id: 'local', label: 'Locais', icon: HardDrive },
    { id: 'cloned', label: 'Clonadas', icon: UserCircle },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="w-7 h-7" style={{ color: 'var(--vl-state-ready)' }} />
          <h1 className="text-2xl font-bold text-ink-strong">Vozes</h1>
        </div>
        <span className={gpuBadge.className}>{gpuBadge.text}</span>
      </div>

      <div className="hud-frame p-1.5 inline-flex items-center gap-1 self-start">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id ? 'btn-primary' : 'text-ink-soft hover:text-ink-strong'
              }`}
              aria-pressed={activeTab === tab.id}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'cloud' && <CloudVoicesTab />}
      {activeTab === 'cloned' && <ClonedVoicesTab />}
      {activeTab === 'local' && (
      <>
      <div className="hud-frame hud-frame--hero scanline p-5 space-y-3">
        <div className="flex items-center gap-2 text-ink-strong">
          <Sparkles className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-semibold">Fluxo recomendado do MVP</h2>
        </div>
        <p className="text-ink-body">{recommendation.summary}</p>
        <p className="text-sm text-ink-soft">{recommendation.gpuNote}</p>
        <div className="flex flex-wrap gap-2">
          <span className="tier-badge tier-badge--A">Piper primeiro</span>
          <span className="tier-badge tier-badge--S">Kokoro depois</span>
          {hardware?.isCudaAvailable && (
            <span className="tier-badge tier-badge--B">XTTS v2 (avancado)</span>
          )}
        </div>
      </div>

      {!showExperimentalModels && hiddenCount > 0 && (
        <div className="hud-frame flex items-start gap-3 p-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-ink-soft" />
          <div>
            <p className="text-ink-strong text-sm font-medium">Recursos experimentais estao ocultos por padrao</p>
            <p className="text-ink-soft text-sm mt-1">
              {hiddenCount} modelo(s) ficaram fora desta lista porque ainda nao fazem parte do caminho principal do MVP. Ative a opcao correspondente em Configuracoes se quiser inspeciona-los.
            </p>
          </div>
        </div>
      )}

      {hardware?.gpuVendor === 'amd' && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: 'rgba(255,193,90,0.10)', border: '1px solid rgba(255,193,90,0.30)' }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-warn)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#FFE2A8' }}>GPU AMD detectada</p>
            <p className="text-sm mt-1 text-ink-body">
              O caminho garantido deste MVP local continua sendo Piper e Kokoro. Modelos pesados em PyTorch ficam fora do fluxo principal ate validacao pratica do runtime.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleModels.map((model) => {
          const isInstalled = installed.has(model.id) || model.installed
          const isDownloading = downloading.has(model.id)
          const isInstallingDeps = installingDeps.has(model.id)
          const runnable = canRun(model)
          const depsOk = model.depsInstalled
          const prog = progress[model.id] || 0
          const levelBadge = getLevelBadge(model.id)
          const level = getModelLevel(model.id)

          return (
            <div
              key={model.id}
              className={`hud-frame p-5 flex flex-col gap-3 transition-all ${runnable ? 'card-hover' : 'opacity-80'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-ink-strong">{model.name}</h3>
                  {model.ptBr && (
                    <span title="Portugues Brasileiro suportado">
                      <Star className="w-4 h-4" style={{ color: 'var(--vl-state-warn)', fill: 'var(--vl-state-warn)' }} />
                    </span>
                  )}
                  <span className={`tier-badge tier-badge--${levelBadge.tier}`}>
                    {levelBadge.text}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded text-ink-soft"
                  style={{ background: 'rgba(19,9,43,0.7)', border: '1px solid var(--vl-hud-border)' }}
                >
                  {model.license}
                </span>
              </div>

              <p className="text-sm text-ink-body leading-relaxed">{model.description}</p>
              <p className="text-xs text-ink-soft">{getSupportNote(model.id)}</p>

              <div className="flex flex-wrap gap-2">
                {model.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: 'rgba(139,92,246,0.10)', color: 'var(--vl-purple-300)', border: '1px solid rgba(139,92,246,0.28)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mt-1 text-ink-soft">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {model.languages.join(', ')}
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  MOS {model.mos}
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  {model.sizeMB >= 1024 ? `${(model.sizeMB / 1024).toFixed(1)} GB` : `${model.sizeMB} MB`}
                </div>
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  {model.cloning ? 'Clonagem' : 'Sem clonagem'}
                </div>
              </div>

              {!runnable && level === 'advanced' && (
                <div
                  className="flex items-center gap-2 text-xs p-2 rounded-xl"
                  style={{ background: 'rgba(255,107,125,0.10)', border: '1px solid rgba(255,107,125,0.30)', color: '#FFC1CB' }}
                >
                  <AlertCircle className="w-4 h-4" />
                  Este recurso avancado so entra no MVP com NVIDIA e CUDA validados.
                </div>
              )}

              {!runnable && level === 'experimental' && (
                <div
                  className="flex items-center gap-2 text-xs p-2 rounded-xl"
                  style={{ background: 'rgba(255,193,90,0.10)', border: '1px solid rgba(255,193,90,0.30)', color: '#FFE2A8' }}
                >
                  <AlertCircle className="w-4 h-4" />
                  Este modelo aparece apenas como transparencia tecnica e nao faz parte do fluxo principal.
                </div>
              )}

              {isDownloading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-ink-soft font-mono">
                    <span>Baixando... {speeds[model.id] || ''}</span>
                    <span>{prog}% {etas[model.id] ? `· ETA ${etas[model.id]}` : ''}</span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden relative scanline"
                    style={{ background: 'rgba(95,35,194,0.25)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${prog}%`,
                        background: 'linear-gradient(90deg, #8B5CF6, #49E6FF)',
                        boxShadow: '0 0 12px rgba(139,92,246,0.7)',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleCancelDownload(model.id)}
                    className="text-xs underline"
                    style={{ color: 'var(--vl-state-error)' }}
                    aria-label="Cancelar download"
                  >
                    Cancelar download
                  </button>
                </div>
              )}

              <div className="mt-auto pt-2 space-y-2">
                {isInstalled && level !== 'experimental' && (
                  <div className="flex items-center gap-2 text-xs">
                    {depsOk ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--vl-state-success)' }} />
                        <span style={{ color: 'var(--vl-state-success)' }}>Engine pronto</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-3.5 h-3.5" style={{ color: 'var(--vl-state-warn)' }} />
                        <span style={{ color: 'var(--vl-state-warn)' }}>Dependencias pendentes</span>
                      </>
                    )}
                  </div>
                )}

                {isInstalled ? (
                  <div className="flex gap-2">
                    {!depsOk && level !== 'experimental' && (
                      <button
                        onClick={() => handleInstallDeps(model.id)}
                        disabled={isInstallingDeps}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm"
                        aria-label={`Instalar engine ${model.name}`}
                      >
                        {isInstallingDeps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                        {isInstallingDeps ? 'Instalando...' : 'Instalar engine'}
                      </button>
                    )}
                    <button
                      onClick={() => handleUninstall(model.id)}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
                      style={{ color: 'var(--vl-state-error)' }}
                      aria-label={`Desinstalar modelo ${model.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Desinstalar
                    </button>
                  </div>
                ) : level === 'experimental' ? (
                  <button
                    disabled
                    className="w-full btn-secondary flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
                    aria-label={`Modelo ${model.name} fora do MVP`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    Fora do MVP local
                  </button>
                ) : (
                  <button
                    onClick={() => handleDownload(model.id)}
                    disabled={isDownloading || !runnable}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                    aria-label={`Instalar modelo ${model.name}`}
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isDownloading ? 'Baixando...' : 'Instalar modelo'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </>
      )}
    </div>
  )
}
