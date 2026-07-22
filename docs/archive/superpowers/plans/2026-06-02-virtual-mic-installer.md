# Virtual Mic Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a simple in-launcher flow that opens the bundled VB-Cable installer, guides the user through verification, and restores the normal virtual mic toggle when VB-Cable is detected.

**Architecture:** Keep driver installation in the Electron main IPC that already launches the official bundled installer. Add renderer-only helpers for VB-Cable detection/result state, a reusable setup panel, and wire that panel into `SettingsPage` and `TTSPage`. The launcher will not download the installer or attempt silent driver installation.

**Tech Stack:** Electron IPC, React 19, TypeScript strict, Zustand, Vitest, lucide-react.

---

## File Structure

- Create: `src/renderer/src/utils/virtualMicSetup.ts`
  - Pure helper functions and types for detecting VB-Cable and translating install IPC results into UI state.
- Create: `src/renderer/src/utils/virtualMicSetup.test.ts`
  - Unit tests for detection and install-result state.
- Create: `src/renderer/src/components/VirtualMicSetupPanel.tsx`
  - Reusable presentational panel for missing, installer-open, manual-download, error, and detected states.
- Create: `src/renderer/src/components/VirtualMicSetupPanel.test.tsx`
  - React-element tests for panel text and button callbacks without adding a new testing library.
- Modify: `src/renderer/src/pages/SettingsPage.tsx`
  - Replace the current ad hoc VB-Cable warning/success block with the reusable panel and install/verify state.
- Modify: `src/renderer/src/pages/TTSPage.tsx`
  - Show `Instalar microfone virtual` when VB-Cable is missing; show the normal toggle only when detected.
- Modify: `docs/VIRTUAL_MIC.md`
  - Document the launcher-based installation and verification flow.
- Modify: `assets/vbcable/README.md`
  - Align the asset instructions with the new button text.

---

### Task 1: Virtual Mic Setup Helpers

**Files:**
- Create: `src/renderer/src/utils/virtualMicSetup.test.ts`
- Create: `src/renderer/src/utils/virtualMicSetup.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `src/renderer/src/utils/virtualMicSetup.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AudioDevice } from '../../../shared/types'
import {
  detectVBCable,
  resolveVBCableInstallState,
  type VBCableInstallResult,
} from './virtualMicSetup'

function device(name: string): AudioDevice {
  return {
    id: name,
    name,
    isInput: false,
    isDefault: false,
  }
}

describe('detectVBCable', () => {
  it('detects VB-Cable devices case-insensitively', () => {
    expect(detectVBCable([
      device('CABLE Output (VB-Audio Virtual Cable)'),
      device('Realtek Speakers'),
    ])).toBe(true)
  })

  it('returns false when no cable device exists', () => {
    expect(detectVBCable([
      device('Realtek Speakers'),
      device('Microphone Array'),
    ])).toBe(false)
  })

  it('handles empty device lists', () => {
    expect(detectVBCable([])).toBe(false)
  })
})

describe('resolveVBCableInstallState', () => {
  it('maps a launched bundled installer to the launched state', () => {
    const result: VBCableInstallResult = { success: true, launched: true }

    expect(resolveVBCableInstallState(result)).toEqual({
      state: 'launched',
      message: 'Instalador aberto. Siga o VB-Cable e reinicie o Windows se ele pedir.',
    })
  })

  it('maps a missing bundled installer to the manual state', () => {
    const result: VBCableInstallResult = {
      success: true,
      launched: false,
      message: 'Site oficial aberto.',
    }

    expect(resolveVBCableInstallState(result)).toEqual({
      state: 'manual',
      message: 'Site oficial aberto.',
    })
  })

  it('maps launch failures to the error state', () => {
    const result: VBCableInstallResult = {
      success: false,
      error: 'spawn failed',
    }

    expect(resolveVBCableInstallState(result)).toEqual({
      state: 'error',
      message: 'spawn failed',
    })
  })
})
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run:

```powershell
npm.cmd test -- src/renderer/src/utils/virtualMicSetup.test.ts
```

Expected: `FAIL` because `src/renderer/src/utils/virtualMicSetup.ts` does not exist.

- [ ] **Step 3: Write the minimal helper implementation**

Create `src/renderer/src/utils/virtualMicSetup.ts`:

