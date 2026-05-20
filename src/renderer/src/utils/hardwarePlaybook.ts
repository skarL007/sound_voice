import type { HardwareInfo } from '../../../shared/types'

export type PlaybookStepAction = 'try-cloud' | 'install-piper' | 'install-kokoro' | 'install-xtts' | 'setup-mic' | 'tour-shortcuts'

export interface PlaybookStep {
  title: string
  description: string
  action: PlaybookStepAction
  href: string
  tone: 'ready' | 'live' | 'warn'
}

export interface HardwarePlaybook {
  headline: string
  summary: string
  trackBadge: string
  trackTone: 'ready' | 'live' | 'warn' | 'success'
  steps: PlaybookStep[]
  advancedAvailable: boolean
  notes: { tone: 'info' | 'warn'; text: string }[]
}

function vendor(hw: HardwareInfo | null): 'nvidia' | 'amd' | 'intel' | 'unknown' {
  if (!hw) return 'unknown'
  const v = hw.gpuVendor?.toLowerCase().trim()
  if (v === 'nvidia' || v === 'amd' || v === 'intel') return v
  return 'unknown'
}

const STEP_CLOUD: PlaybookStep = {
  title: 'Fale agora com Edge TTS',
  description: 'Centenas de vozes naturais funcionam imediatamente — sem instalacao, sem GPU, com internet.',
  action: 'try-cloud',
  href: '#/tts',
  tone: 'live',
}

const STEP_PIPER: PlaybookStep = {
  title: 'Instale Piper local',
  description: 'Motor leve em ONNX que roda em CPU. 50+ idiomas. Funciona offline depois de baixar.',
  action: 'install-piper',
  href: '#/models',
  tone: 'ready',
}

const STEP_KOKORO: PlaybookStep = {
  title: 'Suba a qualidade com Kokoro',
  description: 'Motor com MOS 4.2 em apenas 300 MB. Ainda funciona em CPU.',
  action: 'install-kokoro',
  href: '#/models',
  tone: 'ready',
}

const STEP_XTTS: PlaybookStep = {
  title: 'Habilite clonagem com XTTS v2',
  description: 'Clone qualquer voz com 6-30s de amostra. Requer GPU NVIDIA com CUDA validado.',
  action: 'install-xtts',
  href: '#/clone',
  tone: 'ready',
}

const STEP_MIC: PlaybookStep = {
  title: 'Configure o microfone virtual',
  description: 'Instale VB-Cable, selecione CABLE Input como saida e defina CABLE Output no Discord/VRChat.',
  action: 'setup-mic',
  href: '#/settings',
  tone: 'live',
}

const STEP_SHORTCUTS: PlaybookStep = {
  title: 'Crie seus atalhos de voz',
  description: 'Cada atalho dispara uma frase com voz fixa — funciona no jogo sem trazer o app pra frente.',
  action: 'tour-shortcuts',
  href: '#/shortcuts',
  tone: 'ready',
}

export function getHardwarePlaybook(hw: HardwareInfo | null): HardwarePlaybook {
  const ven = vendor(hw)
  const cuda = Boolean(hw?.isCudaAvailable)

  if (ven === 'nvidia' && cuda) {
    return {
      headline: 'Trilha completa NVIDIA + CUDA',
      summary: 'Voce tem o caminho premium liberado: Edge TTS online, Piper/Kokoro local e clonagem XTTS.',
      trackBadge: 'NVIDIA',
      trackTone: 'success',
      steps: [STEP_CLOUD, STEP_PIPER, STEP_KOKORO, STEP_XTTS, STEP_MIC, STEP_SHORTCUTS],
      advancedAvailable: true,
      notes: [
        { tone: 'info', text: 'CUDA ' + (hw?.cudaVersion || 'detectado') + '. Voce pode habilitar o XTTS v2 quando quiser clonar uma voz.' },
      ],
    }
  }

  if (ven === 'amd') {
    return {
      headline: 'Trilha leve para AMD',
      summary: 'Em Windows, AMD nao tem framework TTS GPU estavel. Voce vai usar a trilha CPU+nuvem — funciona muito bem para Discord e jogos.',
      trackBadge: 'AMD',
      trackTone: 'live',
      steps: [STEP_CLOUD, STEP_PIPER, STEP_KOKORO, STEP_MIC, STEP_SHORTCUTS],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: 'Piper e Kokoro rodam diretamente no seu CPU, sem precisar de driver especial.' },
        { tone: 'info', text: 'A clonagem XTTS v2 exige NVIDIA + CUDA, entao fica fora do seu fluxo. Use vozes online — sao centenas.' },
      ],
    }
  }

  if (ven === 'intel') {
    return {
      headline: 'Trilha CPU + nuvem (Intel)',
      summary: 'iGPU Intel nao acelera TTS em nenhum framework estavel. Voce vai usar Edge TTS online e modelos leves em CPU.',
      trackBadge: 'Intel',
      trackTone: 'live',
      steps: [STEP_CLOUD, STEP_PIPER, STEP_MIC, STEP_SHORTCUTS],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: 'Piper foi pensado pra rodar em CPUs modestas. A primeira fala demora menos de 1 segundo.' },
      ],
    }
  }

  if (ven === 'unknown' || !hw) {
    return {
      headline: 'Trilha universal (sem GPU dedicada)',
      summary: 'Edge TTS online cobre tudo. Piper pode ser instalado para uso offline em CPU.',
      trackBadge: 'CPU',
      trackTone: 'live',
      steps: [STEP_CLOUD, STEP_PIPER, STEP_MIC, STEP_SHORTCUTS],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: 'Detectei sua maquina como tier CPU. As trilhas avancadas exigem GPU NVIDIA com CUDA.' },
      ],
    }
  }

  // NVIDIA without CUDA
  return {
    headline: 'NVIDIA detectada — sem CUDA',
    summary: 'A GPU aparece, mas CUDA Toolkit nao foi encontrado. Use a trilha CPU+nuvem agora; instale CUDA depois para liberar a clonagem.',
    trackBadge: 'NVIDIA',
    trackTone: 'warn',
    steps: [STEP_CLOUD, STEP_PIPER, STEP_KOKORO, STEP_MIC, STEP_SHORTCUTS],
    advancedAvailable: false,
    notes: [
      { tone: 'warn', text: 'Instale o CUDA Toolkit 11.8+ e reabra o app para habilitar XTTS e clonagem.' },
    ],
  }
}
