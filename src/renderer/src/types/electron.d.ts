import type {
  HardwareInfo,
  DownloadProgress,
  DownloadComplete,
  InstalledModel,
  TTSRequest,
  TTSResponse,
  CloneRequest,
  CloneResponse,
  CloneProgress,
  ClonedVoice,
  AudioDevice,
  BackendStatus,
  ModelInfo,
  AppSettings,
} from '../../../shared/types'

export interface Api {
  getHardwareInfo: () => Promise<HardwareInfo>
  downloadModel: (modelId: string, variant?: string) => Promise<void>
  cancelDownload: (modelId: string) => Promise<boolean>
  onDownloadProgress: (callback: (data: DownloadProgress) => void) => () => void
  onDownloadComplete: (callback: (data: DownloadComplete) => void) => () => void
  listInstalledModels: () => Promise<InstalledModel[]>
  uninstallModel: (modelId: string) => Promise<boolean>
  installModelDeps: (modelId: string) => Promise<{ success: boolean; error?: string }>
  getModelDepsStatus: (modelId: string) => Promise<{ installed: boolean }>
  getModelRegistry: () => Promise<ModelInfo[]>
  synthesize: (request: TTSRequest) => Promise<TTSResponse>
  playAudio: (audioPath: string) => Promise<void>
  stopAudio: () => Promise<void>
  startStream: (request: TTSRequest) => Promise<void>
  stopStream: () => Promise<void>
  cloneVoice: (request: CloneRequest) => Promise<CloneResponse>
  onCloneProgress: (callback: (data: CloneProgress) => void) => () => void
  listClonedVoices: () => Promise<ClonedVoice[]>
  deleteClonedVoice: (voiceId: string) => Promise<boolean>
  saveAudioBlob: (arrayBuffer: ArrayBuffer, ext: string) => Promise<string>
  setVirtualMic: (enabled: boolean) => Promise<boolean>
  getVirtualMicStatus: () => Promise<boolean>
  listAudioDevices: () => Promise<AudioDevice[]>
  installVBCable: () => Promise<{ success: boolean; launched?: boolean; message?: string; error?: string }>
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  setAlwaysOnTop: (value: boolean) => void
  setCompactMode: (enabled: boolean) => void
  openExternal: (url: string) => void
  getBackendStatus: () => Promise<BackendStatus>
  restartBackend: () => Promise<boolean>
  showNotification: (title: string, body: string) => void
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>
  installUpdate: () => Promise<boolean>
  getAppVersion: () => Promise<string>
  onUpdaterChecking: (callback: () => void) => () => void
  onUpdaterAvailable: (callback: (data: any) => void) => () => void
  onUpdaterNotAvailable: (callback: () => void) => () => void
  onUpdaterProgress: (callback: (data: any) => void) => () => void
  onUpdaterDownloaded: (callback: (data: any) => void) => () => void
  onUpdaterError: (callback: (msg: string) => void) => () => void
  onGlobalFocusTTS: (callback: () => void) => () => void
  onGlobalStopAudio: (callback: () => void) => () => void
  onGlobalOpenCompact: (callback: () => void) => () => void
  onGlobalSpeakQuickPhrase: (callback: (index: number) => void) => () => void
  onGlobalToggleVirtualMic: (callback: () => void) => () => void
  loadSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<boolean>
  getLogs: () => Promise<{ main: string; python: string }>
  clearLogs: () => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: Api
  }
}

export {}
