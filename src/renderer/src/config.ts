export const APP_CONFIG = {
  name: 'VoiceLaunch TTS',
  version: '1.3.0',
  backendUrl: 'http://127.0.0.1:9472',
  wsUrl: 'ws://127.0.0.1:9472/ws/tts-stream',
  supportedModels: [
    { id: 'piper', name: 'Piper TTS', ptBr: true, cloning: false, cpuOnly: true },
    { id: 'kokoro', name: 'Kokoro', ptBr: true, cloning: false, cpuOnly: false },
    { id: 'melotts', name: 'MeloTTS', ptBr: true, cloning: false, cpuOnly: true },
    { id: 'xtts_v2', name: 'XTTS v2', ptBr: true, cloning: true, cpuOnly: false },
    { id: 'fish_speech', name: 'Fish Speech', ptBr: false, cloning: true, cpuOnly: false },
    { id: 'bark', name: 'Bark', ptBr: false, cloning: false, cpuOnly: false },
  ]
}
