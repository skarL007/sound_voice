import { create } from 'zustand'
import type { AppSettings, BackendStatus, Profile, VoiceShortcut, VoiceSource } from '../../../shared/types'
import { DEFAULT_QUICK_PHRASES, MAX_QUICK_PHRASES } from '../utils/communicationState'
import { defaultShortcuts, generateShortcutId } from '../utils/voiceShortcuts'

export const SCHEMA_VERSION = 3

interface AppState {
  alwaysOnTop: boolean
  setAlwaysOnTop: (value: boolean) => void
  highContrast: boolean
  setHighContrast: (value: boolean) => void
  largeFont: boolean
  setLargeFont: (value: boolean) => void
  compactMode: boolean
  setCompactMode: (value: boolean) => void
  backendStatus: BackendStatus
  setBackendStatus: (status: BackendStatus) => void
  defaultModelId: string
  setDefaultModelId: (value: string) => void
  defaultSpeed: number
  setDefaultSpeed: (value: number) => void
  tutorialSeen: boolean
  setTutorialSeen: (value: boolean) => void
  showExperimentalModels: boolean
  setShowExperimentalModels: (value: boolean) => void
  profiles: Profile[]
  activeProfileId: string
  setActiveProfile: (profileId: string) => void
  voiceSource: VoiceSource
  setVoiceSource: (source: VoiceSource) => void
  cloudVoice: string | null
  setCloudVoice: (voiceShortName: string | null) => void
  cableDeviceId: string | null
  cableDeviceLabel: string | null
  setCableDevice: (deviceId: string | null, deviceLabel: string | null) => void
  voiceShortcuts: VoiceShortcut[]
  addVoiceShortcut: (shortcut: VoiceShortcut) => void
  updateVoiceShortcut: (id: string, patch: Partial<VoiceShortcut>) => void
  deleteVoiceShortcut: (id: string) => void
  _hydrated: boolean
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
const pendingState: Partial<AppSettings> = {}

const saveToDisk = (state: Partial<AppSettings>) => {
  Object.assign(pendingState, state)
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings({ ...pendingState })
    }
    for (const key of Object.keys(pendingState)) {
      delete (pendingState as Record<string, unknown>)[key]
    }
    saveTimeout = null
  }, 300)
}

const DEFAULT_PROFILE_ID = 'padrao'
const GAMING_PROFILE_ID = 'jogo'

const GAMING_DEFAULT_PHRASES = [
  'GG!',
  'WP, bem jogado.',
  'Cuidado, inimigo se aproximando.',
  'Preciso de ajuda aqui.',
  'Estou indo te dar suporte.',
  'Vamos juntos.',
  'Em cima, vai!',
  'Recue, recue!',
  'Estou sem municao.',
  'Reagrupar agora.',
]

function buildDefaultProfiles(carriedQuickPhrases?: string[]): Profile[] {
  const padraoPhrases = carriedQuickPhrases && carriedQuickPhrases.length > 0
    ? carriedQuickPhrases.slice(0, MAX_QUICK_PHRASES)
    : DEFAULT_QUICK_PHRASES
  return [
    { id: DEFAULT_PROFILE_ID, name: 'Padrao', quickPhrases: padraoPhrases },
    { id: GAMING_PROFILE_ID, name: 'Jogo', quickPhrases: GAMING_DEFAULT_PHRASES },
  ]
}

export function migrateSettings(saved: Partial<AppSettings> | null | undefined): Partial<AppSettings> {
  const ensureMvpDefaults = (base: Partial<AppSettings>): Partial<AppSettings> => ({
    voiceSource: 'cloud',
    cableDeviceId: null,
    cableDeviceLabel: null,
    voiceShortcuts: [],
    ...base,
  })

  if (!saved) {
    return ensureMvpDefaults({
      schemaVersion: SCHEMA_VERSION,
      profiles: buildDefaultProfiles(),
      activeProfileId: DEFAULT_PROFILE_ID,
    })
  }
  if (saved.schemaVersion === SCHEMA_VERSION && Array.isArray(saved.profiles) && saved.profiles.length > 0) {
    const activeProfileId =
      saved.activeProfileId && saved.profiles.some((profile) => profile.id === saved.activeProfileId)
        ? saved.activeProfileId
        : saved.profiles[0].id
    return ensureMvpDefaults({ ...saved, schemaVersion: SCHEMA_VERSION, activeProfileId })
  }
  const profiles =
    Array.isArray(saved.profiles) && saved.profiles.length > 0
      ? saved.profiles
      : buildDefaultProfiles(saved.quickPhrases)
  const activeProfileId =
    saved.activeProfileId && profiles.some((profile) => profile.id === saved.activeProfileId)
      ? saved.activeProfileId
      : DEFAULT_PROFILE_ID
  const voiceShortcuts = Array.isArray(saved.voiceShortcuts) ? saved.voiceShortcuts : []
  return ensureMvpDefaults({
    ...saved,
    schemaVersion: SCHEMA_VERSION,
    profiles,
    activeProfileId,
    voiceShortcuts,
  })
}

