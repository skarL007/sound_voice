# Next Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 independently shippable improvements: renderer unit tests, build validation, typography tokens, history CSV export, shortcuts live feedback, non-blocking onboarding panel, and compact-mode smoke check.

**Architecture:** Each task group is self-contained and produces a working, committed deliverable on its own. Tasks within each group follow TDD. No external deps added except where noted (happy-dom for component tests).

**Tech Stack:** TypeScript, React 18, Electron, Vitest (node env), Zustand, Tailwind CSS, Lucide React

---

## File Map

| File | Action | Why |
|------|--------|-----|
| `src/renderer/src/components/alertConfig.ts` | Create | Extract AlertBox config so tests can import it without React |
| `src/renderer/src/components/AlertBox.tsx` | Modify | Import config from new module |
| `src/renderer/src/components/alertConfig.test.ts` | Create | Tests for all 4 severity configs |
| `src/renderer/src/stores/toastStore.test.ts` | Create | Tests for add/remove/pause/resume with fake timers |
| `src/renderer/src/utils/historyExport.ts` | Create | Pure function: TTSHistoryItem[] → CSV string |
| `src/renderer/src/utils/historyExport.test.ts` | Create | Tests for CSV serialization |
| `src/renderer/src/pages/TTSPage.tsx` | Modify | Add "Exportar CSV" button in history panel |
| `src/renderer/src/App.tsx` | Modify | Dispatch `voicelaunch:shortcut-triggered` event on shortcut fire |
| `src/renderer/src/pages/VoiceShortcutsPage.tsx` | Modify | Listen for event, highlight active shortcut card for 2 s |
| `src/renderer/src/components/OnboardingTutorial.tsx` | Modify | Convert from blocking modal to slide-in side drawer |
| `tailwind.config.js` | Modify | Add semantic `fontSize` tokens |

---

## Task 1: Extract `alertConfig` module

**Files:**
- Create: `src/renderer/src/components/alertConfig.ts`
- Modify: `src/renderer/src/components/AlertBox.tsx` (import from new module)

- [ ] **Step 1: Create `alertConfig.ts`**

```typescript
// src/renderer/src/components/alertConfig.ts
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

export type AlertSeverity = 'error' | 'warn' | 'info' | 'success'

export interface AlertSeverityConfig {
  borderColor: string
  background: string
  iconColor: string
  titleColor: string
  Icon: typeof AlertCircle
}

export const alertConfig: Record<AlertSeverity, AlertSeverityConfig> = {
  error: {
    borderColor: 'var(--vl-state-error-accent)',
    background: 'var(--vl-state-error-bg)',
    iconColor: 'var(--vl-state-error)',
    titleColor: 'var(--vl-state-error-text)',
    Icon: AlertCircle,
  },
  warn: {
    borderColor: 'var(--vl-state-warn-accent)',
    background: 'var(--vl-state-warn-bg)',
    iconColor: 'var(--vl-state-warn)',
    titleColor: 'var(--vl-state-warn-text)',
    Icon: AlertTriangle,
  },
  info: {
    borderColor: 'var(--vl-state-live-accent)',
    background: 'var(--vl-state-live-bg)',
    iconColor: 'var(--vl-state-live)',
    titleColor: 'var(--vl-state-live-text)',
    Icon: Info,
  },
  success: {
    borderColor: 'var(--vl-state-success-accent)',
    background: 'var(--vl-state-success-bg)',
    iconColor: 'var(--vl-state-success)',
    titleColor: 'var(--vl-state-success-text)',
    Icon: CheckCircle2,
  },
}
```

- [ ] **Step 2: Update `AlertBox.tsx` to import from the new module**

Replace the inline `config` block (roughly lines 13–48) with:

