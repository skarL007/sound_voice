import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '../../../shared/types'
import { migrateSettings, SCHEMA_VERSION } from './appStore'
import { HOTKEY_SLOTS } from '../utils/voiceShortcuts'

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

describe('migrateSettings — quickPhrases -> voiceShortcuts (v4)', () => {
  it('converts settings-level quick phrases into sequential voice shortcuts', () => {
    const legacy: Partial<AppSettings> = {
      schemaVersion: 2,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      quickPhrases: ['GG!', 'Cuidado!', 'Oi pessoal'],
      cloudVoice: 'pt-BR-AntonioNeural',
    }
    const result = migrateSettings(legacy)
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.voiceShortcuts).toHaveLength(3)
    expect(result.voiceShortcuts?.map((s) => s.text)).toEqual(['GG!', 'Cuidado!', 'Oi pessoal'])
    expect(result.voiceShortcuts?.map((s) => s.hotkey)).toEqual([
      HOTKEY_SLOTS[0],
      HOTKEY_SLOTS[1],
      HOTKEY_SLOTS[2],
    ])
    for (const shortcut of result.voiceShortcuts ?? []) {
      expect(shortcut.enabled).toBe(true)
      expect(shortcut.voiceSource).toBe('cloud')
      expect(shortcut.voice).toBe('pt-BR-AntonioNeural')
      expect(shortcut.speed).toBe(1.0)
      expect(shortcut.id).toMatch(/^vs_/)
    }
  })

  it('leaves the shortcut voice empty when no cloud voice was chosen', () => {
    const legacy: Partial<AppSettings> = {
      schemaVersion: 3,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      quickPhrases: ['Sem voz ainda'],
    }
    const result = migrateSettings(legacy)
    expect(result.voiceShortcuts).toHaveLength(1)
    expect(result.voiceShortcuts?.[0].voice).toBe('')
  })

  it('skips blank phrases but keeps hotkeys aligned to original position', () => {
    const legacy: Partial<AppSettings> = {
      schemaVersion: 2,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      quickPhrases: ['Boa', '   ', '', 'Tarde'],
      cloudVoice: 'pt-BR-FranciscaNeural',
    }
    const result = migrateSettings(legacy)
    expect(result.voiceShortcuts).toHaveLength(2)
    expect(result.voiceShortcuts?.map((s) => s.text)).toEqual(['Boa', 'Tarde'])
    expect(result.voiceShortcuts?.map((s) => s.hotkey)).toEqual([HOTKEY_SLOTS[0], HOTKEY_SLOTS[3]])
  })

  it('caps conversion at the number of available hotkey slots', () => {
    const phrases = Array.from({ length: HOTKEY_SLOTS.length + 3 }, (_, i) => `Frase ${i + 1}`)
    const legacy: Partial<AppSettings> = {
      schemaVersion: 2,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      quickPhrases: phrases,
    }
    const result = migrateSettings(legacy)
    expect(result.voiceShortcuts).toHaveLength(HOTKEY_SLOTS.length)
  })

  it('falls back to the active profile quick phrases when none at settings level', () => {
    const legacy: Partial<AppSettings> = {
      schemaVersion: 2,
      profiles: [
        { id: 'padrao', name: 'Padrao', quickPhrases: ['Do perfil A', 'Do perfil B'] },
        { id: 'jogo', name: 'Jogo', quickPhrases: ['Outra'] },
      ],
      activeProfileId: 'padrao',
    }
    const result = migrateSettings(legacy)
    expect(result.voiceShortcuts?.map((s) => s.text)).toEqual(['Do perfil A', 'Do perfil B'])
  })

  it('does not regenerate shortcuts when voiceShortcuts already exist', () => {
    const legacy: Partial<AppSettings> = {
      schemaVersion: 2,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      quickPhrases: ['Ignorada'],
      voiceShortcuts: [
        {
          id: 'existing',
          name: 'Existente',
          hotkey: HOTKEY_SLOTS[5],
          enabled: true,
          voiceSource: 'cloud',
          voice: 'pt-BR-AntonioNeural',
          text: 'Ja existe',
          speed: 1.0,
        },
      ],
    }
    const result = migrateSettings(legacy)
    expect(result.voiceShortcuts).toHaveLength(1)
    expect(result.voiceShortcuts?.[0].id).toBe('existing')
  })

  it('preserves the legacy quickPhrases array after conversion', () => {
    const legacy: Partial<AppSettings> = {
      schemaVersion: 2,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      quickPhrases: ['Mantida'],
    }
    const result = migrateSettings(legacy)
    expect(result.quickPhrases).toEqual(['Mantida'])
    expect(result.voiceShortcuts).toHaveLength(1)
  })

  it('derives the shortcut name from the first 40 chars of the phrase', () => {
    const long = 'A'.repeat(60)
    const legacy: Partial<AppSettings> = {
      schemaVersion: 2,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      quickPhrases: [long],
    }
    const result = migrateSettings(legacy)
    expect(result.voiceShortcuts?.[0].name).toBe('A'.repeat(40))
    expect(result.voiceShortcuts?.[0].text).toBe(long)
  })
})

describe('appStore hydration — voice shortcuts reregister', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete (globalThis as any).window
    vi.resetModules()
  })

  const hydrateWith = async (saved: unknown) => {
    vi.resetModules()
    const reregisterVoiceShortcuts = vi.fn(async (_shortcuts: Array<{ text: string }>) => ({
      ok: true,
      conflicted: [] as string[],
    }))
    const saveSettings = vi.fn(async () => true)
    const loadSettings = vi.fn(async () => saved)
    ;(globalThis as any).window = {
      electronAPI: { saveSettings, loadSettings, reregisterVoiceShortcuts },
      dispatchEvent: vi.fn(() => true),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    const module = await import('./appStore')
    // Flush the loadSettings().then(...) hydration chain (real timers in this block).
    await new Promise((resolve) => setTimeout(resolve, 0))
    return { module, reregisterVoiceShortcuts, saveSettings }
  }

  it('reregisters shortcuts converted from legacy quick phrases on boot', async () => {
    const { module, reregisterVoiceShortcuts } = await hydrateWith({
      schemaVersion: 2,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
      quickPhrases: ['GG!', 'Cuidado!'],
      cloudVoice: 'pt-BR-AntonioNeural',
    })
    expect(reregisterVoiceShortcuts).toHaveBeenCalledTimes(1)
    const passed = reregisterVoiceShortcuts.mock.calls[0][0]
    expect(passed).toHaveLength(2)
    expect(passed.map((s) => s.text)).toEqual(['GG!', 'Cuidado!'])
    expect(module.useAppStore.getState().voiceShortcuts).toHaveLength(2)
  })

  it('does not call reregister when there are no shortcuts', async () => {
    const { reregisterVoiceShortcuts } = await hydrateWith({
      schemaVersion: SCHEMA_VERSION,
      profiles: [{ id: 'padrao', name: 'Padrao' }],
      activeProfileId: 'padrao',
    })
    expect(reregisterVoiceShortcuts).not.toHaveBeenCalled()
  })
})
