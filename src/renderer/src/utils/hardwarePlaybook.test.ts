import { describe, expect, it } from 'vitest'
import type { HardwareInfo } from '../../../shared/types'
import { getHardwarePlaybook } from './hardwarePlaybook'

function makeHw(overrides: Partial<HardwareInfo> = {}): HardwareInfo {
  return {
    cpu: 'Intel i5',
    cpuCores: 4,
    cpuThreads: 8,
    ramGB: 16,
    gpu: 'Generic',
    gpuVRAM: 0,
    gpuVendor: 'unknown',
    os: 'Windows',
    osVersion: 'Windows 11',
    isCudaAvailable: false,
    cudaVersion: '',
    isRocmAvailable: false,
    rocmVersion: '',
    isDirectMLAvailable: false,
    recommendedTier: 'cpu',
    ...overrides,
  }
}

describe('getHardwarePlaybook', () => {
  it('returns NVIDIA + CUDA premium track when CUDA detected', () => {
    const playbook = getHardwarePlaybook(makeHw({ gpuVendor: 'nvidia', isCudaAvailable: true, cudaVersion: '12.1' }))
    expect(playbook.trackBadge).toBe('NVIDIA')
    expect(playbook.trackTone).toBe('success')
    expect(playbook.advancedAvailable).toBe(true)
    expect(playbook.steps.some((step) => step.action === 'install-xtts')).toBe(true)
  })

  it('returns NVIDIA without CUDA track with warning when CUDA missing', () => {
    const playbook = getHardwarePlaybook(makeHw({ gpuVendor: 'nvidia', isCudaAvailable: false }))
    expect(playbook.trackBadge).toBe('NVIDIA')
    expect(playbook.trackTone).toBe('warn')
    expect(playbook.advancedAvailable).toBe(false)
    expect(playbook.steps.some((step) => step.action === 'install-xtts')).toBe(false)
    expect(playbook.notes.some((note) => note.tone === 'warn')).toBe(true)
  })

  it('returns AMD CPU+cloud track without XTTS', () => {
    const playbook = getHardwarePlaybook(makeHw({ gpuVendor: 'amd', isCudaAvailable: false }))
    expect(playbook.trackBadge).toBe('AMD')
    expect(playbook.advancedAvailable).toBe(false)
    expect(playbook.steps.some((step) => step.action === 'install-xtts')).toBe(false)
    expect(playbook.steps[0].action).toBe('try-cloud')
  })

  it('returns Intel iGPU track', () => {
    const playbook = getHardwarePlaybook(makeHw({ gpuVendor: 'intel' }))
    expect(playbook.trackBadge).toBe('Intel')
    expect(playbook.advancedAvailable).toBe(false)
  })

  it('returns universal CPU track when hardware is null', () => {
    const playbook = getHardwarePlaybook(null)
    expect(playbook.trackBadge).toBe('CPU')
    expect(playbook.steps.some((step) => step.action === 'try-cloud')).toBe(true)
  })

  it('always starts with try-cloud as the first actionable step', () => {
    const scenarios: HardwareInfo[] = [
      makeHw({ gpuVendor: 'nvidia', isCudaAvailable: true }),
      makeHw({ gpuVendor: 'nvidia', isCudaAvailable: false }),
      makeHw({ gpuVendor: 'amd' }),
      makeHw({ gpuVendor: 'intel' }),
      makeHw({ gpuVendor: 'unknown' }),
    ]
    for (const hw of scenarios) {
      const playbook = getHardwarePlaybook(hw)
      expect(playbook.steps[0].action).toBe('try-cloud')
    }
  })
})