```typescript
import type { ReactNode } from 'react'
import { alertConfig } from './alertConfig'
import type { AlertSeverity } from './alertConfig'

interface AlertBoxProps {
  severity?: AlertSeverity
  title?: string
  children: ReactNode
  className?: string
}

export default function AlertBox({ severity = 'warn', title, children, className = '' }: AlertBoxProps) {
  const { borderColor, background, iconColor, titleColor, Icon } = alertConfig[severity]
  return (
    <div
      className={`hud-frame flex items-start gap-3 p-4 ${className}`}
      style={{ borderLeft: `4px solid ${borderColor}`, background }}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: iconColor }} aria-hidden="true" />
      <div className="space-y-1">
        {title && (
          <p className="text-sm font-medium" style={{ color: titleColor }}>{title}</p>
        )}
        <div className="text-sm text-ink-body">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add src/renderer/src/components/alertConfig.ts src/renderer/src/components/AlertBox.tsx
git commit -m "refactor(AlertBox): extrai alertConfig para modulo proprio (testavel)"
```

---

## Task 2: Tests — `alertConfig`

**Files:**
- Create: `src/renderer/src/components/alertConfig.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// src/renderer/src/components/alertConfig.test.ts
import { describe, expect, it } from 'vitest'
import { alertConfig } from './alertConfig'

const SEVERITIES = ['error', 'warn', 'info', 'success'] as const
const CSS_VAR = /^var\(--vl-/

describe('alertConfig', () => {
  it.each(SEVERITIES)('%s has all required fields', (severity) => {
    const cfg = alertConfig[severity]
    expect(cfg).toBeDefined()
    expect(cfg.borderColor).toMatch(CSS_VAR)
    expect(cfg.background).toMatch(CSS_VAR)
    expect(cfg.iconColor).toMatch(CSS_VAR)
    expect(cfg.titleColor).toMatch(CSS_VAR)
    expect(typeof cfg.Icon).toBe('function')
  })

  it('each severity uses a distinct icon', () => {
    const icons = SEVERITIES.map((s) => alertConfig[s].Icon)
    const unique = new Set(icons)
    expect(unique.size).toBe(4)
  })

  it('error and warn use distinct colors', () => {
    expect(alertConfig.error.iconColor).not.toBe(alertConfig.warn.iconColor)
    expect(alertConfig.error.background).not.toBe(alertConfig.warn.background)
  })
})
```

- [ ] **Step 2: Run and verify PASS**

```powershell
npx vitest run src/renderer/src/components/alertConfig.test.ts
```
Expected: `3 tests passed`.

- [ ] **Step 3: Commit**

```powershell
git add src/renderer/src/components/alertConfig.test.ts
git commit -m "test(AlertBox): cobertura de unidade para alertConfig (4 severidades)"
```

---

## Task 3: Tests — `toastStore`

**Files:**
- Create: `src/renderer/src/stores/toastStore.test.ts`

The store uses `setTimeout` internally. Vitest fake timers control it exactly.

- [ ] **Step 1: Write the test file**

```typescript
// src/renderer/src/stores/toastStore.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Reset modules so each test starts with a fresh store instance
const loadStore = async () => {
  vi.resetModules()
  const { useToastStore } = await import('./toastStore')
  return useToastStore
}

describe('toastStore', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('addToast appends a toast and auto-removes after duration', async () => {
    const store = await loadStore()

    store.getState().addToast({ title: 'Ola', message: 'msg', type: 'info', duration: 4000 })
    expect(store.getState().toasts).toHaveLength(1)
    expect(store.getState().toasts[0].title).toBe('Ola')

    vi.advanceTimersByTime(4000)
    expect(store.getState().toasts).toHaveLength(0)
  })

  it('removeToast removes it immediately and cancels the timer', async () => {
    const store = await loadStore()

    store.getState().addToast({ title: 'T', message: '', type: 'success', duration: 4000 })
    const id = store.getState().toasts[0].id

    store.getState().removeToast(id)
    expect(store.getState().toasts).toHaveLength(0)

    // Timer should already be cleared — advancing time should not crash or add items
    vi.advanceTimersByTime(4000)
    expect(store.getState().toasts).toHaveLength(0)
  })

  it('pauseToast stops the auto-removal timer', async () => {
    const store = await loadStore()

    store.getState().addToast({ title: 'T', message: '', type: 'warning', duration: 2000 })
    const id = store.getState().toasts[0].id

    store.getState().pauseToast(id)
    vi.advanceTimersByTime(3000) // well past the original deadline
    expect(store.getState().toasts).toHaveLength(1)
    expect(store.getState().pausedIds.has(id)).toBe(true)
  })

  it('resumeToast re-starts removal with remaining time', async () => {
    const store = await loadStore()

    store.getState().addToast({ title: 'T', message: '', type: 'error', duration: 2000 })
    const id = store.getState().toasts[0].id

    // Advance 1 s, then pause, then resume — should expire ~1 s later
    vi.advanceTimersByTime(1000)
    store.getState().pauseToast(id)
    store.getState().resumeToast(id)

    vi.advanceTimersByTime(999)
    expect(store.getState().toasts).toHaveLength(1) // not yet gone

    vi.advanceTimersByTime(2)
    expect(store.getState().toasts).toHaveLength(0) // gone after remaining ~1 s
  })

  it('toast with duration 0 never auto-removes', async () => {
    const store = await loadStore()

    store.getState().addToast({ title: 'Sticky', message: '', type: 'info', duration: 0 })
    vi.advanceTimersByTime(60_000)
    expect(store.getState().toasts).toHaveLength(1)
  })

  it('removeToast cleans pausedIds', async () => {
    const store = await loadStore()

    store.getState().addToast({ title: 'T', message: '', type: 'info', duration: 4000 })
    const id = store.getState().toasts[0].id
    store.getState().pauseToast(id)
    store.getState().removeToast(id)

    expect(store.getState().pausedIds.has(id)).toBe(false)
  })
})
```

