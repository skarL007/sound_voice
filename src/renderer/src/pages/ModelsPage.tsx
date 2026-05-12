import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
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
  Wrench,
} from 'lucide-react'
import type { HardwareInfo, ModelInfo } from '../../../shared/types'
import { useAppStore } from '../stores/appStore'
import { notify } from '../utils/notify'
import { toast } from '../utils/toast'
import { getModelLevel, getRecommendedSetup, isModelVisibleInMvp } from '../utils/modelSupport'

export default function ModelsPage() {
  const { showExperimentalModels } = useAppStore()
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
      return { text: 'NVIDIA CUDA', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' }
    }
    if (hardware?.gpuVendor === 'amd') {
      return { text: 'AMD - Fluxo estavel', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
    }
    return { text: 'Local estavel', color: 'text-slate-300', bg: 'bg-slate-700/30', border: 'border-slate-600/30' }
  }

  const getLevelBadge = (modelId: string) => {
    const level = getModelLevel(modelId)
    if (level === 'stable') {
      return { text: 'Estavel', className: 'bg-green-500/15 text-green-300 border-green-500/25' }
    }
    if (level === 'advanced') {
      return { text: 'Avancado', className: 'bg-brand-500/15 text-brand-300 border-brand-500/25' }
    }
    return { text: 'Experimental', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25' }
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="w-7 h-7 text-brand-400" />
          <h1 className="text-2xl font-bold text-white">Modelos TTS</h1>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border ${gpuBadge.color} ${gpuBadge.bg} ${gpuBadge.border}`}>
          {gpuBadge.text}
        </span>
      </div>

      <div className="glass-panel p-5 space-y-3">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold">Fluxo recomendado do MVP</h2>
        </div>
        <p className="text-slate-300">{recommendation.summary}</p>
        <p className="text-sm text-slate-400">{recommendation.gpuNote}</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/30">Piper primeiro</span>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">Kokoro depois</span>
          {hardware?.isCudaAvailable && (
            <span className="px-3 py-1 bg-brand-500/20 text-brand-300 rounded-full text-sm border border-brand-500/30">XTTS v2 so depois do basico</span>
          )}
        </div>
      </div>

      {!showExperimentalModels && hiddenCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <AlertCircle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-slate-200 text-sm font-medium">Recursos experimentais estao ocultos por padrao</p>
            <p className="text-slate-400 text-sm mt-1">
              {hiddenCount} modelo(s) ficaram fora desta lista porque ainda nao fazem parte do caminho principal do MVP. Ative a opcao correspondente em Configuracoes se quiser inspeciona-los.
            </p>
          </div>
        </div>
      )}

      {hardware?.gpuVendor === 'amd' && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-200 text-sm font-medium">GPU AMD detectada</p>
            <p className="text-yellow-200/70 text-sm mt-1">
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
              className={`glass-panel p-5 flex flex-col gap-3 transition-all ${runnable ? 'card-hover' : 'opacity-80'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-white">{model.name}</h3>
                  {model.ptBr && (
                    <span title="Portugues Brasileiro suportado">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full border ${levelBadge.className}`}>
                    {levelBadge.text}
                  </span>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400 border border-slate-700">
                  {model.license}
                </span>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">{model.description}</p>
              <p className="text-xs text-slate-500">{getSupportNote(model.id)}</p>

              <div className="flex flex-wrap gap-2">
                {model.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-brand-500/10 text-brand-300 rounded border border-brand-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Globe className="w-4 h-4" />
                  {model.languages.join(', ')}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Gauge className="w-4 h-4" />
                  MOS {model.mos}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <HardDrive className="w-4 h-4" />
                  {model.sizeMB >= 1024 ? `${(model.sizeMB / 1024).toFixed(1)} GB` : `${model.sizeMB} MB`}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mic className="w-4 h-4" />
                  {model.cloning ? 'Clonagem' : 'Sem clonagem'}
                </div>
              </div>

              {!runnable && level === 'advanced' && (
                <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 p-2 rounded border border-red-500/20">
                  <AlertCircle className="w-4 h-4" />
                  Este recurso avancado so entra no MVP com NVIDIA e CUDA validados.
                </div>
              )}

              {!runnable && level === 'experimental' && (
                <div className="flex items-center gap-2 text-xs text-yellow-300 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                  <AlertCircle className="w-4 h-4" />
                  Este modelo aparece apenas como transparencia tecnica e nao faz parte do fluxo principal.
                </div>
              )}

              {isDownloading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Baixando... {speeds[model.id] || ''}</span>
                    <span>{prog}% {etas[model.id] ? `(faltam ${etas[model.id]})` : ''}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${prog}%` }} />
                  </div>
                  <button
                    onClick={() => handleCancelDownload(model.id)}
                    className="text-xs text-red-400 hover:text-red-300 underline"
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
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-300">Engine pronto</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-yellow-300">Dependencias pendentes</span>
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
                      className="flex-1 btn-secondary flex items-center justify-center gap-2 text-red-300 hover:text-red-200 hover:bg-red-500/20 text-sm"
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
    </div>
  )
}
