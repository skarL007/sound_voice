import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Cpu,
  Download,
  Headphones,
  Keyboard,
  Mic,
  SkipForward,
  Sparkles,
  UserCircle,
  Volume2,
  X,
} from 'lucide-react'
import type { HardwareInfo } from '../../../shared/types'
import { getHardwarePlaybook } from '../utils/hardwarePlaybook'
import type { PlaybookStepAction } from '../utils/hardwarePlaybook'

interface Step {
  title: string
  description: string
  icon: ReactNode
  tip?: string
  verify?: 'mic-virtual' | null
}

function iconFor(action: PlaybookStepAction | 'welcome'): ReactNode {
  const color = 'var(--vl-state-ready)'
  const liveColor = 'var(--vl-state-live)'
  switch (action) {
    case 'welcome':
      return <Mic className="w-12 h-12" style={{ color }} />
    case 'try-cloud':
      return <Cloud className="w-12 h-12" style={{ color: liveColor }} />
    case 'install-piper':
    case 'install-kokoro':
      return <Download className="w-12 h-12" style={{ color }} />
    case 'install-xtts':
      return <UserCircle className="w-12 h-12" style={{ color }} />
    case 'setup-mic':
      return <Headphones className="w-12 h-12" style={{ color: liveColor }} />
    case 'tour-shortcuts':
      return <Keyboard className="w-12 h-12" style={{ color }} />
    default:
      return <Sparkles className="w-12 h-12" style={{ color }} />
  }
}

function buildSteps(hardware: HardwareInfo | null): Step[] {
  const playbook = getHardwarePlaybook(hardware)
  const intro: Step = {
    title: 'Bem-vindo ao VoiceLaunch TTS',
    description:
      'Estacao de voz local para quem nao fala, joga, conversa no Discord ou precisa de comunicacao assistiva. Sua trilha foi adaptada ao seu hardware.',
    icon: iconFor('welcome'),
    tip: `Trilha detectada: ${playbook.headline}.`,
  }
  const playSteps: Step[] = playbook.steps.map((step) => ({
    title: step.title,
    description: step.description,
    icon: iconFor(step.action),
    tip: step.action === 'try-cloud'
      ? 'Va para "Falar", escolha uma voz e mande Enter. Funciona ja.'
      : step.action === 'install-piper'
        ? 'Em "Vozes" > Locais, instale o Piper portugues. Roda no CPU.'
        : step.action === 'install-xtts'
          ? 'Use a aba "Clonar" para gravar 6-30s da voz que voce quer reproduzir.'
          : step.action === 'setup-mic'
            ? 'Em "Ajustes" > Microfone Virtual, selecione CABLE Input.'
            : step.action === 'tour-shortcuts'
              ? 'Em "Atalhos" voce cria teclas globais que disparam frases.'
              : undefined,
    verify: step.action === 'setup-mic' ? 'mic-virtual' : null,
  }))
  return [intro, ...playSteps]
}

