// Chaines du processus main : cle plate -> texte, interpolation {{var}}.
export const en: Record<string, string> = {
  'edgeTts.voicesFetchFailed': 'Failed to fetch Edge TTS voices: HTTP {{status}}',
  'edgeTts.emptyText': 'Empty text.',
  'edgeTts.voiceNotFound': 'Voice not found: {{voice}}',
  'edgeTts.timeout': 'Edge TTS timeout (30s)',
  'edgeTts.rejected': 'Edge TTS rejected: {{body}}',
  'edgeTts.connectionRejected': 'Edge TTS rejected the connection: HTTP {{status}}. Try updating the app.',
  'edgeTts.noAudio': 'No valid audio received from Edge TTS ({{bytes}} bytes). Check Logs.',
  'ipc.vbcableBundledMissing': 'The bundled installer is not available. The official website was opened for manual download.',
  'ipc.vbcableTempFolder': 'Could not create temporary folder: {{error}}',
  'ipc.vbcableDownloadFailed': 'Could not download automatically. The official website was opened.',
  'ipc.vbcableExtractFailed': 'Downloaded, but could not extract the package. The official website was opened.',
  'ipc.vbcableInstallerMissing': 'Installer not found in the downloaded package.',
  'ipc.vbcableLaunchFailed': 'Downloaded the installer but could not open it ({{error}}). Run it manually as administrator: {{path}}',
}
