import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import type { AppSettings } from '../shared/types'

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

export function loadSettings(): AppSettings {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const data = readFileSync(SETTINGS_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return {}
}

export function saveSettings(settings: AppSettings): void {
  try {
    const dir = join(app.getPath('userData'))
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const mergedSettings = { ...loadSettings(), ...settings }
    writeFileSync(SETTINGS_PATH, JSON.stringify(mergedSettings, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}
