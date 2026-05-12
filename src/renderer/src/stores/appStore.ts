import { create } from 'zustand'

interface AppState {
  alwaysOnTop: boolean
  setAlwaysOnTop: (value: boolean) => void
  highContrast: boolean
  setHighContrast: (value: boolean) => void
  largeFont: boolean
  setLargeFont: (value: boolean) => void
  compactMode: boolean
  setCompactMode: (value: boolean) => void
  backendStatus: { running: boolean; port: number; version: string; uptime: number }
  setBackendStatus: (status: any) => void
  defaultModelId: string
  setDefaultModelId: (value: string) => void
  defaultSpeed: number
  setDefaultSpeed: (value: number) => void
  tutorialSeen: boolean
  setTutorialSeen: (value: boolean) => void
  showExperimentalModels: boolean
  setShowExperimentalModels: (value: boolean) => void
  _hydrated: boolean
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
const pendingState: Partial<AppState> = {}

const saveToDisk = (state: Partial<AppState>) => {
  Object.assign(pendingState, state)
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings({ ...pendingState })
    }
    // Clear pending keys
    for (const key of Object.keys(pendingState)) {
      delete (pendingState as any)[key]
    }
    saveTimeout = null
  }, 300)
}

export const useAppStore = create<AppState>((set) => ({
  alwaysOnTop: false,
  setAlwaysOnTop: (value) => {
    set({ alwaysOnTop: value })
    saveToDisk({ alwaysOnTop: value })
  },
  highContrast: false,
  setHighContrast: (value) => {
    set({ highContrast: value })
    saveToDisk({ highContrast: value })
  },
  largeFont: false,
  setLargeFont: (value) => {
    set({ largeFont: value })
    saveToDisk({ largeFont: value })
  },
  compactMode: false,
  setCompactMode: (value) => {
    set({ compactMode: value })
    saveToDisk({ compactMode: value })
    window.electronAPI.setCompactMode(value)
    window.electronAPI.setAlwaysOnTop(value || get().alwaysOnTop)
  },
  backendStatus: { running: false, port: 9472, version: '1.0.0', uptime: 0 },
  setBackendStatus: (status) => set({ backendStatus: status }),
  defaultModelId: 'piper',
  setDefaultModelId: (value) => {
    set({ defaultModelId: value })
    saveToDisk({ defaultModelId: value })
  },
  defaultSpeed: 1.0,
  setDefaultSpeed: (value) => {
    set({ defaultSpeed: value })
    saveToDisk({ defaultSpeed: value })
  },
  tutorialSeen: false,
  setTutorialSeen: (value) => {
    set({ tutorialSeen: value })
    saveToDisk({ tutorialSeen: value })
  },
  showExperimentalModels: false,
  setShowExperimentalModels: (value) => {
    set({ showExperimentalModels: value })
    saveToDisk({ showExperimentalModels: value })
  },
  _hydrated: false,
}))

// Hydrate from disk on load
if (typeof window !== 'undefined') {
  window.electronAPI?.loadSettings?.().then((saved: any) => {
    if (saved) {
      useAppStore.setState({
        alwaysOnTop: saved.alwaysOnTop ?? false,
        highContrast: saved.highContrast ?? false,
        largeFont: saved.largeFont ?? false,
        compactMode: saved.compactMode ?? false,
        defaultModelId: saved.defaultModelId ?? 'piper',
        defaultSpeed: saved.defaultSpeed ?? 1.0,
        tutorialSeen: saved.tutorialSeen ?? false,
        showExperimentalModels: saved.showExperimentalModels ?? false,
        _hydrated: true,
      })
    }
  })
}
