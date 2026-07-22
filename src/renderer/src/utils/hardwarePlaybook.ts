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
  title: 'Speak now with Edge TTS',
  description: 'Hundreds of natural voices work right away — no install, no GPU, just internet.',
  action: 'try-cloud',
  href: '#/',
  tone: 'live',
}

const STEP_PIPER: PlaybookStep = {
  title: 'Install local Piper',
  description: 'Lightweight ONNX engine that runs on CPU. 50+ languages. Works offline after downloading.',
  action: 'install-piper',
  href: '#/settings',
  tone: 'ready',
}

const STEP_KOKORO: PlaybookStep = {
  title: 'Boost quality with Kokoro',
  description: 'Engine with MOS 4.2 in just 300 MB. Still runs on CPU.',
  action: 'install-kokoro',
  href: '#/settings',
  tone: 'ready',
}

const STEP_XTTS: PlaybookStep = {
  title: 'Enable cloning with XTTS v2',
  description: 'Clone any voice with a 6-30s sample. Requires an NVIDIA GPU with validated CUDA.',
  action: 'install-xtts',
  href: '#/settings',
  tone: 'ready',
}

const STEP_MIC: PlaybookStep = {
  title: 'Set up the virtual microphone',
  description: 'Install VB-Cable, select CABLE Input as output, and set CABLE Output in Discord/VRChat.',
  action: 'setup-mic',
  href: '#/settings',
  tone: 'live',
}

const STEP_SHORTCUTS: PlaybookStep = {
  title: 'Create your voice shortcuts',
  description: 'Each shortcut triggers a phrase with a fixed voice — works in-game without bringing the app to the front.',
  action: 'tour-shortcuts',
  href: '#/shortcuts',
  tone: 'ready',
}

export function getHardwarePlaybook(hw: HardwareInfo | null): HardwarePlaybook {
  const ven = vendor(hw)
  const cuda = Boolean(hw?.isCudaAvailable)

  if (ven === 'nvidia' && cuda) {
    return {
      headline: 'Full NVIDIA + CUDA track',
      summary: 'You have the premium path unlocked: online Edge TTS, local Piper/Kokoro, and XTTS cloning.',
      trackBadge: 'NVIDIA',
      trackTone: 'success',
      steps: [STEP_CLOUD, STEP_PIPER, STEP_KOKORO, STEP_XTTS, STEP_MIC, STEP_SHORTCUTS],
      advancedAvailable: true,
      notes: [
        { tone: 'info', text: 'CUDA ' + (hw?.cudaVersion || 'detected') + '. You can enable XTTS v2 whenever you want to clone a voice.' },
      ],
    }
  }

  if (ven === 'amd') {
    return {
      headline: 'Lightweight track for AMD',
      summary: 'On Windows, AMD has no stable GPU TTS framework. You will use the CPU+cloud track — works great for Discord and games.',
      trackBadge: 'AMD',
      trackTone: 'live',
      steps: [STEP_CLOUD, STEP_PIPER, STEP_KOKORO, STEP_MIC, STEP_SHORTCUTS],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: 'Piper and Kokoro run directly on your CPU, no special driver needed.' },
        { tone: 'info', text: 'XTTS v2 cloning requires NVIDIA + CUDA, so it is outside your flow. Use online voices — there are hundreds.' },
      ],
    }
  }

  if (ven === 'intel') {
    return {
      headline: 'CPU + cloud track (Intel)',
      summary: 'Intel iGPU does not accelerate TTS in any stable framework. You will use online Edge TTS and lightweight CPU models.',
      trackBadge: 'Intel',
      trackTone: 'live',
      steps: [STEP_CLOUD, STEP_PIPER, STEP_MIC, STEP_SHORTCUTS],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: 'Piper was designed to run on modest CPUs. The first utterance takes under 1 second.' },
      ],
    }
  }

  if (ven === 'unknown' || !hw) {
    return {
      headline: 'Universal track (no dedicated GPU)',
      summary: 'Online Edge TTS covers everything. Piper can be installed for offline use on CPU.',
      trackBadge: 'CPU',
      trackTone: 'live',
      steps: [STEP_CLOUD, STEP_PIPER, STEP_MIC, STEP_SHORTCUTS],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: 'Detected your machine as CPU tier. Advanced tracks require an NVIDIA GPU with CUDA.' },
      ],
    }
  }

  // NVIDIA without CUDA
  return {
    headline: 'NVIDIA detected — no CUDA',
    summary: 'The GPU is present, but the CUDA Toolkit was not found. Use the CPU+cloud track for now; install CUDA later to unlock cloning.',
    trackBadge: 'NVIDIA',
    trackTone: 'warn',
    steps: [STEP_CLOUD, STEP_PIPER, STEP_KOKORO, STEP_MIC, STEP_SHORTCUTS],
    advancedAvailable: false,
    notes: [
      { tone: 'warn', text: 'Install CUDA Toolkit 11.8+ and reopen the app to enable XTTS and cloning.' },
    ],
  }
}
