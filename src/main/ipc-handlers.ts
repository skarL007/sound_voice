import { ipcMain, shell, Notification, app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { spawn } from 'child_process'
import { getMainWindow, getBackendManager } from './index'
import { detectHardware } from './hardware-detector'
import { downloadModelWithProgress, downloadFileWithProgress, cancelDownload } from './download-manager'
import { loadSettings, saveSettings } from './settings-store'
import { logMain, getLogs, clearLogs } from './logger'
import { join, relative, isAbsolute, resolve, dirname } from 'path'
import { existsSync, readdirSync, statSync, unlinkSync, rmdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { validateModelId, validateAudioExtension, isHttpUrl } from './security-utils'
import { getBundledVBCableInstallerCandidates, isAutoUpdateEnabled, VBCABLE_DOWNLOAD } from './app-config'
import { listEdgeVoices, synthesizeEdgeTTS } from './edge-tts-client'

const USER_DATA = app.getPath('userData')
const MODELS_DIR = join(USER_DATA, 'models')
const VOICES_DIR = join(USER_DATA, 'voices')

if (!existsSync(MODELS_DIR)) mkdirSync(MODELS_DIR, { recursive: true })
if (!existsSync(VOICES_DIR)) mkdirSync(VOICES_DIR, { recursive: true })

// Registry de modelos
const MODEL_REGISTRY_PATH = join(__dirname, '../../assets/model-registry.json')

function loadModelRegistry(): any[] {
  try {
    const data = readFileSync(MODEL_REGISTRY_PATH, 'utf-8')
    return JSON.parse(data).models
  } catch {
    return []
  }
}

function getBackendUrl(): string {
  const backend = getBackendManager()
  const port = backend?.getStatus().port || 9472
  return `http://127.0.0.1:${port}`
}

export function registerIpcHandlers(): void {
  // Window controls
  ipcMain.on('window:minimize', () => {
    getMainWindow()?.minimize()
  })
  ipcMain.on('window:maximize', () => {
    const win = getMainWindow()
    if (win?.isMaximized()) win?.unmaximize()
    else win?.maximize()
  })
  ipcMain.on('window:close', () => {
    getMainWindow()?.close()
  })
  ipcMain.on('window:always-on-top', (_, value: boolean) => {
    getMainWindow()?.setAlwaysOnTop(value, 'floating')
  })

  ipcMain.on('window:set-compact', (_, enabled: boolean) => {
    const win = getMainWindow()
    if (!win) return
    if (enabled) {
      win.setSize(480, 420)
      win.setMinimumSize(360, 320)
      win.setAlwaysOnTop(true, 'floating')
    } else {
      win.setSize(1280, 800)
      win.setMinimumSize(900, 600)
    }
  })
  ipcMain.on('shell:open-external', (_, url: string) => {
    if (!isHttpUrl(url)) {
      logMain('WARN', `Blocked openExternal for invalid URL: ${url}`)
      return
    }
    shell.openExternal(url)
  })

  // Hardware
  ipcMain.handle('hardware:get-info', async () => {
    return detectHardware()
  })

  // Backend
  ipcMain.handle('backend:status', async () => {
    return getBackendManager()?.getStatus() || { running: false, port: 9472, version: '1.0.0', uptime: 0, phase: 'idle' }
  })
  ipcMain.handle('backend:restart', async () => {
    return getBackendManager()?.restart()
  })

  // Models
  ipcMain.handle('model:list-installed', async () => {
    const installed: any[] = []
    if (!existsSync(MODELS_DIR)) return installed

    const entries = readdirSync(MODELS_DIR)
    for (const entry of entries) {
      const modelPath = join(MODELS_DIR, entry)
      const stat = statSync(modelPath)
      if (stat.isDirectory()) {
        installed.push({
          id: entry,
          name: entry,
          version: '1.0.0',
          size: getFolderSize(modelPath),
          path: modelPath,
          isLoaded: false
        })
      }
    }
    return installed
  })

  ipcMain.handle('model:download', async (_, modelId: string, variant?: string) => {
    const window = getMainWindow()
    if (!window) return false

    const registry = loadModelRegistry()
    const model = registry.find((m: any) => m.id === modelId)
    if (!model) return false

    const downloadUrl = variant && model.variants?.[variant]
      ? model.variants[variant].url
      : model.downloadUrl

    const destination = join(MODELS_DIR, modelId, model.filename || 'model.bin')

    // Download main model file
    downloadModelWithProgress({
      modelId,
      url: downloadUrl,
      destination,
      checksum: model.checksum
    }, window)

    // Download config file if specified (e.g., Piper .json config)
    if (model.configUrl) {
      const configDest = join(MODELS_DIR, modelId, model.configFilename || 'config.json')
      downloadModelWithProgress({
        modelId: `${modelId}_config`,
        url: model.configUrl,
        destination: configDest,
      }, window).catch(() => {
        // Config download failure is non-fatal
      })
    }

    return true
  })

  ipcMain.handle('model:load', async (_, modelId: string) => {
    try {
      validateModelId(modelId)
    } catch {
      logMain('WARN', `Blocked model:load for invalid modelId: ${modelId}`)
      return { success: false, error: 'Invalid modelId' }
    }
    try {
      const query = new URLSearchParams({ modelId })
      const response = await fetch(`${getBackendUrl()}/models/load?${query.toString()}`, {
        method: 'POST',
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('model:unload', async (_, modelId: string) => {
    try {
      validateModelId(modelId)
    } catch {
      logMain('WARN', `Blocked model:unload for invalid modelId: ${modelId}`)
      return { success: false, error: 'Invalid modelId' }
    }
    try {
      const query = new URLSearchParams({ modelId })
      const response = await fetch(`${getBackendUrl()}/models/unload?${query.toString()}`, {
        method: 'POST',
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('model:uninstall', async (_, modelId: string) => {
    try {
      validateModelId(modelId)
    } catch {
      logMain('WARN', `Blocked uninstall for invalid modelId: ${modelId}`)
      return false
    }
    const modelPath = join(MODELS_DIR, modelId)
    if (existsSync(modelPath)) {
      try {
        deleteFolderRecursive(modelPath)
        return true
      } catch {
        return false
      }
    }
    return false
  })

  ipcMain.handle('model:cancel-download', async (_, modelId: string) => {
    return cancelDownload(modelId)
  })

  ipcMain.handle('model:install-deps', async (_, modelId: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/models/install-deps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('model:deps-status', async (_, modelId: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/models/deps-status/${modelId}`)
      return await response.json()
    } catch {
      return { installed: false }
    }
  })

  ipcMain.handle('model:registry', async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/models`)
      return await response.json()
    } catch {
      return []
    }
  })

  // TTS
  ipcMain.handle('tts:synthesize', async (_, request) => {
    try {
      const response = await fetch(`${getBackendUrl()}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('tts:play', async (_, audioPath: string) => {
    try {
      await fetch(`${getBackendUrl()}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath })
      })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('tts:stop', async () => {
    try {
      await fetch(`${getBackendUrl()}/stop`, { method: 'POST' })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('tts:stream-start', async () => {
    // WebSocket connection is managed by renderer directly
    return true
  })

  ipcMain.handle('tts:stream-stop', async () => {
    return true
  })

  // Voice cloning
  ipcMain.handle('voice:clone', async (_, request) => {
    try {
      const response = await fetch(`${getBackendUrl()}/voice/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('voice:list', async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/voice/list`)
      return await response.json()
    } catch {
      return []
    }
  })

  ipcMain.handle('voice:delete', async (_, voiceId: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/voice/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId })
      })
      return (await response.json()).success
    } catch {
      return false
    }
  })

  // Virtual mic
  ipcMain.handle('mic:route', async (_, enabled: boolean) => {
    try {
      const response = await fetch(`${getBackendUrl()}/mic/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      return (await response.json()).success
    } catch {
      return false
    }
  })

  ipcMain.handle('mic:status', async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/mic/status`)
      return (await response.json()).enabled
    } catch {
      return false
    }
  })

  // Re-escaneia os dispositivos no backend para detectar um VB-Cable recem-instalado
  // sem precisar reiniciar o app.
  ipcMain.handle('mic:refresh', async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/mic/refresh`, { method: 'POST' })
      return await response.json()
    } catch (error) {
      return { success: false, enabled: false, available: false, deviceName: null, error: String(error) }
    }
  })

  ipcMain.handle('audio:devices', async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/audio/devices`)
      return await response.json()
    } catch {
      return []
    }
  })

  ipcMain.handle('mic:install-vb-cable', async () => {
    const installerPath = getBundledVBCableInstallerCandidates().find((candidate) => existsSync(candidate))
    if (installerPath) {
      logMain('INFO', `Launching VB-Cable installer: ${installerPath}`)
      const openError = await launchInstaller(installerPath)
      if (!openError) {
        return { success: true, launched: true }
      }
      logMain('ERROR', `Failed to launch VB-Cable installer: ${openError}`)
      return { success: false, error: openError }
    }
    // Fallback: open official website
    shell.openExternal('https://vb-audio.com/Cable/')
    return {
      success: true,
      launched: false,
      message: 'O instalador do pacote nao esta disponivel. O site oficial foi aberto para download manual.',
    }
  })

  // Fluxo automatico: usa o instalador embutido se existir; senao baixa o ZIP
  // oficial da VB-Audio, extrai e lanca o instalador (o usuario confirma 1 vez).
  ipcMain.handle('mic:download-vb-cable', async () => {
    const window = getMainWindow()
    const sendComplete = (payload: { success: boolean; error?: string }) =>
      window?.webContents.send('mic:vbcable:download:complete', payload)

    // 1. Prefere o instalador embutido (offline, sem depender de rede).
    const bundled = getBundledVBCableInstallerCandidates().find((candidate) => existsSync(candidate))
    if (bundled) {
      const openError = await launchInstaller(bundled)
      if (!openError) {
        sendComplete({ success: true })
        return { success: true, launched: true, downloaded: false }
      }
      logMain('WARN', `Bundled VB-Cable launch failed (${openError}), will try download`)
    }

    // 2. Baixa o ZIP para ProgramData (fora do perfil do usuario). Critico:
    // em contas PADRAO (nao-admin) o UAC eleva para OUTRA conta de admin, que
    // nao acessa o AppData do usuario — por isso RunAs de um exe em AppData
    // falha com "The system cannot find the file specified". ProgramData e
    // gravavel pelo usuario E acessivel ao admin que eleva, entao o RunAs
    // funciona em conta padrao e em conta de admin.
    const programData = process.env.ProgramData || process.env.ALLUSERSPROFILE || 'C:\\ProgramData'
    const workDir = join(programData, 'VoiceLaunch TTS', 'vbcable')
    try {
      if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true })
    } catch (e) {
      const error = `Nao foi possivel criar a pasta temporaria: ${e}`
      sendComplete({ success: false, error })
      return { success: false, error }
    }
    const zipPath = join(workDir, 'VBCABLE_Driver_Pack.zip')

    try {
      logMain('INFO', `Downloading VB-Cable from ${VBCABLE_DOWNLOAD.url}`)
      await downloadFileWithProgress(
        {
          id: 'vbcable',
          url: VBCABLE_DOWNLOAD.url,
          destination: zipPath,
          checksum: VBCABLE_DOWNLOAD.sha256 || undefined,
        },
        (info) => window?.webContents.send('mic:vbcable:download:progress', info),
      )
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      logMain('ERROR', `VB-Cable download failed: ${error}`)
      sendComplete({ success: false, error })
      shell.openExternal(VBCABLE_DOWNLOAD.officialSite)
      return {
        success: true,
        launched: false,
        downloaded: false,
        message: 'Nao foi possivel baixar automaticamente. O site oficial foi aberto.',
      }
    }

    // 3. Extrai o ZIP (tar.exe nativo, com fallback para PowerShell).
    try {
      await extractZip(zipPath, workDir)
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      logMain('ERROR', `VB-Cable extract failed: ${error}`)
      sendComplete({ success: false, error })
      shell.openExternal(VBCABLE_DOWNLOAD.officialSite)
      return {
        success: true,
        launched: false,
        downloaded: true,
        message: 'Baixado, mas nao consegui extrair o pacote. O site oficial foi aberto.',
      }
    }

    // 4. Seleciona o instalador certo para a arquitetura.
    const order =
      process.arch === 'x64'
        ? [VBCABLE_DOWNLOAD.setupExeX64, VBCABLE_DOWNLOAD.setupExe]
        : [VBCABLE_DOWNLOAD.setupExe, VBCABLE_DOWNLOAD.setupExeX64]
    const exePath = order.map((name) => join(workDir, name)).find((p) => existsSync(p))
    if (!exePath) {
      const error = 'Instalador nao encontrado no pacote baixado.'
      sendComplete({ success: false, error })
      return { success: false, downloaded: true, error }
    }

    // 5. Lanca o instalador oficial via ShellExecute (dispara o UAC se necessario).
    logMain('INFO', `Launching downloaded VB-Cable installer: ${exePath}`)
    const launchError = await launchInstaller(exePath)
    if (launchError) {
      logMain('ERROR', `VB-Cable installer launch failed: ${launchError}`)
      sendComplete({ success: false, error: launchError })
      return {
        success: false,
        downloaded: true,
        error: launchError,
        message: `Baixei o instalador, mas nao consegui abri-lo (${launchError}). Execute manualmente como administrador: ${exePath}`,
      }
    }
    sendComplete({ success: true })
    return { success: true, launched: true, downloaded: true }
  })

  ipcMain.handle('mic:cancel-vb-cable-download', async () => {
    return cancelDownload('vbcable')
  })

  // Voice cloning: save audio blob to disk so Python backend can read it
  ipcMain.handle('voice:save-audio', async (_, arrayBuffer: ArrayBuffer, ext: string) => {
    let cleanExt: string
    try {
      cleanExt = validateAudioExtension(ext)
    } catch {
      logMain('WARN', `Blocked save-audio for invalid extension: ${ext}`)
      throw new Error('Invalid file extension')
    }
    const tempDir = join(USER_DATA, 'temp')
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })
    const fileName = `clone_${Date.now()}.${cleanExt}`
    const filePath = join(tempDir, fileName)
    const resolvedPath = resolve(filePath)
    const rel = relative(tempDir, resolvedPath)
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error('Path escape detected')
    }
    const buffer = Buffer.from(arrayBuffer)
    writeFileSync(filePath, buffer)
    return filePath
  })

  // Cloud TTS (Edge TTS)
  ipcMain.handle('cloud:list-voices', async (_, forceRefresh?: boolean) => {
    try {
      const voices = await listEdgeVoices(Boolean(forceRefresh))
      return { success: true, voices }
    } catch (error) {
      logMain('WARN', `Edge TTS list-voices failed: ${error instanceof Error ? error.message : String(error)}`)
      return { success: false, voices: [], error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('cloud:synthesize', async (_, payload: { text: string; voice: string; speed?: number; pitch?: number }) => {
    try {
      const buffer = await synthesizeEdgeTTS(payload)
      return { success: true, audioBase64: buffer.toString('base64'), mimeType: 'audio/webm' }
    } catch (error) {
      logMain('WARN', `Edge TTS synthesize failed: ${error instanceof Error ? error.message : String(error)}`)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // Settings persistence
  ipcMain.handle('settings:load', () => {
    return loadSettings()
  })

  ipcMain.handle('settings:save', (_, settings) => {
    saveSettings(settings)
    return true
  })

  // Logs
  ipcMain.handle('logs:get', () => {
    return getLogs()
  })

  ipcMain.handle('logs:clear', () => {
    clearLogs()
    return true
  })

  // Desktop notifications
  ipcMain.on('notification:show', (_, title: string, body: string) => {
    const MAX_LEN = 200
    // Strip HTML tags to prevent spoofing via injected markup
    const stripHtml = (s: string) => String(s).replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ')
    const safeTitle = stripHtml(title).slice(0, MAX_LEN)
    const safeBody = stripHtml(body).slice(0, MAX_LEN)
    if (Notification.isSupported()) {
      new Notification({
        title: safeTitle,
        body: safeBody,
        icon: join(__dirname, '../../build/icon.png'),
        silent: false,
      }).show()
    }
  })

  // Auto-updater
  ipcMain.handle('updater:check', async () => {
    if (!isAutoUpdateEnabled()) {
      return { success: false, error: 'Auto-update disabled for this build.' }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, updateInfo: result?.updateInfo }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('updater:install', async () => {
    if (!isAutoUpdateEnabled()) {
      return false
    }
    autoUpdater.quitAndInstall()
    return true
  })

  ipcMain.handle('updater:version', () => {
    return app.getVersion()
  })
}

/**
 * Lanca um instalador elevado. spawn() direto falha com EACCES para .exe com
 * manifesto requireAdministrator (e o erro chega assincrono -> crash), e o
 * shell.openPath teve comportamento inconsistente nesses .exe (retornava
 * "path does not exist" sem elevar). No Windows usamos Start-Process -Verb
 * RunAs, que dispara o UAC de forma confiavel mesmo a partir de um processo
 * nao-elevado (dev). Retorna '' em sucesso ou a mensagem de erro.
 */
async function launchInstaller(exePath: string): Promise<string> {
  if (!existsSync(exePath)) {
    return `Arquivo do instalador nao encontrado: ${exePath}`
  }
  if (process.platform !== 'win32') {
    try {
      return await shell.openPath(exePath)
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  }
  const system32 = join(process.env.SystemRoot || 'C:\\Windows', 'System32')
  const powershell = join(system32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  const installerDir = dirname(exePath)
  // -WorkingDirectory explicito e obrigatorio: sem ele o Start-Process -Verb
  // RunAs herda o cwd do processo Electron, que ao elevar resulta em
  // "The system cannot find the path specified" (ERROR_PATH_NOT_FOUND).
  const command = `Start-Process -FilePath '${exePath.replace(/'/g, "''")}' -WorkingDirectory '${installerDir.replace(/'/g, "''")}' -Verb RunAs`
  return await new Promise<string>((resolve) => {
    const ps = spawn(existsSync(powershell) ? powershell : 'powershell.exe', ['-NoProfile', '-Command', command], {
      cwd: installerDir,
      shell: false,
      windowsHide: true,
    })
    let stderr = ''
    ps.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    ps.on('error', (e) => resolve(e.message))
    ps.on('close', (code) => {
      if (code === 0) resolve('')
      else resolve(stderr.trim() || `O instalador nao foi iniciado (codigo ${code}). Voce pode ter cancelado o pedido de permissao do Windows.`)
    })
  })
}

function runProcess(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true })
    let stderr = ''
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} saiu com codigo ${code}: ${stderr.slice(0, 500)}`))
    })
  })
}

/**
 * Extrai um ZIP usando o tar.exe nativo do Windows (10 17063+); cai para o
 * Expand-Archive do PowerShell se o tar nao estiver disponivel. Evita
 * dependencias de runtime (yauzl/extract-zip nao sao empacotados).
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  const system32 = join(process.env.SystemRoot || 'C:\\Windows', 'System32')
  const tar = join(system32, 'tar.exe')
  try {
    await runProcess(existsSync(tar) ? tar : 'tar', ['-xf', zipPath, '-C', destDir])
    return
  } catch (e) {
    logMain('WARN', `tar extract failed, trying PowerShell: ${e}`)
  }
  const powershell = join(system32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  await runProcess(existsSync(powershell) ? powershell : 'powershell', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`,
  ])
}

function getFolderSize(dir: string): number {
  let size = 0
  let files: string[]
  try {
    files = readdirSync(dir)
  } catch {
    return 0
  }
  for (const file of files) {
    const path = join(dir, file)
    try {
      const stat = statSync(path)
      if (stat.isDirectory()) {
        size += getFolderSize(path)
      } else {
        size += stat.size
      }
    } catch {
      // File deleted between readdir and stat — skip silently
    }
  }
  return size
}

function deleteFolderRecursive(dir: string): void {
  if (!existsSync(dir)) return
  let files: string[]
  try {
    files = readdirSync(dir)
  } catch {
    return
  }
  for (const file of files) {
    const path = join(dir, file)
    try {
      const stat = statSync(path)
      if (stat.isDirectory()) {
        deleteFolderRecursive(path)
      } else {
        unlinkSync(path)
      }
    } catch {
      // Already gone — skip
    }
  }
  try { rmdirSync(dir) } catch { /* ignore if already removed */ }
}
