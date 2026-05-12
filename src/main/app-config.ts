import { app } from 'electron'
import { join } from 'path'

function getUserData(): string {
  try {
    return app.getPath('userData')
  } catch {
    // Fallback before app is ready
    return join(process.env.APPDATA || process.env.HOME || '.', 'VoiceLaunch')
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

export function isAutoUpdateEnabled(): boolean {
  return app.isPackaged && process.env.VOICELAUNCH_ENABLE_AUTO_UPDATE === 'true'
}

export const APP_CONFIG = {
  name: 'VoiceLaunch TTS',
  version: '1.0.0',
  backendPort: 9472,
  backendHost: '127.0.0.1',
  get userDataPath() { return getUserData() },
  get modelsDir() { return join(getUserData(), 'models') },
  get voicesDir() { return join(getUserData(), 'voices') },
  get logsDir() { return join(getUserData(), 'logs') },
  get vbCableInstaller() { return getBundledVBCableInstallerCandidates()[0] },
}
