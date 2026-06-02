import { app, shell, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'

import { registerIpcHandlers } from './ipc-handlers'
import { PythonBackendManager } from './python-manager'
import { logMain } from './logger'
import { isAutoUpdateEnabled } from './app-config'
import { shouldOpenExternalUrl } from './security-utils'
import { loadSettings } from './settings-store'
import type { VoiceShortcut } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let backendManager: PythonBackendManager | null = null
const registeredVoiceShortcuts = new Set<string>()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    backgroundColor: '#06030F',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (shouldOpenExternalUrl(details.url)) {
      void shell.openExternal(details.url)
    } else {
      logMain('WARN', `Blocked window open for invalid URL: ${details.url}`)
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Auto-updater configuration
function setupAutoUpdater(): void {
  if (!isAutoUpdateEnabled()) {
    logMain('INFO', 'Auto-updater disabled for this build')
    return
  }

  autoUpdater.logger = {
    info: (msg: string) => logMain('INFO', `[updater] ${msg}`),
    warn: (msg: string) => logMain('WARN', `[updater] ${msg}`),
    error: (msg: string) => logMain('ERROR', `[updater] ${msg}`),
  } as any

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater:checking')
  })

  autoUpdater.on('update-available', (info) => {
    logMain('INFO', `Update available: ${info.version}`)
    mainWindow?.webContents.send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:progress', {
      percent: progress.percent,
      speed: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    logMain('INFO', `Update downloaded: ${info.version}`)
    mainWindow?.webContents.send('updater:downloaded', {
      version: info.version,
    })
  })

  autoUpdater.on('error', (err) => {
    logMain('ERROR', `Auto-updater error: ${err.message}`)
    mainWindow?.webContents.send('updater:error', err.message)
  })

  // Check for updates 10 seconds after app start (give time for window to load)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silent fail - no internet or no update server configured
    })
  }, 10000)
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  logMain('INFO', 'Another VoiceLaunch instance is already running; quitting this one.')
  app.exit(0)
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  }
})

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return
  electronApp.setAppUserModelId('com.voicelaunch.tts')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  setupShortcutsIpc()

  backendManager = new PythonBackendManager()
  createWindow()
  void backendManager.start().then((started) => {
    if (!started) {
      logMain('WARN', 'Python backend did not start successfully. Renderer can retry from the UI.')
    }
  })
  setupAutoUpdater()
  setupGlobalShortcuts()
  loadAndRegisterVoiceShortcuts()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  if (backendManager) {
    await backendManager.stop()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (backendManager) {
    await backendManager.stop()
  }
})

function setupGlobalShortcuts(): void {
  const ensureWindowReady = () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  }

  const conflicted: string[] = []

  const tryRegister = (accelerator: string, handler: () => void): void => {
    let ok = false
    try {
      ok = globalShortcut.register(accelerator, handler)
    } catch (error) {
      logMain('WARN', `Failed to register ${accelerator}: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (!ok) {
      conflicted.push(accelerator)
      logMain('WARN', `Global shortcut not registered (likely in use by another app): ${accelerator}`)
    }
  }

  // Ctrl+Shift+F — Focus window and TTS input (accessibility shortcut)
  const focusShortcut = process.platform === 'darwin' ? 'Cmd+Shift+F' : 'Ctrl+Shift+F'
  tryRegister(focusShortcut, () => {
    ensureWindowReady()
    mainWindow?.webContents.send('global:focus-tts')
  })

  // Ctrl+Shift+S — Stop audio immediately
  const stopShortcut = process.platform === 'darwin' ? 'Cmd+Shift+S' : 'Ctrl+Shift+S'
  tryRegister(stopShortcut, () => {
    mainWindow?.webContents.send('global:stop-audio')
  })

  const openCompactShortcut = process.platform === 'darwin' ? 'Cmd+Shift+V' : 'Ctrl+Shift+V'
  tryRegister(openCompactShortcut, () => {
    ensureWindowReady()
    mainWindow?.webContents.send('global:open-compact')
    setTimeout(() => {
      mainWindow?.webContents.send('global:focus-tts')
    }, 80)
  })

  const toggleVirtualMicShortcut = process.platform === 'darwin' ? 'Cmd+Shift+M' : 'Ctrl+Shift+M'
  tryRegister(toggleVirtualMicShortcut, () => {
    mainWindow?.webContents.send('global:toggle-virtual-mic')
  })

  // Ctrl+Shift+1..9 NAO sao mais registrados aqui: agora pertencem aos atalhos
  // de voz (registerVoiceShortcuts), registrados conforme o usuario cria. Isso
  // elimina a colisao em que as frases rapidas tomavam esses slots primeiro e os
  // atalhos de voz nesses slots nunca disparavam.

  if (conflicted.length > 0) {
    const notifyRenderer = () => {
      mainWindow?.webContents.send('global:shortcut-conflict', conflicted)
    }
    if (mainWindow && !mainWindow.webContents.isLoading()) {
      notifyRenderer()
    } else {
      mainWindow?.webContents.once('did-finish-load', notifyRenderer)
    }
  }

  logMain('INFO', `Global shortcuts registered (${conflicted.length} conflicts)`)
}

export function registerVoiceShortcuts(shortcuts: VoiceShortcut[]): { ok: boolean; conflicted: string[] } {
  for (const accelerator of registeredVoiceShortcuts) {
    globalShortcut.unregister(accelerator)
  }
  registeredVoiceShortcuts.clear()

  const conflicted: string[] = []
  for (const shortcut of shortcuts) {
    if (!shortcut.enabled || !shortcut.hotkey) continue
    let ok = false
    try {
      ok = globalShortcut.register(shortcut.hotkey, () => {
        if (!mainWindow) return
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.webContents.send('global:speak-voice-shortcut', shortcut.id)
      })
    } catch (error) {
      logMain('WARN', `Voice shortcut register failed for ${shortcut.hotkey}: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (ok) {
      registeredVoiceShortcuts.add(shortcut.hotkey)
    } else {
      conflicted.push(shortcut.hotkey)
      logMain('WARN', `Voice shortcut hotkey not available: ${shortcut.hotkey} (${shortcut.name})`)
    }
  }
  logMain('INFO', `Voice shortcuts registered (${registeredVoiceShortcuts.size} active, ${conflicted.length} conflicts)`)
  return { ok: conflicted.length === 0, conflicted }
}

function setupShortcutsIpc(): void {
  ipcMain.handle('shortcuts:reregister', (_, shortcuts: VoiceShortcut[]) => {
    return registerVoiceShortcuts(Array.isArray(shortcuts) ? shortcuts : [])
  })
}

function loadAndRegisterVoiceShortcuts(): void {
  try {
    const settings = loadSettings()
    const shortcuts = Array.isArray(settings.voiceShortcuts) ? settings.voiceShortcuts : []
    if (shortcuts.length > 0) {
      registerVoiceShortcuts(shortcuts)
    }
  } catch (error) {
    logMain('WARN', `Failed to load voice shortcuts on boot: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function getBackendManager(): PythonBackendManager | null {
  return backendManager
}