```ts
import type { AudioDevice } from '../../../shared/types'

export type VBCableInstallState = 'idle' | 'launching' | 'launched' | 'manual' | 'error'

export interface VBCableInstallResult {
  success: boolean
  launched?: boolean
  message?: string
  error?: string
}

export interface VBCableInstallResolution {
  state: Exclude<VBCableInstallState, 'idle' | 'launching'>
  message: string
}

export function detectVBCable(devices: Array<Pick<AudioDevice, 'name'>>): boolean {
  return devices.some((device) => device.name.toLowerCase().includes('cable'))
}

export function resolveVBCableInstallState(result: VBCableInstallResult): VBCableInstallResolution {
  if (result.success && result.launched) {
    return {
      state: 'launched',
      message: 'Instalador aberto. Siga o VB-Cable e reinicie o Windows se ele pedir.',
    }
  }

  if (result.success) {
    return {
      state: 'manual',
      message: result.message || 'Este pacote nao trouxe o instalador embutido. Baixe o VB-Cable pelo site oficial e volte para verificar.',
    }
  }

  return {
    state: 'error',
    message: result.error || 'Nao foi possivel abrir o instalador do VB-Cable.',
  }
}
```

- [ ] **Step 4: Run the helper tests to verify they pass**

Run:

```powershell
npm.cmd test -- src/renderer/src/utils/virtualMicSetup.test.ts
```

Expected: `PASS`.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add src/renderer/src/utils/virtualMicSetup.ts src/renderer/src/utils/virtualMicSetup.test.ts
git commit -m "feat: add virtual mic setup helpers"
```

---

### Task 2: Reusable Virtual Mic Setup Panel

**Files:**
- Create: `src/renderer/src/components/VirtualMicSetupPanel.test.tsx`
- Create: `src/renderer/src/components/VirtualMicSetupPanel.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `src/renderer/src/components/VirtualMicSetupPanel.test.tsx`:

```tsx
import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import VirtualMicSetupPanel from './VirtualMicSetupPanel'

interface ButtonProps {
  onClick?: () => void
  children?: ReactNode
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (React.isValidElement<{ children?: ReactNode }>(node)) {
    if (typeof node.type === 'function') {
      return textOf((node.type as (props: Record<string, unknown>) => ReactNode)(node.props as Record<string, unknown>))
    }
    return textOf(node.props.children)
  }
  return ''
}

function findButtonByText(node: ReactNode, label: string): ReactElement<ButtonProps> | null {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (typeof node === 'string' || typeof node === 'number') return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButtonByText(child, label)
      if (found) return found
    }
    return null
  }
  if (!React.isValidElement<ButtonProps>(node)) return null
  if (typeof node.type === 'function') {
    return findButtonByText((node.type as (props: Record<string, unknown>) => ReactNode)(node.props as Record<string, unknown>), label)
  }
  if (node.type === 'button' && textOf(node).includes(label)) return node
  return findButtonByText(node.props.children, label)
}

describe('VirtualMicSetupPanel', () => {
  it('shows an install action when VB-Cable is missing', () => {
    const onInstall = vi.fn()

    const element = (
      <VirtualMicSetupPanel
        detected={false}
        installState="idle"
        onInstall={onInstall}
        onVerify={vi.fn()}
      />
    )

    expect(textOf(element)).toContain('Microfone virtual nao instalado')
    const button = findButtonByText(element, 'Instalar microfone virtual')
    expect(button).not.toBeNull()

    button?.props.onClick?.()
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('shows verification guidance after the bundled installer launches', () => {
    const onVerify = vi.fn()

    const element = (
      <VirtualMicSetupPanel
        detected={false}
        installState="launched"
        message="Instalador aberto. Se ele pedir, reinicie o Windows."
        onInstall={vi.fn()}
        onVerify={onVerify}
      />
    )

    expect(textOf(element)).toContain('Instalador aberto')
    expect(textOf(element)).toContain('reinicie')
    const button = findButtonByText(element, 'Verificar instalacao')
    expect(button).not.toBeNull()

    button?.props.onClick?.()
    expect(onVerify).toHaveBeenCalledTimes(1)
  })

  it('shows manual download guidance when no bundled installer exists', () => {
    const element = (
      <VirtualMicSetupPanel
        detected={false}
        installState="manual"
        message="Site oficial aberto."
        onInstall={vi.fn()}
        onVerify={vi.fn()}
      />
    )

    expect(textOf(element)).toContain('Site oficial aberto')
    expect(textOf(element)).toContain('Verificar instalacao')
  })

  it('shows the normal activation action when VB-Cable is detected', () => {
    const onActivate = vi.fn()

    const element = (
      <VirtualMicSetupPanel
        detected
        installState="idle"
        onInstall={vi.fn()}
        onVerify={vi.fn()}
        onActivate={onActivate}
      />
    )

    expect(textOf(element)).toContain('VB-Cable detectado')
    const button = findButtonByText(element, 'Ativar microfone virtual')
    expect(button).not.toBeNull()

    button?.props.onClick?.()
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the component tests to verify they fail**

Run:

```powershell
npm.cmd test -- src/renderer/src/components/VirtualMicSetupPanel.test.tsx
```

Expected: `FAIL` because `src/renderer/src/components/VirtualMicSetupPanel.tsx` does not exist.

- [ ] **Step 3: Write the minimal panel implementation**

Create `src/renderer/src/components/VirtualMicSetupPanel.tsx`:

```tsx
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Mic,
  RefreshCw,
  Wrench,
} from 'lucide-react'
import type { VBCableInstallState } from '../utils/virtualMicSetup'