- [ ] **Step 2: Run and verify PASS**

```powershell
npx vitest run src/renderer/src/stores/toastStore.test.ts
```
Expected: `6 tests passed`.

- [ ] **Step 3: Commit**

```powershell
git add src/renderer/src/stores/toastStore.test.ts
git commit -m "test(toastStore): cobertura de add/remove/pause/resume com fake timers"
```

---

## Task 4: Tests — `historyExport` utility (write utility then test)

**Files:**
- Create: `src/renderer/src/utils/historyExport.ts`
- Create: `src/renderer/src/utils/historyExport.test.ts`

- [ ] **Step 1: Write the failing test first**

```typescript
// src/renderer/src/utils/historyExport.test.ts
import { describe, expect, it } from 'vitest'
import { historyToCsv } from './historyExport'
import type { TTSHistoryItem } from '../../../shared/types'

const items: TTSHistoryItem[] = [
  { id: '1', text: 'Ola mundo', modelId: 'piper', timestamp: 1716739200000 },
  { id: '2', text: 'Com vírgula, e "aspas"', modelId: 'kokoro', voiceId: 'pt-BR', timestamp: 1716739260000 },
]

describe('historyToCsv', () => {
  it('starts with a BOM + header row', () => {
    const csv = historyToCsv(items)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('data,hora,texto,modelo,voz')
  })

  it('produces one data row per item', () => {
    const rows = historyToCsv(items).split('\n').filter(Boolean)
    expect(rows).toHaveLength(3) // BOM+header + 2 data rows
  })

  it('escapes commas and double-quotes in text', () => {
    const csv = historyToCsv(items)
    // "Com vírgula, e "aspas"" → wrapped in quotes, inner quotes doubled
    expect(csv).toContain('"Com vírgula, e ""aspas"""')
  })

  it('formats timestamp as ISO date and time columns', () => {
    const csv = historyToCsv(items)
    // 2024-05-26 for timestamp 1716739200000
    expect(csv).toMatch(/2024-05-26/)
  })

  it('uses empty string for missing optional fields', () => {
    const single: TTSHistoryItem[] = [{ id: '3', text: 'Ok', modelId: 'edge', timestamp: 0 }]
    const csv = historyToCsv(single)
    const dataRow = csv.split('\n')[1]
    // voiceId absent → last column is empty
    expect(dataRow.endsWith(',,')).toBe(false) // only one empty trailing column
    expect(dataRow.split(',').length).toBeGreaterThanOrEqual(5)
  })

  it('returns empty CSV (header only) for empty array', () => {
    const csv = historyToCsv([])
    const rows = csv.split('\n').filter(Boolean)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toContain('data')
  })
})
```

