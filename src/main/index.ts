import { app, shell, BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'

import { registerIpcHandlers } from './ipc-handlers'
import { PythonBackendManager } from './python-manager'
import { logMain } from './logger'
import { isAutoUpdateEnabled } from './app-config'

let mainWindow: BrowserWindow | null = null
let backendManager: PythonBackendManager | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
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
    shell.openExternal(details.url)
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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.voicelaunch.tts')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()

  backendManager = new PythonBackendManager()
  createWindow()
  void backendManager.start().then((started) => {
    if (!started) {
      logMain('WARN', 'Python backend did not start successfully. Renderer can retry from the UI.')
    }
  })
  setupAutoUpdater()
  setupGlobalShortcuts()

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

  // Ctrl+Shift+F — Focus window and TTS input (accessibility shortcut)
  const focusShortcut = process.platform === 'darwin' ? 'Cmd+Shift+F' : 'Ctrl+Shift+F'
  globalShortcut.register(focusShortcut, () => {
    ensureWindowReady()
    mainWindow?.webContents.send('global:focus-tts')
  })

  // Ctrl+Shift+S — Stop audio immediately
  const stopShortcut = process.platform === 'darwin' ? 'Cmd+Shift+S' : 'Ctrl+Shift+S'
  globalShortcut.register(stopShortcut, () => {
    mainWindow?.webContents.send('global:stop-audio')
  })

  const openCompactShortcut = process.platform === 'darwin' ? 'Cmd+Shift+V' : 'Ctrl+Shift+V'
  globalShortcut.register(openCompactShortcut, () => {
    ensureWindowReady()
    mainWindow?.webContents.send('global:open-compact')
    setTimeout(() => {
      mainWindow?.webContents.send('global:focus-tts')
    }, 80)
  })

  const toggleVirtualMicShortcut = process.platform === 'darwin' ? 'Cmd+Shift+M' : 'Ctrl+Shift+M'
  globalShortcut.register(toggleVirtualMicShortcut, () => {
    mainWindow?.webContents.send('global:toggle-virtual-mic')
  })

  for (let index = 1; index <= 9; index += 1) {
    const quickPhraseShortcut = process.platform === 'darwin' ? `Cmd+Shift+${index}` : `Ctrl+Shift+${index}`
    globalShortcut.register(quickPhraseShortcut, () => {
      mainWindow?.webContents.send('global:speak-quick-phrase', index - 1)
    })
  }

  logMain('INFO', 'Global shortcuts registered')
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function getBackendManager(): PythonBackendManager | null {
  return backendManager
}