interface VirtualMicSetupPanelProps {
  detected: boolean
  installState: VBCableInstallState
  message?: string
  installing?: boolean
  compact?: boolean
  onInstall: () => void
  onVerify: () => void
  onOpenSettings?: () => void
  onActivate?: () => void
}

export default function VirtualMicSetupPanel({
  detected,
  installState,
  message,
  installing = false,
  compact = false,
  onInstall,
  onVerify,
  onOpenSettings,
  onActivate,
}: VirtualMicSetupPanelProps) {
  if (detected) {
    return (
      <div
        className={`hud-frame ${compact ? 'p-3' : 'p-4'} flex items-start gap-3`}
        style={{ background: 'var(--vl-state-success-bg)', border: '1px solid var(--vl-state-success-border)' }}
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: 'var(--vl-state-success)' }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--vl-state-success-text)' }}>VB-Cable detectado</p>
          <p className="mt-1 text-sm text-ink-body">
            No Discord, Zoom ou jogo, selecione CABLE Output como microfone.
          </p>
          {onActivate && (
            <button onClick={onActivate} className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
              <Mic className="h-4 w-4" />
              Ativar microfone virtual
            </button>
          )}
        </div>
      </div>
    )
  }

  const isLaunched = installState === 'launched'
  const isManual = installState === 'manual'
  const isError = installState === 'error'
  const title = isLaunched
    ? 'Instalador aberto'
    : isManual
      ? 'Instalacao manual necessaria'
      : isError
        ? 'Falha ao abrir instalador'
        : 'Microfone virtual nao instalado'
  const body = message || (isLaunched
    ? 'Siga o instalador do VB-Cable. Se ele pedir, reinicie o Windows e volte aqui.'
    : isManual
      ? 'Este pacote nao trouxe o instalador embutido. Baixe o VB-Cable pelo site oficial e volte para verificar.'
      : isError
        ? 'Use o site oficial ou verifique se o arquivo esta no pacote.'
        : 'Necessario para Discord, Zoom e jogos ouvirem a voz como microfone.')

  return (
    <div
      className={`hud-frame ${compact ? 'p-3' : 'p-4'} flex items-start gap-3`}
      style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: 'var(--vl-state-warn)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--vl-state-warn-text)' }}>{title}</p>
        <p className="mt-1 text-sm text-ink-body">{body}</p>
        <p className="mt-2 text-xs text-ink-soft">
          VB-Cable da VB-Audio e donationware. O instalador oficial pode pedir permissao de administrador e reinicio.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(installState === 'idle' || installState === 'error') && (
            <button
              onClick={onInstall}
              disabled={installing}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Wrench className="h-4 w-4" />
              {installing ? 'Abrindo instalador...' : 'Instalar microfone virtual'}
            </button>
          )}
          {(isLaunched || isManual || isError) && (
            <button onClick={onVerify} className="btn-secondary inline-flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4" />
              Verificar instalacao
            </button>
          )}
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="btn-secondary inline-flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4" />
              Abrir Ajustes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the component tests to verify they pass**

Run:

```powershell
npm.cmd test -- src/renderer/src/components/VirtualMicSetupPanel.test.tsx
```

