import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import type { HardwareInfo } from '../../../shared/types'
import { getRecommendedSetup } from '../utils/modelSupport'

const tierLabels: Record<string, { name: string; desc: string; color: string }> = {
  edge: { name: 'Basico', desc: 'Modelos leves no CPU', color: 'text-yellow-400' },
  cpu: { name: 'CPU', desc: 'Fluxo local estavel', color: 'text-blue-400' },
  entry: { name: 'Entrada', desc: 'GPU modesta', color: 'text-green-400' },
  mid: { name: 'Medio', desc: 'GPU intermediaria', color: 'text-brand-400' },
  high: { name: 'Alto', desc: 'GPU forte', color: 'text-purple-400' },
  enthusiast: { name: 'Entusiasta', desc: 'GPU topo de linha', color: 'text-pink-400' },
}

export default function DashboardPage() {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.getHardwareInfo().then((info) => {
      setHardware(info)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!hardware) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <AlertTriangle className="w-6 h-6 mr-2" />
        Nao foi possivel detectar o hardware.
      </div>
    )
  }

  const tier = tierLabels[hardware.recommendedTier] || tierLabels.cpu
  const recommendation = getRecommendedSetup(hardware)
  const gpuAccel = hardware.isCudaAvailable
    ? `NVIDIA CUDA ${hardware.cudaVersion}`
    : hardware.isRocmAvailable
      ? `AMD ROCm ${hardware.rocmVersion}`
      : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Cpu className="w-7 h-7 text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Meu Computador</h1>
      </div>

      <div className="glass-panel p-6 border-l-4 border-l-brand-500">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-brand-400" />
          <h2 className="text-lg font-semibold text-white">Recomendacao de uso local</h2>
        </div>
        <p className="text-slate-300 mb-2">
          Seu hardware foi classificado como <span className={`font-bold ${tier.color}`}>{tier.name}</span>.
          {' '}{tier.desc}
        </p>
        <p className="text-sm text-slate-400 mb-3">{recommendation.summary}</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/30">Piper (primeiro passo)</span>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">Kokoro (upgrade de qualidade)</span>
          {hardware.isCudaAvailable && (
            <span className="px-3 py-1 bg-brand-500/20 text-brand-300 rounded-full text-sm border border-brand-500/30">XTTS v2 (avancado)</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SpecCard
          icon={<Cpu className="w-6 h-6 text-blue-400" />}
          title="Processador"
          value={hardware.cpu}
          detail={`${hardware.cpuCores} nucleos / ${hardware.cpuThreads} threads`}
        />
        <SpecCard
          icon={<MemoryStick className="w-6 h-6 text-green-400" />}
          title="Memoria RAM"
          value={`${hardware.ramGB} GB`}
          detail={hardware.ramGB < 8 ? 'Recomendado: 16 GB+' : hardware.ramGB >= 16 ? 'Bom para modelos maiores' : 'Suficiente para o fluxo principal'}
        />
        <SpecCard
          icon={<Monitor className="w-6 h-6 text-purple-400" />}
          title="Placa de Video"
          value={hardware.gpu}
          detail={hardware.gpuVRAM > 0 ? `${hardware.gpuVRAM} MB VRAM · ${hardware.gpuVendor.toUpperCase()}` : 'GPU integrada / nao detectada'}
        />
        <SpecCard
          icon={<HardDrive className="w-6 h-6 text-orange-400" />}
          title="Sistema Operacional"
          value={hardware.osVersion}
          detail={hardware.os}
        />
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {gpuAccel ? (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <h3 className="font-medium text-white">Aceleracao GPU validada</h3>
              <p className="text-sm text-slate-400">
                {gpuAccel
                  ? `${gpuAccel} detectado para o runtime atual`
                  : 'Nenhuma aceleracao GPU validada para o runtime principal. O caminho garantido segue em Piper/Kokoro.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {hardware.gpuVendor === 'amd' && (
        <div className="glass-panel p-5 border-l-4 border-l-red-500">
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-white">GPU AMD detectada</h3>
              <p className="text-sm text-slate-400 mt-1">
                O caminho garantido deste MVP continua sendo <strong>Piper</strong> e <strong>Kokoro</strong>.
                Recursos pesados em PyTorch ficam fora do fluxo principal em AMD ate validacao pratica do runtime.
              </p>
            </div>
          </div>
        </div>
      )}

      {hardware.isCudaAvailable && (
        <div className="glass-panel p-5 border-l-4 border-l-brand-500">
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-white">NVIDIA com CUDA validado</h3>
              <p className="text-sm text-slate-400 mt-1">
                Depois da primeira fala local com Piper ou Kokoro, voce pode habilitar <strong>XTTS v2</strong> como recurso avancado para clonagem.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SpecCard({ icon, title, value, detail }: {
  icon: ReactNode
  title: string
  value: string
  detail: string
}) {
  return (
    <div className="glass-panel p-5 card-hover">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</h3>
      </div>
      <p className="text-white font-semibold text-lg truncate" title={value}>{value}</p>
      <p className="text-sm text-slate-500 mt-1">{detail}</p>
    </div>
  )
}