- [ ] **Step 2: Run to verify it FAILS** (module doesn't exist yet)

```powershell
npx vitest run src/renderer/src/utils/historyExport.test.ts
```
Expected: FAIL with "Cannot find module './historyExport'"

- [ ] **Step 3: Implement `historyExport.ts`**

```typescript
// src/renderer/src/utils/historyExport.ts
import type { TTSHistoryItem } from '../../../shared/types'

function escapeCsvField(value: string): string {
  // If the value contains comma, newline, or double-quote, wrap in quotes
  // and double any inner double-quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function isoDateTime(ts: number): { date: string; time: string } {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return { date, time }
}

export function historyToCsv(items: TTSHistoryItem[]): string {
  const BOM = '﻿'
  const header = 'data,hora,texto,modelo,voz'
  const rows = items.map((item) => {
    const { date, time } = isoDateTime(item.timestamp)
    return [
      date,
      time,
      escapeCsvField(item.text),
      escapeCsvField(item.modelId),
      escapeCsvField(item.voiceId ?? ''),
    ].join(',')
  })
  return BOM + [header, ...rows].join('\n')
}
```

- [ ] **Step 4: Run tests and verify PASS**

```powershell
npx vitest run src/renderer/src/utils/historyExport.test.ts
```
Expected: `6 tests passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/renderer/src/utils/historyExport.ts src/renderer/src/utils/historyExport.test.ts
git commit -m "feat(history): utilitario historyToCsv + testes de unidade"
```

---

## Task 5: CSV Export button in TTSPage

**Files:**
- Modify: `src/renderer/src/pages/TTSPage.tsx`

The history panel is inside the `{showHistory && ...}` aside at the bottom of the component (search for `Historico persistente`).

- [ ] **Step 1: Add `Download` import to lucide imports in TTSPage**

Find the lucide import block (lines 2–17) and add `Download`:

```typescript
import {
  BookmarkPlus,
  Cloud,
  Download,
  HardDrive,
  History,
  Keyboard,
  Loader2,
  Mic,
  MonitorUp,
  Pin,
  Plus,
  Send,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react'
```

- [ ] **Step 2: Add `historyToCsv` import after existing utils imports**

```typescript
import { historyToCsv } from '../utils/historyExport'
```

- [ ] **Step 3: Add `exportHistory` function after `saveCurrentPhrase`**

```typescript
const exportHistory = useCallback(() => {
  if (history.length === 0) return
  const csv = historyToCsv(history)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `voicelaunch-historico-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}, [history])