Expected: `PASS`.

- [ ] **Step 5: Commit Task 2**

Run:

```powershell
git add src/renderer/src/components/VirtualMicSetupPanel.tsx src/renderer/src/components/VirtualMicSetupPanel.test.tsx
git commit -m "feat: add virtual mic setup panel"
```

---

### Task 3: Wire the Panel into Settings

**Files:**
- Modify: `src/renderer/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Extend imports**

Modify imports in `src/renderer/src/pages/SettingsPage.tsx`.

Remove unused imports after the old manual panel is deleted:

```ts
AlertTriangle,
ExternalLink,
Info,
Wrench,
```

Add:

```ts
import VirtualMicSetupPanel from '../components/VirtualMicSetupPanel'
import {
  detectVBCable,
  resolveVBCableInstallState,
  type VBCableInstallState,
} from '../utils/virtualMicSetup'
```

- [ ] **Step 2: Add install state**

Near the existing VB-Cable state in `SettingsPage`, add:

```ts
const [installState, setInstallState] = useState<VBCableInstallState>('idle')
const [installMessage, setInstallMessage] = useState<string | undefined>(undefined)
const [installing, setInstalling] = useState(false)
```

- [ ] **Step 3: Update device loading to use the helper**

Replace the existing `loadAudioDevices` body with:

```ts
const loadAudioDevices = async () => {
  try {
    const devices = await window.electronAPI.listAudioDevices()
    setAudioDevices(devices)
    const hasVbCable = detectVBCable(devices)
    setVbCableInstalled(hasVbCable)
    if (hasVbCable) {
      setInstallState('idle')
      setInstallMessage(undefined)
    }
  } catch {
    setAudioDevices([])
    setVbCableInstalled(false)
    setInstallState('error')
    setInstallMessage('Nao consegui verificar os dispositivos agora. Reinicie o backend ou tente novamente.')
  }
}
```

- [ ] **Step 4: Add install and verify handlers**

Add these functions below `restartBackend`:

```ts
const installVirtualMic = async () => {
  setInstalling(true)
  setInstallState('launching')
  setInstallMessage(undefined)
  try {
    const result = await window.electronAPI.installVBCable()
    const resolved = resolveVBCableInstallState(result)
    setInstallState(resolved.state)
    setInstallMessage(resolved.message)
    if (resolved.state === 'launched') {
      toast('Instalador aberto', 'Siga o instalador do VB-Cable. Depois clique em Verificar instalacao.', 'success')
    } else if (resolved.state === 'manual') {
      toast('Download manual', resolved.message, 'info')
    } else {
      toast('Erro', resolved.message, 'error')
    }
  } finally {
    setInstalling(false)
  }
}

