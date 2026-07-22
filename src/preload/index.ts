import { contextBridge, ipcRenderer } from 'electron'
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
  BackendDiagnostics,
  PlaybackRoutingResult,
  ModelInfo,
  AppSettings,
  ModelRuntimeResponse,
  CloudVoice,
  VoiceShortcut,
  VBCableInstallResult,
  VBCableDownloadProgress,
  VBCableDownloadComplete,
  VirtualMicStatus,
} from '../shared/types'

export type {
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
  BackendDiagnostics,
  PlaybackRoutingResult,
  ModelInfo,
  AppSettings,
  ModelRuntimeResponse,
  CloudVoice,
  VoiceShortcut,
  VBCableInstallResult,
  VBCableDownloadProgress,
  VBCableDownloadComplete,
  VirtualMicStatus,
}

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
  loadModel: (modelId: string) => Promise<ModelRuntimeResponse>
  unloadModel: (modelId: string) => Promise<ModelRuntimeResponse>
  synthesize: (request: TTSRequest) => Promise<TTSResponse>
  playAudio: (audioPath: string) => Promise<PlaybackRoutingResult>
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
  installVBCable: () => Promise<VBCableInstallResult>
  downloadVBCable: () => Promise<VBCableInstallResult>
  cancelVBCableDownload: () => Promise<boolean>
  refreshVirtualMic: () => Promise<VirtualMicStatus & { success: boolean }>
  onVBCableDownloadProgress: (callback: (data: VBCableDownloadProgress) => void) => () => void
  onVBCableDownloadComplete: (callback: (data: VBCableDownloadComplete) => void) => () => void
  listCloudVoices: (forceRefresh?: boolean) => Promise<{ success: boolean; voices: CloudVoice[]; error?: string }>
  synthesizeCloud: (payload: { text: string; voice: string; speed?: number; pitch?: number }) => Promise<{ success: boolean; audioBase64?: string; mimeType?: string; error?: string }>
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
  onGlobalShortcutConflict: (callback: (conflicted: string[]) => void) => () => void
  reregisterVoiceShortcuts: (shortcuts: VoiceShortcut[]) => Promise<{ ok: boolean; conflicted: string[] }>
  onGlobalSpeakVoiceShortcut: (callback: (shortcutId: string) => void) => () => void
  loadSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<boolean>
  getLogs: () => Promise<{ main: string; python: string }>
  clearLogs: () => Promise<boolean>
}