export default function OnboardingTutorial() {
  const tutorialSeen = useAppStore((state) => state.tutorialSeen)
  const setTutorialSeen = useAppStore((state) => state.setTutorialSeen)
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [steps, setSteps] = useState<Step[]>(buildSteps(null))
  const [micVerified, setMicVerified] = useState(false)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    if (!tutorialSeen) {
      setIsOpen(true)
    }
  }, [tutorialSeen])

  useEffect(() => {
    let active = true
    window.electronAPI.getHardwareInfo().then((info) => {
      if (!active) return
      setHardware(info)
      setSteps(buildSteps(info))
    })
    return () => {
      active = false
    }
  }, [])

  const close = () => {
    setIsOpen(false)
    setTutorialSeen(true)
  }

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  useEffect(() => {
    if (!isOpen || !step || step.verify !== 'mic-virtual') return
    let cancelled = false
    let attempts = 0
    setPolling(true)
    setMicVerified(false)
    const tick = async () => {
      if (cancelled) return
      try {
        const status = await window.electronAPI.getVirtualMicStatus()
        if (status) {
          setMicVerified(true)
          setPolling(false)
          return
        }
      } catch {
        /* ignore */
      }
      attempts += 1
      if (attempts < 10 && !cancelled) {
        setTimeout(tick, 1000)
      } else {
        setPolling(false)
      }
    }
    void tick()
    return () => {
      cancelled = true
      setPolling(false)
    }
  }, [isOpen, stepIndex, step])

  if (!isOpen) return null

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((index) => index + 1)
    } else {
      close()
    }
  }

  const prev = () => {
    if (stepIndex > 0) setStepIndex((index) => index - 1)
  }

  const trackHardware = hardware ? `${hardware.gpuVendor.toUpperCase()} · ${hardware.ramGB} GB` : 'Detectando hardware...'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="hud-frame hud-frame--hero scanline max-w-lg w-full overflow-hidden animate-lift-in">
        <div className="flex items-center gap-1 px-6 pt-6 pb-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background: index <= stepIndex ? 'var(--vl-state-ready)' : 'rgba(95,35,194,0.25)',
                boxShadow: index <= stepIndex ? '0 0 8px rgba(139,92,246,0.5)' : 'none',
              }}
            />
          ))}
        </div>

        <div className="flex justify-between items-center px-4 pt-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-mute">
            Passo {stepIndex + 1} de {steps.length} · {trackHardware}
          </span>
          <button
            onClick={close}
            className="p-2 rounded-lg text-ink-soft hover:bg-brand-500/15 hover:text-ink-strong transition-colors"
            title="Pular tutorial"
            aria-label="Pular tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 pb-6 text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'rgba(139, 92, 246, 0.14)',
              border: '1px solid var(--vl-hud-border-strong)',
              boxShadow: '0 0 30px rgba(139,92,246,0.25)',
            }}
          >
            {step.icon}
          </div>

          <h2 className="text-xl font-bold text-ink-strong mb-3 neon-glow" style={{ color: 'var(--vl-purple-200)' }}>
            {step.title}
          </h2>
          <p className="text-ink-body leading-relaxed mb-4">{step.description}</p>

          {step.tip && (
            <div
              className="rounded-2xl p-3 text-sm mb-4 text-left"
              style={{
                background: 'rgba(139,92,246,0.10)',
                border: '1px solid rgba(139,92,246,0.32)',
                color: 'var(--vl-purple-200)',
              }}
            >
              <strong>Dica:</strong> {step.tip}
            </div>
          )}

          {step.verify === 'mic-virtual' && (
            <div
              className="rounded-2xl p-3 text-sm mb-6 text-left flex items-center gap-2"
              style={{
                background: micVerified ? 'rgba(97,228,163,0.10)' : 'rgba(73,230,255,0.08)',
                border: `1px solid ${micVerified ? 'rgba(97,228,163,0.32)' : 'rgba(73,230,255,0.28)'}`,
                color: micVerified ? '#B6F2D6' : '#A5F0FF',
              }}
            >
              {micVerified ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              ) : polling ? (
                <Volume2 className="h-5 w-5 flex-shrink-0 animate-pulse" />
              ) : (
                <Volume2 className="h-5 w-5 flex-shrink-0" />
              )}
              <span>
                {micVerified
                  ? 'Microfone virtual ativo. Discord/VRChat devem ouvir voce agora.'
                  : polling
                    ? 'Aguardando voce ativar o microfone virtual (botao "Ativar" na aba Falar)...'
                    : 'Nao detectei o microfone virtual ainda. Voce pode continuar e configurar depois em Ajustes.'}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={prev}
              disabled={stepIndex === 0}
              className="px-4 py-2 text-sm text-ink-soft hover:text-ink-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Voltar
            </button>

            <div className="flex gap-2">
              {!isLast && (
                <button
                  onClick={close}
                  className="px-4 py-2 text-sm text-ink-soft hover:text-ink-strong flex items-center gap-1.5 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  Pular
                </button>
              )}

              <button onClick={next} className="btn-primary flex items-center gap-2 px-6">
                {isLast ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Comecar
                  </>
                ) : (
                  <>
                    Proximo
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
