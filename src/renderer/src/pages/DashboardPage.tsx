import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
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
import { getHardwarePlaybook } from '../utils/hardwarePlaybook'

type Tier = 'S' | 'A' | 'B' | 'C'

interface TierMeta {
  tier: Tier
  name: string
  desc: string
}

const tierMap: Record<string, TierMeta> = {
  edge: { tier: 'C', name: 'Basico', desc: 'Modelos leves no CPU' },
  cpu: { tier: 'B', name: 'CPU', desc: 'Fluxo local estavel' },
  entry: { tier: 'B', name: 'Entrada', desc: 'GPU modesta' },
  mid: { tier: 'A', name: 'Medio', desc: 'GPU intermediaria' },
  high: { tier: 'A', name: 'Alto', desc: 'GPU forte' },
  enthusiast: { tier: 'S', name: 'Entusiasta', desc: 'GPU topo de linha' },
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
        <div
          className="animate-spin w-8 h-8 border-2 rounded-full"
          style={{ borderColor: 'var(--vl-state-ready)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!hardware) {
    return (
      <div className="h-full flex items-center justify-center text-ink-soft">
        <AlertTriangle className="w-6 h-6 mr-2" />
        Nao foi possivel detectar o hardware.
      </div>
    )
  }

  const tierMeta = tierMap[hardware.recommendedTier] || tierMap.cpu
  const playbook = getHardwarePlaybook(hardware)
  const gpuAccel = hardware.isCudaAvailable
    ? `NVIDIA CUDA ${hardware.cudaVersion}`
    : hardware.isRocmAvailable
      ? `AMD ROCm ${hardware.rocmVersion}`
      : null

  const ramFraction = Math.min(hardware.ramGB / 32, 1)
  const vramFraction = hardware.gpuVRAM > 0 ? Math.min(hardware.gpuVRAM / 16000, 1) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Cpu className="w-7 h-7" style={{ color: 'var(--vl-state-ready)' }} />
        <h1 className="text-2xl font-bold text-ink-strong">Meu Computador</h1>
      </div>

      <div className="hud-frame hud-frame--hero p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-xl font-bold text-ink-strong">{playbook.headline}</h2>
          <span
            className={`tier-badge tier-badge--${tierMeta.tier} ml-auto`}
            title={`Tier: ${tierMeta.name} — ${tierMeta.desc}`}
          >
            {playbook.trackBadge}
          </span>
        </div>
        <p className="text-ink-body">{playbook.summary}</p>

        <div className="space-y-2">
          {playbook.steps.map((step, index) => (
            <a
              key={step.action}
              href={step.href}
              className="panel-muted flex items-center gap-3 p-3 transition-all hover:bg-brand-500/8 group"
            >
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono"
                style={{
                  background: 'var(--vl-surface-overlay)',
                  border: '1px solid var(--vl-hud-border-strong)',
                  color: 'var(--vl-purple-200)',
                }}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-strong">{step.title}</p>
                <p className="text-xs text-ink-soft leading-relaxed">{step.description}</p>
              </div>
              <ArrowRight
                className="w-4 h-4 flex-shrink-0 text-ink-soft transition-transform group-hover:translate-x-1"
              />
            </a>
          ))}
        </div>

        {playbook.notes.length > 0 && (
          <div className="space-y-2 pt-2">
            {playbook.notes.map((note, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs"
                style={{ color: note.tone === 'warn' ? 'var(--vl-state-warn)' : 'var(--vl-ink-soft)' }}
              >
                <span aria-hidden>•</span>
                <span>{note.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SpecCard
          icon={<Cpu className="w-6 h-6" style={{ color: 'var(--vl-state-ready)' }} />}
          title="Processador"
          value={hardware.cpu}
          detail={`${hardware.cpuCores} nucleos / ${hardware.cpuThreads} threads`}
        />
        <SpecCard
          icon={<MemoryStick className="w-6 h-6" style={{ color: 'var(--vl-state-success)' }} />}
          title="Memoria RAM"
          value={`${hardware.ramGB} GB`}
          detail={hardware.ramGB < 8 ? 'Recomendado: 16 GB+' : hardware.ramGB >= 16 ? 'Bom para modelos maiores' : 'Suficiente para o fluxo principal'}
          fraction={ramFraction}
        />
        <SpecCard
          icon={<Monitor className="w-6 h-6" style={{ color: 'var(--vl-state-ready)' }} />}
          title="Placa de Video"
          value={hardware.gpu}
          detail={hardware.gpuVRAM > 0 ? `${hardware.gpuVRAM} MB VRAM · ${hardware.gpuVendor.toUpperCase()}` : 'GPU integrada / nao detectada'}
          fraction={vramFraction}
        />
        <SpecCard
          icon={<HardDrive className="w-6 h-6" style={{ color: 'var(--vl-state-warn)' }} />}
          title="Sistema Operacional"
          value={hardware.osVersion}
          detail={hardware.os}
        />
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {gpuAccel ? (
              <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--vl-state-success)' }} />
            ) : (
              <XCircle className="w-6 h-6" style={{ color: 'var(--vl-state-error)' }} />
            )}
            <div>
              <h3 className="font-medium text-ink-strong">Aceleracao GPU validada</h3>
              <p className="text-sm text-ink-soft">
                {gpuAccel
                  ? `${gpuAccel} detectado para o runtime atual`
                  : 'Nenhuma aceleracao GPU validada para o runtime principal. O caminho garantido segue em Piper/Kokoro.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {hardware.gpuVendor === 'amd' && (
        <div
          className="hud-frame p-5"
          style={{ borderLeft: '4px solid var(--vl-state-error)' }}
        >
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-error)' }} />
            <div>
              <h3 className="font-medium text-ink-strong">GPU AMD detectada</h3>
              <p className="text-sm text-ink-soft mt-1">
                O caminho garantido deste MVP continua sendo <strong>Piper</strong> e <strong>Kokoro</strong>.
                Recursos pesados em PyTorch ficam fora do fluxo principal em AMD ate validacao pratica do runtime.
              </p>
            </div>
          </div>
        </div>
      )}

      {hardware.isCudaAvailable && (
        <div
          className="hud-frame p-5"
          style={{ borderLeft: '4px solid var(--vl-state-ready)' }}
        >
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-ready)' }} />
            <div>
              <h3 className="font-medium text-ink-strong">NVIDIA com CUDA validado</h3>
              <p className="text-sm text-ink-soft mt-1">
                Depois da primeira fala local com Piper ou Kokoro, voce pode habilitar <strong>XTTS v2</strong> como recurso avancado para clonagem.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SpecCard({ icon, title, value, detail, fraction }: {
  icon: ReactNode
  title: string
  value: string
  detail: string
  fraction?: number
}) {
  return (
    <div className="hud-frame card-hover p-5">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="text-sm font-medium text-ink-soft uppercase tracking-wider">{title}</h3>
      </div>
      <p className="text-ink-strong font-semibold text-lg truncate" title={value}>{value}</p>
      <p className="text-sm text-ink-mute mt-1">{detail}</p>
      {typeof fraction === 'number' && (
        <div
          className="mt-3 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--vl-surface-sunken)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.round(fraction * 100)}%`,
              background: 'var(--vl-state-ready)',
              boxShadow: 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}