const verifyVirtualMic = async () => {
  await loadAudioDevices()
  const devices = await window.electronAPI.listAudioDevices()
  const detected = detectVBCable(devices)
  if (detected) {
    setAudioDevices(devices)
    setVbCableInstalled(true)
    setInstallState('idle')
    setInstallMessage(undefined)
    toast('VB-Cable detectado', 'Agora selecione CABLE Output como microfone no Discord, Zoom ou jogo.', 'success')
  } else {
    toast('Microfone virtual ausente', 'Se o instalador terminou, reinicie o Windows e clique em Verificar instalacao.', 'warning')
  }
}
```

- [ ] **Step 5: Replace the old warning/success block**

Inside the `Microfone Virtual` card, replace the whole conditional block starting at:

```tsx
{!vbCableInstalled ? (
```

and ending before:

```tsx
<div className="mt-4 space-y-3">
```

with:

```tsx
<VirtualMicSetupPanel
  detected={vbCableInstalled}
  installState={installState}
  message={installMessage}
  installing={installing}
  onInstall={() => void installVirtualMic()}
  onVerify={() => void verifyVirtualMic()}
/>
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npm.cmd test -- src/renderer/src/utils/virtualMicSetup.test.ts src/renderer/src/components/VirtualMicSetupPanel.test.tsx
```

Expected: `PASS`.

- [ ] **Step 7: Run type-check**

Run:

```powershell
npm.cmd run type-check
```

Expected: `PASS`.

- [ ] **Step 8: Commit Task 3**

Run:

```powershell
git add src/renderer/src/pages/SettingsPage.tsx
git commit -m "feat: guide virtual mic install in settings"
```

---

### Task 4: Add the Install CTA to the Falar Page

**Files:**
- Modify: `src/renderer/src/pages/TTSPage.tsx`

- [ ] **Step 1: Extend imports**

In `src/renderer/src/pages/TTSPage.tsx`, add `Wrench` to the lucide import list:

```ts
Wrench,
```

Add component/helper imports:

```ts
import VirtualMicSetupPanel from '../components/VirtualMicSetupPanel'
import {
  detectVBCable,
  resolveVBCableInstallState,
  type VBCableInstallState,
} from '../utils/virtualMicSetup'
```

- [ ] **Step 2: Add VB-Cable install state**

Near the existing `virtualMicEnabled` state, add:

```ts
const [vbCableDetected, setVbCableDetected] = useState(false)
const [micInstallState, setMicInstallState] = useState<VBCableInstallState>('idle')
const [micInstallMessage, setMicInstallMessage] = useState<string | undefined>(undefined)
const [installingMic, setInstallingMic] = useState(false)
```

- [ ] **Step 3: Add device refresh logic**

Add this function near `loadRuntimeState`:

```ts
const loadMicDevices = async () => {
  try {
    const devices = await window.electronAPI.listAudioDevices()
    const detected = detectVBCable(devices)
    setVbCableDetected(detected)
    if (detected) {
      setMicInstallState('idle')
      setMicInstallMessage(undefined)
    }
    return detected
  } catch {
    setVbCableDetected(false)
    setMicInstallState('error')
    setMicInstallMessage('Nao consegui verificar os dispositivos agora. Reinicie o backend ou tente novamente.')
    return false
  }
}
```

In the first `useEffect`, after `getVirtualMicStatus()`, call:

```ts
void loadMicDevices()
```

- [ ] **Step 4: Add install and verify handlers**

Add these functions before `toggleVirtualMic`:

```ts
const installVirtualMic = async () => {
  setInstallingMic(true)
  setMicInstallState('launching')
  setMicInstallMessage(undefined)
  try {
    const result = await window.electronAPI.installVBCable()
    const resolved = resolveVBCableInstallState(result)
    setMicInstallState(resolved.state)
    setMicInstallMessage(resolved.message)
    if (resolved.state === 'launched') {
      toast('Instalador aberto', 'Siga o instalador do VB-Cable. Depois clique em Verificar instalacao.', 'success')
    } else if (resolved.state === 'manual') {
      toast('Download manual', resolved.message, 'info')
    } else {
      toast('Erro', resolved.message, 'error')
    }
  } finally {
    setInstallingMic(false)
  }
}

const verifyVirtualMic = async () => {
  const detected = await loadMicDevices()
  if (detected) {
    toast('VB-Cable detectado', 'Agora voce pode ativar o microfone virtual.', 'success')
  } else {
    toast('Microfone virtual ausente', 'Se o instalador terminou, reinicie o Windows e clique em Verificar instalacao.', 'warning')
  }
}
```

- [ ] **Step 5: Guard the toggle when VB-Cable is missing**

At the start of `toggleVirtualMic`, add:

```ts
if (!vbCableDetected) {
  await installVirtualMic()
  return
}
```

- [ ] **Step 6: Replace the header virtual mic button with detected/missing variants**

Replace the existing header button:

```tsx
<button
  onClick={toggleVirtualMic}
  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all ${
    virtualMicEnabled ? 'status-pill--live' : 'btn-secondary'
  }`}
  title="Envia a voz gerada como microfone virtual para outros aplicativos"
>
  <Mic className="h-4 w-4" />
  {virtualMicEnabled ? 'Microfone virtual ativo' : 'Ativar microfone virtual'}
</button>
```

with:

```tsx
{vbCableDetected ? (
  <button
    onClick={toggleVirtualMic}
    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all ${
      virtualMicEnabled ? 'status-pill--live' : 'btn-secondary'
    }`}
    title="Envia a voz gerada como microfone virtual para outros aplicativos"
  >
    <Mic className="h-4 w-4" />
    {virtualMicEnabled ? 'Microfone virtual ativo' : 'Ativar microfone virtual'}
  </button>
) : (
  <button
    onClick={() => void installVirtualMic()}
    disabled={installingMic}
    className="btn-primary inline-flex items-center gap-2 text-sm"
    title="Instala o VB-Cable para Discord, Zoom e jogos ouvirem a voz como microfone"
  >
    <Wrench className="h-4 w-4" />
    {installingMic ? 'Abrindo instalador...' : 'Instalar microfone virtual'}
  </button>
)}
```

- [ ] **Step 7: Show the follow-up panel after install/manual/error states**

After `DiscordReadyBanner`, add:

```tsx
{!vbCableDetected && micInstallState !== 'idle' && (
  <div className="mb-4">
    <VirtualMicSetupPanel
      detected={false}
      installState={micInstallState}
      message={micInstallMessage}
      installing={installingMic}
      compact
      onInstall={() => void installVirtualMic()}
      onVerify={() => void verifyVirtualMic()}
      onOpenSettings={() => {
        window.location.hash = '#/settings'
      }}
    />
  </div>
)}
```

- [ ] **Step 8: Run focused tests**

Run:

```powershell
npm.cmd test -- src/renderer/src/utils/virtualMicSetup.test.ts src/renderer/src/components/VirtualMicSetupPanel.test.tsx
```

Expected: `PASS`.

- [ ] **Step 9: Run type-check**

Run:

```powershell
npm.cmd run type-check
```

Expected: `PASS`.

- [ ] **Step 10: Commit Task 4**

Run:

```powershell
git add src/renderer/src/pages/TTSPage.tsx
git commit -m "feat: surface virtual mic install in speak flow"
```

---

### Task 5: Update Virtual Mic Documentation

**Files:**
- Modify: `docs/VIRTUAL_MIC.md`
- Modify: `assets/vbcable/README.md`

- [ ] **Step 1: Update the app installation section**

In `docs/VIRTUAL_MIC.md`, replace the `### Pelo app` section with:

