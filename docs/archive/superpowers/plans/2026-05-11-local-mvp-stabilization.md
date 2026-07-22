# Local MVP Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o MVP local do VoiceLaunch TTS com um fluxo estável e honesto para uso final, priorizando `Piper` e `Kokoro`, expondo `XTTS v2` apenas como recurso avançado prático em NVIDIA/CUDA e escondendo recursos experimentais por padrão.

**Architecture:** A matriz de suporte passa a ser uma política explícita no renderer, centralizada em um helper tipado e testado. A UI usa essa política para filtrar modelos, ajustar recomendações de hardware, bloquear clonagem não prática e orientar o primeiro uso com um checklist até a primeira fala local.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Electron IPC, asset registry JSON.

---

### Task 1: Centralizar a matriz de suporte do MVP

**Files:**
- Create: `src/renderer/src/utils/modelSupport.ts`
- Create: `src/renderer/src/utils/modelSupport.test.ts`
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import type { HardwareInfo, ModelInfo } from '../../../shared/types'
import {
  getCloneCapability,
  getRecommendedSetup,
  isModelVisibleInMvp,
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npm run test -- src/renderer/src/utils/modelSupport.test.ts`
Expected: FAIL because `src/renderer/src/utils/modelSupport.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
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

export function isModelVisibleInMvp(model: ModelInfo, hardware: HardwareInfo | null, showExperimental: boolean): boolean {
  const level = getModelLevel(model.id)
  if (level === 'stable') return true
  if (level === 'experimental') return showExperimental
  return Boolean(hardware?.isCudaAvailable)
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
    summary: 'Comece com Piper para garantir a primeira fala local sem atrito.',
    gpuNote: hardware?.isCudaAvailable
      ? 'XTTS v2 pode ser habilitado depois como recurso avançado em NVIDIA/CUDA.'
      : 'O caminho garantido do MVP local é Piper e Kokoro.',
  }
}

export function getCloneCapability(hardware: HardwareInfo | null): { enabled: boolean; reason?: string } {
  if (hardware?.isCudaAvailable) {
    return { enabled: true }
  }
  return {
    enabled: false,
    reason: 'A clonagem prática do MVP requer NVIDIA com CUDA validado.',
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cmd /c npm run test -- src/renderer/src/utils/modelSupport.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/renderer/src/utils/modelSupport.ts src/renderer/src/utils/modelSupport.test.ts
git commit -m "feat: codify local mvp model support policy"
```

### Task 2: Aplicar a política do MVP na UI principal

**Files:**
- Create: `src/renderer/src/components/LocalSetupCard.tsx`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/pages/DashboardPage.tsx`
- Modify: `src/renderer/src/pages/ModelsPage.tsx`
- Modify: `src/renderer/src/pages/TTSPage.tsx`
- Modify: `src/renderer/src/pages/ClonePage.tsx`
- Modify: `src/renderer/src/pages/SettingsPage.tsx`
- Modify: `src/renderer/src/components/OnboardingTutorial.tsx`
- Modify: `src/renderer/src/stores/appStore.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { getCloneCapability, getRecommendedSetup } from '../utils/modelSupport'

describe('local MVP messaging', () => {
  it('keeps the first-run path centered on Piper and Kokoro', () => {
    const recommendation = getRecommendedSetup(null)
    expect(recommendation.summary).toContain('Piper')
    expect(recommendation.gpuNote).toContain('Piper e Kokoro')
  })

  it('marks cloning as unavailable without CUDA', () => {
    expect(getCloneCapability(null).enabled).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npm run test -- src/renderer/src/utils/modelSupport.test.ts`
Expected: FAIL if the helper text does not yet match the intended UX copy.

- [ ] **Step 3: Write minimal implementation**

```tsx
// LocalSetupCard.tsx
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { HardwareInfo, ModelInfo } from '../../../shared/types'
import { getRecommendedSetup, isModelVisibleInMvp } from '../utils/modelSupport'

export default function LocalSetupCard() {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])

  useEffect(() => {
    window.electronAPI.getHardwareInfo().then(setHardware)
    window.electronAPI.getModelRegistry().then(setModels)
  }, [])

  const recommendation = getRecommendedSetup(hardware)
  const recommendedModel = models.find((model) => model.id === recommendation.primaryModelId)
  const visibleModels = models.filter((model) => isModelVisibleInMvp(model, hardware, false))

  return (
    <div className="glass-panel p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">Setup local recomendado</h2>
      <p className="text-slate-300">{recommendation.summary}</p>
      <p className="text-sm text-slate-400">{recommendation.gpuNote}</p>
      <p className="text-sm text-slate-500">
        Modelos visíveis no MVP: {visibleModels.map((model) => model.name).join(', ')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link to="/dashboard" className="btn-secondary">Ver hardware</Link>
        <Link to="/models" className="btn-secondary">
          {recommendedModel?.installed ? 'Gerenciar modelos' : 'Instalar Piper'}
        </Link>
        <Link to="/tts" className="btn-primary">Abrir Falar</Link>
      </div>
    </div>
  )
}
```

```ts
// appStore.ts
showExperimentalModels: false,
setShowExperimentalModels: (value) => {
  set({ showExperimentalModels: value })
  saveToDisk({ showExperimentalModels: value })
},
```

```tsx
// ClonePage.tsx
const cloneCapability = getCloneCapability(hardware)
if (!cloneCapability.enabled) {
  return <div>{cloneCapability.reason}</div>
}
```

- [ ] **Step 4: Run UI/build verification**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/LocalSetupCard.tsx src/renderer/src/App.tsx src/renderer/src/pages/DashboardPage.tsx src/renderer/src/pages/ModelsPage.tsx src/renderer/src/pages/TTSPage.tsx src/renderer/src/pages/ClonePage.tsx src/renderer/src/pages/SettingsPage.tsx src/renderer/src/components/OnboardingTutorial.tsx src/renderer/src/stores/appStore.ts
git commit -m "feat: align ui with the local mvp support matrix"
```

### Task 3: Atualizar o posicionamento do produto para o MVP real

**Files:**
- Modify: `README.md`
- Modify: `codex.md`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('product copy for local MVP', () => {
  it('documents Piper and Kokoro as the stable local path', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf-8')
    expect(readme).toContain('Piper')
    expect(readme).toContain('Kokoro')
    expect(readme).toContain('XTTS v2 como recurso avançado')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npm run test -- src/main/__tests__/security.test.ts src/renderer/src/utils/modelSupport.test.ts`
Expected: FAIL because the README does not yet describe the narrowed MVP path.

- [ ] **Step 3: Write minimal implementation**

```md
## Caminho estável do MVP local

- Piper: primeira experiência recomendada, leve e confiável
- Kokoro: upgrade de qualidade ainda dentro do fluxo estável
- XTTS v2 como recurso avançado: recomendado apenas após validar NVIDIA/CUDA
- MeloTTS, Fish Speech e Bark: fora do caminho principal do MVP
```

- [ ] **Step 4: Run final verification**

Run: `cmd /c npm run test`
Expected: PASS

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md codex.md
git commit -m "docs: document the local mvp support path"
```
