// Shared types between main, preload, and renderer

export interface HardwareInfo {
  cpu: string
  cpuCores: number
  cpuThreads: number
  ramGB: number
  gpu: string
  gpuVRAM: number
  gpuVendor: string
  os: string
  osVersion: string
  isCudaAvailable: boolean
  cudaVersion: string
  isRocmAvailable: boolean
  rocmVersion: string
  isDirectMLAvailable: boolean
  recommendedTier: string
}

export interface DownloadProgress {
  modelId: string
  percent: number
  speed: string
  eta: string
}

export interface DownloadComplete {
  modelId: string
  success: boolean
  error?: string
}

export interface InstalledModel {
  id: string
  name: string
  version: string
  size: number
  path: string
  isLoaded: boolean
}

export interface TTSRequest {
  text: string
  modelId: string
  voiceId?: string
  speed?: number
  language?: string
  outputDevice?: string
}

export interface TTSResponse {
  success: boolean
  audioPath?: string
  duration?: number
  error?: string
}

/** Diagnostico devolvido pelo /play do backend: a voz chegou mesmo ao cabo? */
export interface PlaybackRoutingResult {
  success: boolean
  routedToVirtualMic?: boolean
  fallbackReason?: string | null
  deviceName?: string | null
}

export interface TTSHistoryItem {
  id: string
  text: string
  modelId: string
  voiceId?: string
  timestamp: number
  audioPath?: string
}

export interface CloneRequest {
  audioPath: string
  modelId: string
  name: string
  description?: string
}

export interface CloneResponse {
  success: boolean
  voiceId?: string
  error?: string
}

export interface CloneProgress {
  stage: string
  percent: number
  message: string
}

export interface ModelRuntimeResponse {
  success: boolean
  loaded?: boolean
  error?: string
}

export interface ClonedVoice {
  id: string
  name: string
  description: string
  modelId: string
  createdAt: string
  samplePath: string
}

export interface AudioDevice {
  id: string
  name: string
  isInput: boolean
  isDefault: boolean
  isVirtualCable?: boolean
}

export interface VBCableDownloadProgress {
  percent: number
  speed: string
  eta: string
}

export interface VBCableDownloadComplete {
  success: boolean
  error?: string
}

export interface VBCableInstallResult {
  success: boolean
  /** true quando o instalador foi efetivamente aberto */
  launched?: boolean
  /** true quando o instalador foi baixado pelo launcher antes de abrir */
  downloaded?: boolean
  message?: string
  error?: string
}

export interface VirtualMicStatus {
  enabled: boolean
  available: boolean
  deviceName: string | null
}

export interface CloudVoice {
  Name: string
  ShortName: string
  Gender: 'Male' | 'Female'
  Locale: string
  SuggestedCodec: string
  FriendlyName: string
  Status: string
  VoiceTag?: { ContentCategories?: string[]; VoicePersonalities?: string[] }
}

export interface BackendDiagnostics {
  authMode: 'none' | 'token'
  authenticated: boolean | null
  cliAvailable: boolean
  runnable: boolean
  command: string
  url: string
  executor: string
  detail?: string
}

export interface BackendStatus {
  running: boolean
  port: number
  version: string
  uptime: number
  phase?: 'idle' | 'starting' | 'running' | 'error'
  lastError?: string
  diagnostics?: BackendDiagnostics
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  languages: string[]
  ptBr: boolean
  mos: number
  vramMinMB: number
  cpuOk: boolean
  cloning: boolean
  license: string
  sizeMB: number
  downloadUrl: string
  filename: string
  configUrl?: string
  configFilename?: string
  tags: string[]
  installed?: boolean
  loaded?: boolean
  depsInstalled?: boolean
  variants?: Record<string, { url: string; filename?: string }>
}

export interface Profile {
  id: string
  name: string
  modelId?: string
  voiceId?: string
  speed?: number
  quickPhrases?: string[]
}

// 'auto' = o app decide (Edge online, Kokoro/Piper offline) via engineRouter.
export type VoiceSource = 'auto' | 'local' | 'cloud'

export interface VoiceShortcut {
  id: string
  name: string
  hotkey: string
  enabled: boolean
  voiceSource: VoiceSource
  voice: string
  text: string
  speed: number
  pitch?: number
}

export interface AppSettings {
  schemaVersion?: number
  alwaysOnTop?: boolean
  highContrast?: boolean
  largeFont?: boolean
  compactMode?: boolean
  virtualMicEnabled?: boolean
  defaultModelId?: string
  defaultSpeed?: number
  tutorialSeen?: boolean
  showExperimentalModels?: boolean
  ttsDraft?: string
  ttsHistory?: TTSHistoryItem[]
  quickPhrases?: string[]
  keepTextAfterSpeak?: boolean
  profiles?: Profile[]
  activeProfileId?: string
  voiceSource?: VoiceSource
  cloudVoice?: string
  cableDeviceId?: string | null
  cableDeviceLabel?: string | null
  // Monitor: onde o usuario ouve a propria voz online enquanto ela vai ao cabo.
  // 'default' = alto-falante padrao do sistema; null = nao ouvir (mudo).
  monitorDeviceId?: string | null
  monitorDeviceLabel?: string | null
  voiceShortcuts?: VoiceShortcut[]
}