export const useAppStore = create<AppState>((set, get) => ({
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
  profiles: buildDefaultProfiles(),
  activeProfileId: DEFAULT_PROFILE_ID,
  voiceSource: 'cloud',
  setVoiceSource: (source) => {
    set({ voiceSource: source })
    saveToDisk({ voiceSource: source })
  },
  cloudVoice: null,
  setCloudVoice: (voiceShortName) => {
    set({ cloudVoice: voiceShortName })
    saveToDisk({ cloudVoice: voiceShortName ?? undefined })
  },
  cableDeviceId: null,
  cableDeviceLabel: null,
  setCableDevice: (deviceId, deviceLabel) => {
    set({ cableDeviceId: deviceId, cableDeviceLabel: deviceLabel })
    saveToDisk({ cableDeviceId: deviceId, cableDeviceLabel: deviceLabel })
  },
  voiceShortcuts: [],
  addVoiceShortcut: (shortcut) => {
    const next = [...get().voiceShortcuts, shortcut]
    set({ voiceShortcuts: next })
    saveToDisk({ voiceShortcuts: next })
    void window.electronAPI?.reregisterVoiceShortcuts?.(next)
  },
  updateVoiceShortcut: (id, patch) => {
    const next = get().voiceShortcuts.map((shortcut) =>
      shortcut.id === id ? { ...shortcut, ...patch } : shortcut,
    )
    set({ voiceShortcuts: next })
    saveToDisk({ voiceShortcuts: next })
    void window.electronAPI?.reregisterVoiceShortcuts?.(next)
  },
  deleteVoiceShortcut: (id) => {
    const next = get().voiceShortcuts.filter((shortcut) => shortcut.id !== id)
    set({ voiceShortcuts: next })
    saveToDisk({ voiceShortcuts: next })
    void window.electronAPI?.reregisterVoiceShortcuts?.(next)
  },
  setActiveProfile: (profileId) => {
    const profile = get().profiles.find((entry) => entry.id === profileId)
    if (!profile) return
    const next: Partial<AppState> = { activeProfileId: profileId }
    if (profile.modelId) next.defaultModelId = profile.modelId
    if (typeof profile.speed === 'number') next.defaultSpeed = profile.speed
    set(next as AppState)
    const persistedFields: Partial<AppSettings> = { activeProfileId: profileId }
    if (profile.modelId) persistedFields.defaultModelId = profile.modelId
    if (typeof profile.speed === 'number') persistedFields.defaultSpeed = profile.speed
    if (profile.quickPhrases) persistedFields.quickPhrases = profile.quickPhrases
    saveToDisk(persistedFields)
    if (profile.quickPhrases) {
      window.dispatchEvent(new CustomEvent('voicelaunch:communication-updated', {
        detail: { quickPhrases: profile.quickPhrases },
      }))
    }
  },
  _hydrated: false,
}))

if (typeof window !== 'undefined') {
  window.electronAPI?.loadSettings?.().then((saved) => {
    const migrated = migrateSettings(saved)
    const persistFields: Partial<AppSettings> = {}
    if (!saved || saved.schemaVersion !== SCHEMA_VERSION) {
      persistFields.schemaVersion = SCHEMA_VERSION
      persistFields.profiles = migrated.profiles
      persistFields.activeProfileId = migrated.activeProfileId
    }
    if (Object.keys(persistFields).length > 0) {
      window.electronAPI?.saveSettings?.(persistFields)
    }
    useAppStore.setState({
      alwaysOnTop: migrated.alwaysOnTop ?? false,
      highContrast: migrated.highContrast ?? false,
      largeFont: migrated.largeFont ?? false,
      compactMode: migrated.compactMode ?? false,
      defaultModelId: migrated.defaultModelId ?? 'piper',
      defaultSpeed: migrated.defaultSpeed ?? 1.0,
      tutorialSeen: migrated.tutorialSeen ?? false,
      showExperimentalModels: migrated.showExperimentalModels ?? false,
      profiles: migrated.profiles ?? buildDefaultProfiles(),
      activeProfileId: migrated.activeProfileId ?? DEFAULT_PROFILE_ID,
      voiceSource: migrated.voiceSource ?? 'cloud',
      cloudVoice: migrated.cloudVoice ?? null,
      cableDeviceId: migrated.cableDeviceId ?? null,
      cableDeviceLabel: migrated.cableDeviceLabel ?? null,
      voiceShortcuts: migrated.voiceShortcuts ?? [],
      _hydrated: true,
    })
    if (Array.isArray(migrated.voiceShortcuts) && migrated.voiceShortcuts.length > 0) {
      void window.electronAPI?.reregisterVoiceShortcuts?.(migrated.voiceShortcuts)
    }
  })
}

export function createDefaultShortcutsFor(cloudVoice: string | null): VoiceShortcut[] {
  return defaultShortcuts(cloudVoice).map((shortcut) => ({ ...shortcut, id: generateShortcutId() }))
}
