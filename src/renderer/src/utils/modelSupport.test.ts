import { describe, expect, it } from 'vitest'
import type { HardwareInfo, ModelInfo } from '../../../shared/types'
import {
  getCloneCapability,
  getVisibleInstalledModels,
  getRecommendedSetup,
  isModelVisibleInMvp,
  resolveActiveModelForMvp,
} from './modelSupport'

const baseHardware: HardwareInfo = {
  cpu: 'CPU',
  cpuCores: 8,
  cpuThreads: 16,
  ramGB: 16,
  gpu: 'GPU',
  gpuVRAM: 8192,
  gpuVendor: 'nvidia',
  os: 'win32',
  osVersion: 'Windows 11',
  isCudaAvailable: true,
  cudaVersion: '12.4',
  isRocmAvailable: false,
  rocmVersion: '',
  isDirectMLAvailable: false,
  recommendedTier: 'mid',
}

const model = (id: string): ModelInfo => ({
  id,
  name: id,
  description: id,
  languages: ['pt-BR'],
  ptBr: true,
  mos: 4,
  vramMinMB: 0,
  cpuOk: true,
  cloning: id === 'xtts_v2',
  license: 'MIT',
  sizeMB: 1,
  downloadUrl: 'https://example.com/model.bin',
  filename: 'model.bin',
  tags: [],
  installed: true,
})

describe('modelSupport MVP policy', () => {
  it('shows only stable models by default on AMD setups', () => {
    const amdHardware = { ...baseHardware, gpuVendor: 'amd', isCudaAvailable: false }

    expect(isModelVisibleInMvp(model('piper'), amdHardware, false)).toBe(true)
    expect(isModelVisibleInMvp(model('kokoro'), amdHardware, false)).toBe(true)
    expect(isModelVisibleInMvp(model('xtts_v2'), amdHardware, false)).toBe(false)
    expect(isModelVisibleInMvp(model('melotts'), amdHardware, false)).toBe(false)
  })

  it('allows XTTS v2 as advanced only on NVIDIA CUDA setups', () => {
    expect(isModelVisibleInMvp(model('xtts_v2'), baseHardware, false)).toBe(true)

    const cpuHardware = { ...baseHardware, gpuVendor: 'unknown', isCudaAvailable: false }
    expect(isModelVisibleInMvp(model('xtts_v2'), cpuHardware, false)).toBe(false)
  })

  it('recommends Piper first for the local MVP setup', () => {
    const recommendation = getRecommendedSetup(baseHardware)
    expect(recommendation.primaryModelId).toBe('piper')
    expect(recommendation.secondaryModelId).toBe('kokoro')
    expect(recommendation.advancedModelId).toBe('xtts_v2')
  })

  it('blocks cloning when CUDA is not available', () => {
    const cpuHardware = { ...baseHardware, gpuVendor: 'amd', isCudaAvailable: false }
    expect(getCloneCapability(cpuHardware)).toEqual({
      enabled: false,
      reason: 'A clonagem prática do MVP requer NVIDIA com CUDA validado.',
    })
  })

  it('resolves the preferred active model only from visible installed models', () => {
    const cpuHardware = { ...baseHardware, gpuVendor: 'amd', isCudaAvailable: false }
    const registry = [model('xtts_v2'), model('kokoro'), model('piper')]

    const active = resolveActiveModelForMvp(registry, cpuHardware, 'xtts_v2', false)

    expect(active?.id).toBe('kokoro')
  })

  it('returns null when no visible installed model is available', () => {
    const cpuHardware = { ...baseHardware, gpuVendor: 'amd', isCudaAvailable: false }
    const registry = [
      { ...model('xtts_v2'), installed: false },
      { ...model('melotts'), installed: true },
    ]

    expect(resolveActiveModelForMvp(registry, cpuHardware, 'xtts_v2', false)).toBeNull()
    expect(getVisibleInstalledModels(registry, cpuHardware, false)).toEqual([])
  })
})