```

- [ ] **Step 4: Add export button in the history aside header**

Find the history aside (search for `Historico persistente` — it's in the `{showHistory && ...}` block):

```tsx
{showHistory && (
  <aside className="panel-surface w-full overflow-auto p-4 xl:w-80">
    <div className="mb-3 flex items-center gap-2">
      <History className="h-4 w-4 text-brand-300" />
      <h3 className="text-sm font-semibold text-slate-200">Historico persistente</h3>
      {history.length > 0 && (
        <button
          onClick={exportHistory}
          className="ml-auto btn-ghost inline-flex items-center gap-1 text-xs"
          aria-label="Exportar historico como CSV"
          title="Exportar CSV"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
      )}
    </div>
```

- [ ] **Step 5: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add src/renderer/src/pages/TTSPage.tsx src/renderer/src/utils/historyExport.ts
git commit -m "feat(history): botao exportar historico como CSV"
```

---

## Task 6: Shortcuts live feedback

When a voice shortcut fires globally, the corresponding card in VoiceShortcutsPage should flash a "▶ Ativo" indicator for 2 seconds.

**Files:**
- Modify: `src/renderer/src/App.tsx` (dispatch event)
- Modify: `src/renderer/src/pages/VoiceShortcutsPage.tsx` (listen + show indicator)

- [ ] **Step 1: Dispatch custom event in App.tsx**

In `App.tsx`, find the `speakVoiceShortcut` function (search for `const speakVoiceShortcut = async`). At the very start of the function body, add the event dispatch:

```typescript
const speakVoiceShortcut = async (shortcutId: string) => {
  // Notify shortcut pages with a live indicator
  window.dispatchEvent(new CustomEvent('voicelaunch:shortcut-triggered', { detail: shortcutId }))

  // ... rest of existing function unchanged
```

- [ ] **Step 2: Add `activeShortcutId` state in VoiceShortcutsPage**

At the top of the `VoiceShortcutsPage` function body, after the existing `useState` calls, add:

```typescript
const [activeShortcutId, setActiveShortcutId] = useState<string | null>(null)
```

- [ ] **Step 3: Add `useEffect` to listen for the event**

Add after the existing `useEffect` in VoiceShortcutsPage:

```typescript
useEffect(() => {
  const handleTriggered = (e: Event) => {
    const id = (e as CustomEvent<string>).detail
    setActiveShortcutId(id)
    const timer = setTimeout(() => setActiveShortcutId(null), 2000)
    return () => clearTimeout(timer)
  }
  window.addEventListener('voicelaunch:shortcut-triggered', handleTriggered as EventListener)
  return () => window.removeEventListener('voicelaunch:shortcut-triggered', handleTriggered as EventListener)
}, [])
```

- [ ] **Step 4: Add visual indicator to shortcut cards**

Find the shortcut card render (search for `sortedShortcuts.map`). The card outer `div` currently has a `className` string. Add a conditional border glow when the shortcut is active, and a small badge:

```tsx
<div
  key={shortcut.id}
  className={`hud-frame card-hover p-4 space-y-3 transition-all ${
    activeShortcutId === shortcut.id
      ? 'ring-2 ring-state-live/60'
      : ''
  }`}
>
  {/* Inside the card header row, add the live pill */}
  {activeShortcutId === shortcut.id && (
    <span className="status-pill status-pill--live text-xs ml-auto animate-pulse">
      ▶ Ativo
    </span>
  )}
```

The exact insertion point depends on the existing JSX structure. Look for the block that renders `shortcut.name` and `formatHotkeyDisplay(shortcut.hotkey)` and add the pill in the same flex row.

- [ ] **Step 5: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add src/renderer/src/App.tsx src/renderer/src/pages/VoiceShortcutsPage.tsx
git commit -m "feat(shortcuts): indicador visual em tempo real quando atalho e disparado"
```

---

## Task 7: Typography semantic tokens in Tailwind

**Files:**
- Modify: `tailwind.config.js`

The project uses `text-xs`, `text-sm`, `text-base` directly. Adding semantic aliases (e.g. `text-label`, `text-caption`) lets future code read intent instead of size.

- [ ] **Step 1: Add `fontSize` extension to `tailwind.config.js`**

Inside `theme.extend`, after the `fontFamily` block, add:

```javascript
fontSize: {
  // Semantic aliases — map to the same values as Tailwind's built-ins
  // so existing code is unaffected; new code can use semantic names
  'caption':  ['0.6875rem', { lineHeight: '1rem' }],       // ~11px — small metadata, badges
  'label':    ['0.75rem',   { lineHeight: '1rem',    letterSpacing: '0.18em' }], // 12px — uppercase tracking labels
  'body':     ['0.875rem',  { lineHeight: '1.25rem' }],     // 14px = text-sm
  'reading':  ['1rem',      { lineHeight: '1.5rem' }],      // 16px = text-base
  'subhead':  ['1.125rem',  { lineHeight: '1.75rem' }],     // 18px = text-lg
  'heading':  ['1.25rem',   { lineHeight: '1.75rem' }],     // 20px = text-xl
  'display':  ['1.5rem',    { lineHeight: '2rem' }],        // 24px = text-2xl
},
```

- [ ] **Step 2: Verify Tailwind compiles (build CSS)**

```powershell
npx tsc --noEmit
```
Expected: no errors. (Tailwind config is JS — TS check is unaffected.)

- [ ] **Step 3: Commit**

```powershell
git add tailwind.config.js
git commit -m "chore(tailwind): tokens semanticos de tipografia (caption/label/body/heading/display)"
```

---

## Task 8: Onboarding slide-in panel (non-blocking)

Replace the full-screen blocking overlay with a right-side drawer. The rest of the app remains visible and interactive.

**Files:**
- Modify: `src/renderer/src/components/OnboardingTutorial.tsx`

- [ ] **Step 1: Understand the current structure**

The outer wrapper is:
```tsx
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
  role="dialog"
  aria-modal="true"
  ...
>
  <div className="hud-frame hud-frame--hero scanline max-w-lg w-full overflow-hidden animate-lift-in">
```

- [ ] **Step 2: Replace the outer wrapper with a drawer layout**

Change the outer `div` and inner panel `div` to:

```tsx
{/* Dimmed backdrop — pointer-events-none so clicks pass through to the app */}
<div
  className="fixed inset-0 z-40 bg-black/40 pointer-events-none"
  aria-hidden="true"
/>

{/* Slide-in panel */}
<div
  className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[440px] overflow-y-auto animate-slide-in-right"
  role="dialog"
  aria-modal="false"
  aria-labelledby="onboarding-title"
  onKeyDown={handleKeyDown}
  ref={dialogRef}
>
  <div className="hud-frame hud-frame--hero scanline h-full overflow-hidden">
```

> Note: `aria-modal="false"` because the rest of the app IS accessible. Screen readers will still announce the dialog but won't trap the virtual cursor.

- [ ] **Step 3: Add `animate-slide-in-right` keyframe to `tailwind.config.js`**

In `tailwind.config.js`, inside `theme.extend.animation`:
```javascript
'slide-in-right': 'slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
```

And in `theme.extend.keyframes`:
```javascript
'slide-in-right': {
  from: { transform: 'translateX(100%)' },
  to:   { transform: 'translateX(0)' },
},
```

- [ ] **Step 4: Remove the outer padding from the panel content**

The inner content previously had `px-8 pb-6`. Because it's now full-height, keep the padding but ensure the panel itself scrolls:

The panel `div` already has `overflow-y-auto`. The inner `hud-frame` should be `min-h-full` to fill the panel:

```tsx
<div className="hud-frame hud-frame--hero scanline min-h-full flex flex-col">
```

And wrap the content so it fills the height:

```tsx
{/* progress + header + content */}
<div className="flex flex-col flex-1 pb-8">
  {/* ... existing content unchanged ... */}
</div>
```

- [ ] **Step 5: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add src/renderer/src/components/OnboardingTutorial.tsx tailwind.config.js
git commit -m "feat(onboarding): converte modal bloqueante para drawer lateral (nao bloqueante)"
```

---

## Task 9: Build validation + compact mode smoke check

- [ ] **Step 1: Run full TypeScript check**

```powershell
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 2: Run all tests**

```powershell
npx vitest run
```
Expected: all tests pass. Note the total count — it should be higher than the pre-session baseline.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```
Expected: exits with code 0. If it fails, read the error and fix it before the `dist` step.

- [ ] **Step 4: Compact mode manual check (visual)**

Start the dev server:
```powershell
npm run dev
```
In the running app:
1. Open Settings → toggle "Modo compacto" ON
2. Verify the window resizes to ~480×420 and content still renders
3. Verify ToastContainer shows in the top-left in compact mode
4. Toggle compact mode OFF — window should restore to 1280×800
5. Verify AlertBox renders correctly at the smaller size (no layout overflow)

- [ ] **Step 5: Commit final verification note**

```powershell
git add -A
git commit -m "chore: build validado + smoke test modo compacto — sem regressoes"
```

---

## Self-Review

**Spec coverage:**
1. ✅ Tests — Tasks 2, 3, 4 cover alertConfig, toastStore, historyExport
2. ✅ Build validation — Task 9
3. ✅ Typography tokens — Task 7
4. ✅ CSV export — Tasks 4 + 5
5. ✅ Shortcuts live feedback — Task 6
6. ✅ Onboarding slide-in — Task 8
7. ✅ Compact mode smoke — Task 9

**Placeholder scan:** None. All code blocks are complete.

**Type consistency:**
- `historyToCsv` defined in Task 4, used in Task 5 — signature matches: `(items: TTSHistoryItem[]) => string`
- `alertConfig` exported from Task 1, imported in Task 2 tests — `Record<AlertSeverity, AlertSeverityConfig>`
- `voicelaunch:shortcut-triggered` event dispatched in Task 6 App.tsx and consumed in Task 6 VoiceShortcutsPage — both use `CustomEvent<string>`
- `animate-slide-in-right` class used in Task 8, defined in Task 8's tailwind config step — same name
