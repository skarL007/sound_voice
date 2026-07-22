import { app } from 'electron'
import { join } from 'path'

export const VOICELAUNCH_ENV = {
  modelRegistryPath: 'VOICELAUNCH_MODEL_REGISTRY_PATH',
  userData: 'VOICELAUNCH_USER_DATA',
  pythonPath: 'VOICELAUNCH_PYTHON_PATH',
  backendToken: 'VOICELAUNCH_BACKEND_TOKEN',
} as const

const USER_DATA_DIRNAME = 'voicelaunch-tts'

function getUserData(): string {
  try {
    return app.getPath('userData')
  } catch {
    // Fallback before app is ready
    return join(process.env.APPDATA || process.env.HOME || '.', USER_DATA_DIRNAME)
  }
}

function getResourcesPath(): string {
  if (process.resourcesPath) return process.resourcesPath
  try {
    return app.getAppPath()
  } catch {
    return process.cwd()
  }
}

export function getBundledVBCableInstallerCandidates(): string[] {
  const resourcesPath = getResourcesPath()
  return [
    join(resourcesPath, 'vbcable', 'VBCABLE_Setup.exe'),
    join(resourcesPath, 'assets', 'vbcable', 'VBCABLE_Setup.exe'),
  ]
}

/**
 * VB-Cable (VB-Audio) — donationware; baixar/redistribuir e permitido desde que
 * a origem permaneca visivel ao usuario. Distribuido como ZIP; a VB-Audio nao
 * publica SHA-256 oficial. Ao sair um novo driver pack, atualize a URL (e o
 * checksum, se for fixar: baixe o ZIP e rode `Get-FileHash -Algorithm SHA256`).
 */
export const VBCABLE_DOWNLOAD = {
  url: 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip',
  sha256: 'b950e39f01af1d04ea623c8f6d8eb9b6ea5c477c637295fabf20631c85116bfb', // VBCABLE_Driver_Pack45.zip (1.29 MB)
  setupExeX64: 'VBCABLE_Setup_x64.exe',
  setupExe: 'VBCABLE_Setup.exe',
  officialSite: 'https://vb-audio.com/Cable/',
} as const

export function isAutoUpdateEnabled(): boolean {
  return app.isPackaged && process.env.VOICELAUNCH_ENABLE_AUTO_UPDATE === 'true'
}

export function getModelRegistryPath(): string {
  return join(getResourcesPath(), 'assets', 'model-registry.json')
}

export const APP_CONFIG = {
  name: 'VoiceLaunch TTS',
  version: '1.0.0',
  backendPort: 9472,
  backendHost: '127.0.0.1',
  get userDataPath() { return getUserData() },
  get modelRegistryPath() { return getModelRegistryPath() },
  get modelsDir() { return join(getUserData(), 'models') },
  get voicesDir() { return join(getUserData(), 'voices') },
  get logsDir() { return join(getUserData(), 'logs') },
  get vbCableInstaller() { return getBundledVBCableInstallerCandidates()[0] },
}
