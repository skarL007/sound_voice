import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Cpu, Download, Volume2, Zap } from 'lucide-react'
import type { HardwareInfo, ModelInfo } from '../../../shared/types'
import { getRecommendedSetup, isModelVisibleInMvp } from '../utils/modelSupport'

export default function LocalSetupCard() {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [hardwareLoading, setHardwareLoading] = useState(true)
  const [modelsLoading, setModelsLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.getHardwareInfo().then(setHardware).finally(() => setHardwareLoading(false))
    window.electronAPI.getModelRegistry().then(setModels).finally(() => setModelsLoading(false))
  }, [])

  const recommendation = getRecommendedSetup(hardware)
  const isLoading = hardwareLoading || modelsLoading
  const visibleModels = models.filter((model) => isModelVisibleInMvp(model, hardware, false))
  const primaryModel = visibleModels.find((model) => model.id === recommendation.primaryModelId)
  const primaryReady = Boolean(primaryModel?.installed && primaryModel?.depsInstalled)
  const canSpeakNow = primaryReady
  const gpuVendorRaw = hardware?.gpuVendor?.trim()
  const gpuVendorNormalized = gpuVendorRaw?.toLowerCase()
  const gpuVendorLabel =
    gpuVendorNormalized &&
    !['generic', 'unknown', 'n/a', 'na', 'other'].includes(gpuVendorNormalized)
      ? gpuVendorRaw
      : null
  const catalogText = isLoading
    ? 'Carregando catalogo...'
    : visibleModels.length > 0
      ? visibleModels.map((model) => model.name).join(', ')
      : 'Nenhum modelo do MVP esta visivel ou pronto no momento.'

  const checklist = [
    {
      done: !isLoading && Boolean(hardware),
      icon: Cpu,
      title: '1. Verificar hardware',
      detail: isLoading
        ? 'Carregando hardware local...'
        : hardware
          ? `Detectado: ${hardware.cpu} - ${gpuVendorLabel ? `GPU ${gpuVendorLabel}` : 'GPU não identificada'}`
          : 'Abra a aba Hardware para validar a maquina.',
      href: '/dashboard',
      cta: 'Abrir hardware',
    },
    {
      done: !isLoading && primaryReady,
      icon: Download,
      title: `2. Preparar ${primaryModel?.name || 'Piper TTS'}`,
      detail: isLoading
        ? 'Carregando catalogo de modelos...'
        : primaryReady
          ? `${primaryModel?.name || 'Piper TTS'} ja esta pronto para uso local.`
          : 'Instale primeiro o Piper. Ele e o caminho mais seguro para a primeira fala local.',
      href: '/models',
      cta: isLoading ? 'Aguardar catalogo' : primaryReady ? 'Gerenciar modelos' : 'Instalar modelo',
    },
    {
      done: !isLoading && canSpeakNow,
      icon: Volume2,
      title: '3. Fazer a primeira fala',
      detail: isLoading
        ? 'Carregando estado inicial do setup...'
        : canSpeakNow
          ? 'A aba Falar ja pode ser usada com o fluxo estavel do MVP.'
          : 'Depois que o Piper estiver pronto, siga para a aba Falar e teste a primeira frase.',
      href: '/tts',
      cta: 'Abrir Falar',
    },
  ]

  return (
    <section className="panel-surface space-y-6 p-6 lg:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="status-pill border-ember-500/30 bg-ember-500/10 text-ember-100">Launch Checklist</div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-50">Setup local recomendado</h2>
          <p className="mt-2 text-slate-300">{recommendation.summary}</p>
          <p className="mt-2 text-sm text-slate-400">{recommendation.gpuNote}</p>
        </div>
        <div className="panel-muted rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-brand-200">
          MVP Local
        </div>
      </div>

      <div className="space-y-3">
        {checklist.map((item) => (
          <div
            key={item.title}
            className="panel-muted flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between"
          >
            <div className="flex items-start gap-3">
              {isLoading ? (
                <Circle className="mt-0.5 h-5 w-5 animate-pulse text-slate-400" />
              ) : item.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-signal-success" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-slate-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-brand-300" />
                  <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</p>
              </div>
            </div>
            <Link to={item.href} className="btn-secondary whitespace-nowrap text-sm">
              {item.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="panel-muted p-4 text-sm text-slate-400">
        <div className="flex items-center gap-2 text-slate-200">
          <Zap className="h-4 w-4 text-amber-300" />
          Modelos visiveis neste MVP
        </div>
        <p className="mt-2 leading-6">{catalogText}</p>
      </div>
    </section>
  )
}
