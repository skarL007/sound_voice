import type { HardwareInfo } from '../../../shared/types'
import i18n from '../i18n'

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

const stepCloud = (): PlaybookStep => ({
  title: i18n.t('utils:playbook.steps.cloud.title'),
  description: i18n.t('utils:playbook.steps.cloud.description'),
  action: 'try-cloud',
  href: '#/',
  tone: 'live',
})

const stepPiper = (): PlaybookStep => ({
  title: i18n.t('utils:playbook.steps.piper.title'),
  description: i18n.t('utils:playbook.steps.piper.description'),
  action: 'install-piper',
  href: '#/settings',
  tone: 'ready',
})

const stepKokoro = (): PlaybookStep => ({
  title: i18n.t('utils:playbook.steps.kokoro.title'),
  description: i18n.t('utils:playbook.steps.kokoro.description'),
  action: 'install-kokoro',
  href: '#/settings',
  tone: 'ready',
})

const stepXtts = (): PlaybookStep => ({
  title: i18n.t('utils:playbook.steps.xtts.title'),
  description: i18n.t('utils:playbook.steps.xtts.description'),
  action: 'install-xtts',
  href: '#/settings',
  tone: 'ready',
})

const stepMic = (): PlaybookStep => ({
  title: i18n.t('utils:playbook.steps.mic.title'),
  description: i18n.t('utils:playbook.steps.mic.description'),
  action: 'setup-mic',
  href: '#/settings',
  tone: 'live',
})

const stepShortcuts = (): PlaybookStep => ({
  title: i18n.t('utils:playbook.steps.shortcuts.title'),
  description: i18n.t('utils:playbook.steps.shortcuts.description'),
  action: 'tour-shortcuts',
  href: '#/shortcuts',
  tone: 'ready',
})

export function getHardwarePlaybook(hw: HardwareInfo | null): HardwarePlaybook {
  const ven = vendor(hw)
  const cuda = Boolean(hw?.isCudaAvailable)

  if (ven === 'nvidia' && cuda) {
    return {
      headline: i18n.t('utils:playbook.nvidiaCuda.headline'),
      summary: i18n.t('utils:playbook.nvidiaCuda.summary'),
      trackBadge: 'NVIDIA',
      trackTone: 'success',
      steps: [stepCloud(), stepPiper(), stepKokoro(), stepXtts(), stepMic(), stepShortcuts()],
      advancedAvailable: true,
      notes: [
        { tone: 'info', text: i18n.t('utils:playbook.nvidiaCuda.note', { version: hw?.cudaVersion || i18n.t('utils:playbook.nvidiaCuda.cudaDetected') }) },
      ],
    }
  }

  if (ven === 'amd') {
    return {
      headline: i18n.t('utils:playbook.amd.headline'),
      summary: i18n.t('utils:playbook.amd.summary'),
      trackBadge: 'AMD',
      trackTone: 'live',
      steps: [stepCloud(), stepPiper(), stepKokoro(), stepMic(), stepShortcuts()],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: i18n.t('utils:playbook.amd.note1') },
        { tone: 'info', text: i18n.t('utils:playbook.amd.note2') },
      ],
    }
  }

  if (ven === 'intel') {
    return {
      headline: i18n.t('utils:playbook.intel.headline'),
      summary: i18n.t('utils:playbook.intel.summary'),
      trackBadge: 'Intel',
      trackTone: 'live',
      steps: [stepCloud(), stepPiper(), stepMic(), stepShortcuts()],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: i18n.t('utils:playbook.intel.note') },
      ],
    }
  }

  if (ven === 'unknown' || !hw) {
    return {
      headline: i18n.t('utils:playbook.cpu.headline'),
      summary: i18n.t('utils:playbook.cpu.summary'),
      trackBadge: 'CPU',
      trackTone: 'live',
      steps: [stepCloud(), stepPiper(), stepMic(), stepShortcuts()],
      advancedAvailable: false,
      notes: [
        { tone: 'info', text: i18n.t('utils:playbook.cpu.note') },
      ],
    }
  }

  // NVIDIA without CUDA
  return {
    headline: i18n.t('utils:playbook.nvidiaNoCuda.headline'),
    summary: i18n.t('utils:playbook.nvidiaNoCuda.summary'),
    trackBadge: 'NVIDIA',
    trackTone: 'warn',
    steps: [stepCloud(), stepPiper(), stepKokoro(), stepMic(), stepShortcuts()],
    advancedAvailable: false,
    notes: [
      { tone: 'warn', text: i18n.t('utils:playbook.nvidiaNoCuda.note') },
    ],
  }
}