const api: Api = {
  getHardwareInfo: () => ipcRenderer.invoke('hardware:get-info'),

  downloadModel: (modelId, variant) => ipcRenderer.invoke('model:download', modelId, variant),
  cancelDownload: (modelId) => ipcRenderer.invoke('model:cancel-download', modelId),
  onDownloadProgress: (callback) => {
    const handler = (_: unknown, data: DownloadProgress) => callback(data)
    ipcRenderer.on('model:download:progress', handler)
    return () => ipcRenderer.removeListener('model:download:progress', handler)
  },
  onDownloadComplete: (callback) => {
    const handler = (_: unknown, data: DownloadComplete) => callback(data)
    ipcRenderer.on('model:download:complete', handler)
    return () => ipcRenderer.removeListener('model:download:complete', handler)
  },
  listInstalledModels: () => ipcRenderer.invoke('model:list-installed'),
  uninstallModel: (modelId) => ipcRenderer.invoke('model:uninstall', modelId),
  installModelDeps: (modelId) => ipcRenderer.invoke('model:install-deps', modelId),
  getModelDepsStatus: (modelId) => ipcRenderer.invoke('model:deps-status', modelId),
  getModelRegistry: () => ipcRenderer.invoke('model:registry'),
  loadModel: (modelId) => ipcRenderer.invoke('model:load', modelId),
  unloadModel: (modelId) => ipcRenderer.invoke('model:unload', modelId),

  synthesize: (request) => ipcRenderer.invoke('tts:synthesize', request),
  playAudio: (audioPath) => ipcRenderer.invoke('tts:play', audioPath),
  stopAudio: () => ipcRenderer.invoke('tts:stop'),

  startStream: (request) => ipcRenderer.invoke('tts:stream-start', request),
  stopStream: () => ipcRenderer.invoke('tts:stream-stop'),

  cloneVoice: (request) => ipcRenderer.invoke('voice:clone', request),
  onCloneProgress: (callback) => {
    const handler = (_: unknown, data: CloneProgress) => callback(data)
    ipcRenderer.on('voice:clone:progress', handler)
    return () => ipcRenderer.removeListener('voice:clone:progress', handler)
  },
  listClonedVoices: () => ipcRenderer.invoke('voice:list'),
  deleteClonedVoice: (voiceId) => ipcRenderer.invoke('voice:delete', voiceId),
  saveAudioBlob: (arrayBuffer, ext) => ipcRenderer.invoke('voice:save-audio', arrayBuffer, ext),

  setVirtualMic: (enabled) => ipcRenderer.invoke('mic:route', enabled),
  getVirtualMicStatus: () => ipcRenderer.invoke('mic:status'),
  listAudioDevices: () => ipcRenderer.invoke('audio:devices'),
  installVBCable: () => ipcRenderer.invoke('mic:install-vb-cable'),
  downloadVBCable: () => ipcRenderer.invoke('mic:download-vb-cable'),
  cancelVBCableDownload: () => ipcRenderer.invoke('mic:cancel-vb-cable-download'),
  refreshVirtualMic: () => ipcRenderer.invoke('mic:refresh'),
  onVBCableDownloadProgress: (callback) => {
    const handler = (_: unknown, data: VBCableDownloadProgress) => callback(data)
    ipcRenderer.on('mic:vbcable:download:progress', handler)
    return () => ipcRenderer.removeListener('mic:vbcable:download:progress', handler)
  },
  onVBCableDownloadComplete: (callback) => {
    const handler = (_: unknown, data: VBCableDownloadComplete) => callback(data)
    ipcRenderer.on('mic:vbcable:download:complete', handler)
    return () => ipcRenderer.removeListener('mic:vbcable:download:complete', handler)
  },
  listCloudVoices: (forceRefresh) => ipcRenderer.invoke('cloud:list-voices', forceRefresh),
  synthesizeCloud: (payload) => ipcRenderer.invoke('cloud:synthesize', payload),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  setAlwaysOnTop: (value) => ipcRenderer.send('window:always-on-top', value),
  setCompactMode: (enabled) => ipcRenderer.send('window:set-compact', enabled),
  openExternal: (url) => ipcRenderer.send('shell:open-external', url),

  getBackendStatus: () => ipcRenderer.invoke('backend:status'),
  restartBackend: () => ipcRenderer.invoke('backend:restart'),
  showNotification: (title, body) => ipcRenderer.send('notification:show', title, body),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getAppVersion: () => ipcRenderer.invoke('updater:version'),
  onUpdaterChecking: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('updater:checking', handler)
    return () => ipcRenderer.removeListener('updater:checking', handler)
  },
  onUpdaterAvailable: (callback) => {
    const handler = (_: unknown, data: any) => callback(data)
    ipcRenderer.on('updater:available', handler)
    return () => ipcRenderer.removeListener('updater:available', handler)
  },
  onUpdaterNotAvailable: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('updater:not-available', handler)
    return () => ipcRenderer.removeListener('updater:not-available', handler)
  },
  onUpdaterProgress: (callback) => {
    const handler = (_: unknown, data: any) => callback(data)
    ipcRenderer.on('updater:progress', handler)
    return () => ipcRenderer.removeListener('updater:progress', handler)
  },
  onUpdaterDownloaded: (callback) => {
    const handler = (_: unknown, data: any) => callback(data)
    ipcRenderer.on('updater:downloaded', handler)
    return () => ipcRenderer.removeListener('updater:downloaded', handler)
  },
  onUpdaterError: (callback) => {
    const handler = (_: unknown, msg: string) => callback(msg)
    ipcRenderer.on('updater:error', handler)
    return () => ipcRenderer.removeListener('updater:error', handler)
  },
  onGlobalFocusTTS: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('global:focus-tts', handler)
    return () => ipcRenderer.removeListener('global:focus-tts', handler)
  },
  onGlobalStopAudio: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('global:stop-audio', handler)
    return () => ipcRenderer.removeListener('global:stop-audio', handler)
  },
  onGlobalOpenCompact: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('global:open-compact', handler)
    return () => ipcRenderer.removeListener('global:open-compact', handler)
  },
  onGlobalSpeakQuickPhrase: (callback) => {
    const handler = (_: unknown, index: number) => callback(index)
    ipcRenderer.on('global:speak-quick-phrase', handler)
    return () => ipcRenderer.removeListener('global:speak-quick-phrase', handler)
  },
  onGlobalToggleVirtualMic: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('global:toggle-virtual-mic', handler)
    return () => ipcRenderer.removeListener('global:toggle-virtual-mic', handler)
  },
  onGlobalShortcutConflict: (callback) => {
    const handler = (_: unknown, conflicted: string[]) => callback(conflicted)
    ipcRenderer.on('global:shortcut-conflict', handler)
    return () => ipcRenderer.removeListener('global:shortcut-conflict', handler)
  },
  reregisterVoiceShortcuts: (shortcuts) => ipcRenderer.invoke('shortcuts:reregister', shortcuts),
  onGlobalSpeakVoiceShortcut: (callback) => {
    const handler = (_: unknown, shortcutId: string) => callback(shortcutId)
    ipcRenderer.on('global:speak-voice-shortcut', handler)
    return () => ipcRenderer.removeListener('global:speak-voice-shortcut', handler)
  },
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  getLogs: () => ipcRenderer.invoke('logs:get'),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error('Failed to expose API:', error)
  }
} else {
  // @ts-ignore
  window.electronAPI = api
}
