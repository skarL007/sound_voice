let currentAudio: HTMLAudioElement | null = null
let currentUrl: string | null = null
let currentAudioContext: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null
let playbackToken = 0

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const buf = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function attachToAudio(audio: HTMLAudioElement, deviceId?: string): Promise<void> {
  if (deviceId && typeof (audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId === 'function') {
    try {
      await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId)
    } catch {
      // Device routing nao suportado; cai pro default output.
    }
  }
}

function trackTeardown(audio: HTMLAudioElement, url: string | null, token: number) {
  const teardown = () => {
    if (url && currentUrl === url) {
      URL.revokeObjectURL(url)
      currentUrl = null
    }
    if (token === playbackToken && currentAudio === audio) currentAudio = null
  }
  audio.addEventListener('ended', teardown)
  audio.addEventListener('error', teardown)
}

async function tryPlayWithUrl(url: string, deviceId: string | undefined, token: number): Promise<boolean> {
  const audio = new Audio(url)
  audio.preload = 'auto'
  await attachToAudio(audio, deviceId)
  if (token !== playbackToken) {
    // Cancelado antes de comecar.
    return false
  }
  currentAudio = audio
  currentUrl = url.startsWith('blob:') ? url : null
  trackTeardown(audio, currentUrl, token)
  try {
    await audio.play()
    return true
  } catch {
    return false
  }
}

async function tryPlayWithWebAudio(bytes: Uint8Array, deviceId: string | undefined, token: number): Promise<boolean> {
  // Web Audio API decodifica o container sem precisar passar pelo CSP media-src.
  // Erros sao especificos (EncodingError) em vez do generico NotSupportedError.
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    decoded = await ctx.decodeAudioData(copy)
  } catch {
    await ctx.close().catch(() => undefined)
    return false
  }
  if (token !== playbackToken) {
    await ctx.close().catch(() => undefined)
    return false
  }

  const source = ctx.createBufferSource()
  source.buffer = decoded

  if (deviceId) {
    // Para rotear pro CABLE Input precisa criar MediaStream e atribuir num <audio>.
    const dest = ctx.createMediaStreamDestination()
    source.connect(dest)
    const audio = new Audio()
    audio.srcObject = dest.stream
    audio.preload = 'auto'
    await attachToAudio(audio, deviceId)
    if (token !== playbackToken) {
      await ctx.close().catch(() => undefined)
      return false
    }
    currentAudio = audio
    currentUrl = null
    currentAudioContext = ctx
    currentSource = source
    source.onended = () => {
      void ctx.close().catch(() => undefined)
      if (currentAudioContext === ctx) currentAudioContext = null
      if (currentSource === source) currentSource = null
      if (currentAudio === audio) currentAudio = null
    }
    try {
      await audio.play()
      source.start()
      return true
    } catch {
      await ctx.close().catch(() => undefined)
      return false
    }
  }

  // Sem deviceId: tocar direto pelo destino default do contexto.
  source.connect(ctx.destination)
  currentAudioContext = ctx
  currentSource = source
  currentAudio = null
  currentUrl = null
  source.onended = () => {
    void ctx.close().catch(() => undefined)
    if (currentAudioContext === ctx) currentAudioContext = null
    if (currentSource === source) currentSource = null
  }
  source.start()
  return true
}

export async function playCloudAudio(audioBase64: string, mimeType = 'audio/webm', deviceId?: string): Promise<void> {
  stopCloudAudio()
  const token = ++playbackToken
  const bytes = base64ToBytes(audioBase64)
  // Tentativa 1: <audio> com blob URL
  const blob = new Blob([bytes], { type: mimeType })
  const blobUrl = URL.createObjectURL(blob)
  if (await tryPlayWithUrl(blobUrl, deviceId, token)) {
    return
  }
  URL.revokeObjectURL(blobUrl)
  if (token !== playbackToken) return

  // Tentativa 2: Web Audio API — bypassa CSP media-src e da erro especifico se falhar
  if (await tryPlayWithWebAudio(bytes, deviceId, token)) {
    return
  }

  throw new Error('Nao foi possivel reproduzir o audio: todas as estrategias falharam.')
}

export function stopCloudAudio(): void {
  playbackToken += 1
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.currentTime = 0
    } catch {
      /* ignore */
    }
    if (currentAudio.srcObject) currentAudio.srcObject = null
    currentAudio = null
  }
  if (currentSource) {
    try {
      currentSource.stop()
    } catch {
      /* ignore */
    }
    currentSource = null
  }
  if (currentAudioContext) {
    void currentAudioContext.close().catch(() => undefined)
    currentAudioContext = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

export function isCloudAudioPlaying(): boolean {
  if (currentAudio && !currentAudio.paused) return true
  if (currentSource) return true
  return false
}

export async function listOutputAudioDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return []
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((device) => device.kind === 'audiooutput')
  } catch {
    return []
  }
}
