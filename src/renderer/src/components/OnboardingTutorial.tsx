import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  Headphones,
  Mic,
  SkipForward,
  Volume2,
  X,
} from 'lucide-react'

interface Step {
  title: string
  description: string
  icon: ReactNode
  tip?: string
}

const steps: Step[] = [
  {
    title: 'Bem-vindo ao VoiceLaunch TTS',
    description:
      'Uma ferramenta de acessibilidade local para transformar texto em voz. O caminho principal deste MVP e offline, simples e focado em primeira fala rapida.',
    icon: <Mic className="w-12 h-12 text-brand-400" />,
    tip: 'Comece pelo fluxo principal antes de tentar recursos avancados.',
  },
  {
    title: 'Verifique seu computador',
    description:
      'Na aba "Hardware", voce ve as especificacoes do seu PC e recebe a recomendacao pratica do MVP. Para a maioria das maquinas, a primeira rota continua sendo Piper e Kokoro.',
    icon: <Cpu className="w-12 h-12 text-blue-400" />,
    tip: 'AMD e NVIDIA aparecem de forma honesta: so o que o runtime principal valida entra no fluxo recomendado.',
  },
  {
    title: 'Prepare seu primeiro modelo',
    description:
      'Na aba "Modelos", instale primeiro o Piper. Depois, se quiser melhor qualidade, adicione o Kokoro. XTTS v2 fica como recurso avancado para CUDA validado.',
    icon: <Download className="w-12 h-12 text-green-400" />,
    tip: 'Piper e o melhor ponto de partida para a primeira fala local sem atrito.',
  },
  {
    title: 'Comece a falar',
    description:
      'Na aba "Falar", digite uma frase ou use as frases rapidas. Quando Piper ou Kokoro estiverem prontos, voce ja consegue testar a primeira fala local imediatamente.',
    icon: <Volume2 className="w-12 h-12 text-purple-400" />,
    tip: 'Valide a primeira fala antes de habilitar qualquer recurso avancado.',
  },
  {
    title: 'Use como microfone virtual',
    description:
      'Ative o microfone virtual para que a voz gerada apareca no Discord, Zoom, jogos e outros apps. Selecione "CABLE Output" como microfone.',
    icon: <Headphones className="w-12 h-12 text-pink-400" />,
    tip: 'Se o VB-Cable nao estiver instalado, faca isso na aba Configuracoes.',
  },
]

export default function OnboardingTutorial() {
  const { tutorialSeen, setTutorialSeen } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!tutorialSeen) {
      setIsOpen(true)
    }
  }, [tutorialSeen])

  const close = () => {
    setIsOpen(false)
    setTutorialSeen(true)
  }

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

  if (!isOpen) return null

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-1 px-6 pt-6 pb-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index <= stepIndex ? 'bg-brand-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-end px-4 pt-2">
          <button
            onClick={close}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
            title="Pular tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 pb-6 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            {step.icon}
          </div>

          <h2 className="text-xl font-bold text-white mb-3">{step.title}</h2>
          <p className="text-slate-300 leading-relaxed mb-4">{step.description}</p>

          {step.tip && (
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-3 text-sm text-brand-300 mb-6">
              <strong>Dica:</strong> {step.tip}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={prev}
              disabled={stepIndex === 0}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Voltar
            </button>

            <div className="flex gap-2">
              {!isLast && (
                <button
                  onClick={close}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
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
