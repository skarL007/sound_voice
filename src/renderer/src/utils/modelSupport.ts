import type { HardwareInfo, ModelInfo } from '../../../shared/types'

export type MvpModelLevel = 'stable' | 'advanced' | 'experimental'

const MODEL_LEVELS: Record<string, MvpModelLevel> = {
  piper: 'stable',
  kokoro: 'stable',
  xtts_v2: 'advanced',
  melotts: 'experimental',
  fish_speech: 'experimental',
  bark: 'experimental',
}

export function getModelLevel(modelId: string): MvpModelLevel {
  return MODEL_LEVELS[modelId] || 'experimental'
}

export function isModelVisibleInMvp(
  model: ModelInfo,
  hardware: HardwareInfo | null,
  showExperimental: boolean,
): boolean {
  const level = getModelLevel(model.id)
  if (level === 'stable') return true
  if (level === 'experimental') return showExperimental
  return Boolean(hardware?.isCudaAvailable)
}

export function getVisibleInstalledModels(
  registry: ModelInfo[],
  hardware: HardwareInfo | null,
  showExperimental: boolean,
): ModelInfo[] {
  return registry.filter((model) => model.installed && isModelVisibleInMvp(model, hardware, showExperimental))
}

export function resolveActiveModelForMvp(
  registry: ModelInfo[],
  hardware: HardwareInfo | null,
  preferredModelId: string | undefined,
  showExperimental: boolean,
): ModelInfo | null {
  const visibleInstalledModels = getVisibleInstalledModels(registry, hardware, showExperimental)

  return visibleInstalledModels.find((model) => model.id === preferredModelId) ?? visibleInstalledModels[0] ?? null
}

export function getRecommendedSetup(hardware: HardwareInfo | null): {
  primaryModelId: string
  secondaryModelId: string
  advancedModelId?: string
  summary: string
  gpuNote: string
} {
  return {
    primaryModelId: 'piper',
    secondaryModelId: 'kokoro',
    advancedModelId: hardware?.isCudaAvailable ? 'xtts_v2' : undefined,
    summary: 'Start with Piper for a frictionless first local voice.',
    gpuNote: hardware?.isCudaAvailable
      ? 'XTTS v2 can be enabled later as an advanced feature on NVIDIA/CUDA.'
      : 'The reliable local path is Piper and Kokoro.',
  }
}

export function getCloneCapability(hardware: HardwareInfo | null): { enabled: boolean; reason?: string } {
  if (hardware?.isCudaAvailable) {
    return { enabled: true }
  }

  return {
    enabled: false,
    reason: 'Practical voice cloning requires NVIDIA with validated CUDA.',
  }
}