```md
### Pelo app

1. Abra a tela **Falar**.
2. Se o VB-Cable nao for detectado, clique em **Instalar microfone virtual**.
3. O launcher abre o instalador oficial embutido do VB-Cable, quando ele estiver presente no pacote.
4. Siga o instalador. Ele pode pedir permissao de administrador e reinicio do Windows.
5. Volte ao VoiceLaunch TTS e clique em **Verificar instalacao**.
6. Quando o app mostrar **VB-Cable detectado**, clique em **Ativar microfone virtual**.

Se o instalador embutido nao estiver no pacote, o launcher abre o site oficial para download manual.
```

- [ ] **Step 2: Update the asset README button name**

In `assets/vbcable/README.md`, replace:

```md
pelo usuário através do botão "Instalar Automaticamente" em Configurações > Microfone Virtual.
```

with:

```md
pelo usuario atraves do botao "Instalar microfone virtual" na tela Falar ou em Configuracoes > Microfone Virtual.
```

- [ ] **Step 3: Commit Task 5**

Run:

```powershell
git add docs/VIRTUAL_MIC.md assets/vbcable/README.md
git commit -m "docs: explain launcher virtual mic install"
```

---

### Task 6: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run all TypeScript tests**

Run:

```powershell
npm.cmd test
```

Expected: all Vitest suites pass.

- [ ] **Step 2: Run type-check**

Run:

```powershell
npm.cmd run type-check
```

Expected: `tsc --noEmit` completes without errors.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: Electron/Vite build completes successfully.

- [ ] **Step 4: Start the dev launcher for manual verification**

Run:

```powershell
Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev') -WorkingDirectory 'E:\sound_voice' -WindowStyle Hidden -RedirectStandardOutput 'E:\sound_voice\.codex-dev.out.log' -RedirectStandardError 'E:\sound_voice\.codex-dev.err.log' -PassThru
```

Expected: renderer starts at `http://localhost:5173/` and Electron opens.

- [ ] **Step 5: Manual UI checks**

Check these states:

- With no VB-Cable detected, `Falar` shows `Instalar microfone virtual`.
- Clicking it opens or attempts the bundled installer and shows `Instalador aberto` or manual fallback text.
- `Verificar instalacao` shows a warning when VB-Cable is still missing.
- `Ajustes > Microfone Virtual` shows the same install/verify status.
- With VB-Cable detected, the `Falar` page shows `Ativar microfone virtual`.

- [ ] **Step 6: Final status check**

Run:

```powershell
git status --short
```

Expected: no unexpected files. Pre-existing unrelated edits to `package.json` and `package-lock.json` may remain if they were not part of this work.
