import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '../../../shared/types'
import { migrateSettings, SCHEMA_VERSION } from './appStore'

interface TestSaveAPI {
  saveSettings: ReturnType<typeof vi.fn>
  loadSettings: ReturnType<typeof vi.fn>
}

const loadAppStoreWithMockedApi = async () => {
  vi.resetModules()

  const api: TestSaveAPI = {
    saveSettings: vi.fn(async () => true),
    loadSettings: vi.fn(async () => ({ schemaVersion: 1, profiles: [{ id: 'padrao', name: 'Padrao' }], activeProfileId: 'padrao' } as unknown as AppSettings)),
  }

  ;(globalThis as any).window = {
    electronAPI: api,
  }

  const module = await import('./appStore')
  // Drain hydration microtasks so the initial migration save (if any) is recorded before tests start.
  await Promise.resolve()
  await Promise.resolve()
  api.saveSettings.mockClear()
  return {
    api,
    useAppStore: module.useAppStore,
  }
}

describe('appStore persistence batching', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    delete (globalThis as any).window
    vi.resetModules()
  })

  it('batches multiple field updates into one save call', async () => {
    const { useAppStore, api } = await loadAppStoreWithMockedApi()

    useAppStore.getState().setAlwaysOnTop(true)
    useAppStore.getState().setHighContrast(true)

    expect(api.saveSettings).not.toHaveBeenCalled()

    vi.advanceTimersByTime(299)
    expect(api.saveSettings).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(api.saveSettings).toHaveBeenCalledTimes(1)
    expect(api.saveSettings).toHaveBeenCalledWith({
      alwaysOnTop: true,
      highContrast: true,
    })
  })

  it('keeps only the last value for the same key in a batch', async () => {
    const { useAppStore, api } = await loadAppStoreWithMockedApi()

    useAppStore.getState().setAlwaysOnTop(false)
    useAppStore.getState().setAlwaysOnTop(true)

    vi.advanceTimersByTime(300)

    expect(api.saveSettings).toHaveBeenCalledTimes(1)
    expect(api.saveSettings).toHaveBeenCalledWith({ alwaysOnTop: true })
  })

  it('allows another batch after the first flush', async () => {
    const { useAppStore, api } = await loadAppStoreWithMockedApi()

    useAppStore.getState().setDefaultSpeed(1.2)
    vi.advanceTimersByTime(300)
    expect(api.saveSettings).toHaveBeenCalledWith({ defaultSpeed: 1.2 })

    useAppStore.getState().setDefaultModelId('kokoro')
    vi.advanceTimersByTime(300)

    expect(api.saveSettings).toHaveBeenCalledTimes(2)
    expect(api.saveSettings).toHaveBeenLastCalledWith({ defaultModelId: 'kokoro' })
  })
})

describe('migrateSettings', () => {
  it('creates default profiles when settings are empty', () => {
    const result = migrateSettings(null)
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.profiles).toHaveLength(2)
    expect(result.profiles?.[0].id).toBe('padrao')
    expect(result.profiles?.[1].id).toBe('jogo')
    expect(result.activeProfileId).toBe('padrao')
  })

  it('preserves legacy quick phrases as the padrao profile content', () => {
    const legacy: Partial<AppSettings> = {
      quickPhrases: ['Bom dia.', 'Boa noite.', 'Ate logo.'],
      defaultModelId: 'kokoro',
    }
    const result = migrateSettings(legacy)
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.profiles?.[0].quickPhrases).toEqual(['Bom dia.', 'Boa noite.', 'Ate logo.'])
    expect(result.defaultModelId).toBe('kokoro')
  })

  it('keeps existing profiles when schema is already at current version', () => {
    const existing: Partial<AppSettings> = {
      schemaVersion: SCHEMA_VERSION,
      profiles: [
        { id: 'custom', name: 'Custom', quickPhrases: ['Oi.'] },
        { id: 'second', name: 'Second' },
      ],
      activeProfileId: 'second',
    }
    const result = migrateSettings(existing)
    expect(result.profiles).toHaveLength(2)
    expect(result.profiles?.[0].id).toBe('custom')
    expect(result.activeProfileId).toBe('second')
  })

  it('falls back to the first profile when active id is unknown', () => {
    const existing: Partial<AppSettings> = {
      schemaVersion: SCHEMA_VERSION,
      profiles: [{ id: 'only', name: 'Only', quickPhrases: ['x'] }],
      activeProfileId: 'ghost',
    }
    const result = migrateSettings(existing)
    expect(result.activeProfileId).toBe('only')
  })

  it('defaults voice source to cloud and unsets cable device on fresh install', () => {
    const result = migrateSettings(null)
    expect(result.voiceSource).toBe('cloud')
    expect(result.cableDeviceId).toBeNull()
    expect(result.cableDeviceLabel).toBeNull()
  })

  it('preserves explicit voiceSource/cableDeviceId when already set', () => {
    const existing: Partial<AppSettings> = {
      schemaVersion: SCHEMA_VERSION,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      voiceSource: 'local',
      cloudVoice: 'pt-BR-FranciscaNeural',
      cableDeviceId: 'cable-device-id',
      cableDeviceLabel: 'CABLE Input (VB-Audio)',
    }
    const result = migrateSettings(existing)
    expect(result.voiceSource).toBe('local')
    expect(result.cloudVoice).toBe('pt-BR-FranciscaNeural')
    expect(result.cableDeviceId).toBe('cable-device-id')
    expect(result.cableDeviceLabel).toBe('CABLE Input (VB-Audio)')
  })

  it('upgrades v1 settings to v2 adding mvp defaults', () => {
    const legacyV1: Partial<AppSettings> = {
      schemaVersion: 1,
      profiles: [{ id: 'padrao', name: 'Padrao', quickPhrases: ['Oi.'] }],
      activeProfileId: 'padrao',
      defaultModelId: 'kokoro',
    }
    const result = migrateSettings(legacyV1)
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.voiceSource).toBe('cloud')
    expect(result.cableDeviceId).toBeNull()
    expect(result.defaultModelId).toBe('kokoro')
    expect(result.profiles?.[0].id).toBe('padrao')
  })

  it('initializes voiceShortcuts as empty array on fresh install', () => {
    const result = migrateSettings(null)
    expect(result.voiceShortcuts).toEqual([])
  })

  it('preserves existing voiceShortcuts when migrating from earlier schema', () => {
    const legacyV2: Partial<AppSettings> = {
      schemaVersion: 2,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      voiceShortcuts: [
        {
          id: 'kept',
          name: 'GG',
          hotkey: 'CommandOrControl+Shift+1',
          enabled: true,
          voiceSource: 'cloud',
          voice: 'pt-BR-AntonioNeural',
          text: 'GG!',
          speed: 1.1,
        },
      ],
    }
    const result = migrateSettings(legacyV2)
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.voiceShortcuts).toHaveLength(1)
    expect(result.voiceShortcuts?.[0].id).toBe('kept')
  })
})
