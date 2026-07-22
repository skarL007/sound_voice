let currentAudios: HTMLAudioElement[] = []
let currentUrl: string | null = null
let currentAudioContext: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null
let playbackToken = 0

export interface PlayCloudAudioOptions {
  /** Microfone virtual: onde o Discord/jogo ouve (CABLE Input). */
  cableDeviceId?: string | null
  /** Monitor: onde o usuario ouve a propria voz. 'default'/vazio = alto-falante
   * padrao; null = nao ouvir (mudo); um id = aquele dispositivo. */
  monitorDeviceId?: string | null
  /** Desliga o monitor mesmo com cabo definido. Padrao: ligado. */
  monitor?: boolean
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const buf = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Decide em quais saidas a voz deve tocar. `sinkId` ausente significa o
 * alto-falante padrao do sistema (`ctx.destination`). Regras:
 *  - o cabo (mic) entra sempre que definido (o Discord ouve via CABLE Output);
 *  - o monitor (voce ouve) so importa quando ha cabo — sem cabo a voz ja toca no
 *    padrao. `monitorDeviceId` null = mudo intencional; 'default'/vazio =
 *    alto-falante padrao; um id = aquele dispositivo. Nunca duplica o cabo.
 */
export function buildAudioOutputs(opts: PlayCloudAudioOptions = {}): Array<{ sinkId?: string }> {
  const cable = opts.cableDeviceId || undefined
  const outputs: Array<{ sinkId?: string }> = []
  if (cable) outputs.push({ sinkId: cable })

  const monitorOn = opts.monitor !== false
  if (cable && monitorOn) {
    const mon = opts.monitorDeviceId
    if (mon === null) {
      // Mudo intencional: nao adiciona saida de monitor.
    } else if (!mon || mon === 'default') {
      outputs.push({})
    } else if (mon !== cable) {
      outputs.push({ sinkId: mon })
    }
  }

  // Sem cabo (preview/uso normal): toca apenas no alto-falante padrao.
  if (outputs.length === 0) outputs.push({})
  return outputs
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
    if (token === playbackToken) {
      currentAudios = currentAudios.filter((a) => a !== audio)
    }
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
  currentAudios = [audio]
  currentUrl = url.startsWith('blob:') ? url : null
  trackTeardown(audio, currentUrl, token)
  try {
    await audio.play()
    return true
  } catch {
    return false
  }
}

/**
 * Toca o audio decodificado em uma ou mais saidas simultaneamente. Cada saida
 * com `sinkId` vira um MediaStreamDestination + `<audio setSinkId>`; a saida sem
 * `sinkId` vai direto pro `ctx.destination` (alto-falante padrao). Um unico
 * BufferSource alimenta todas as saidas (fan-out), entao cabo e monitor ficam
 * sincronizados a partir do mesmo decode.
 */
async function tryPlayWithWebAudio(
  bytes: Uint8Array,
  outputs: Array<{ sinkId?: string }>,
  token: number,
): Promise<boolean> {
  // Web Audio API decodifica o container sem precisar passar pelo CSP media-src.
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

  const sinks = outputs.length ? outputs : [{}]
  const audios: HTMLAudioElement[] = []
  for (const out of sinks) {
    if (out.sinkId) {
      const dest = ctx.createMediaStreamDestination()
      source.connect(dest)
      const audio = new Audio()
      audio.srcObject = dest.stream
      audio.preload = 'auto'
      await attachToAudio(audio, out.sinkId)
      audios.push(audio)
    } else {
      source.connect(ctx.destination)
    }
  }
  if (token !== playbackToken) {
    await ctx.close().catch(() => undefined)
    return false
  }

  currentAudios = audios
  currentUrl = null
  currentAudioContext = ctx
  currentSource = source
  source.onended = () => {
    void ctx.close().catch(() => undefined)
    if (currentAudioContext === ctx) currentAudioContext = null
    if (currentSource === source) currentSource = null
    for (const audio of audios) {
      if (audio.srcObject) audio.srcObject = null
    }
    if (currentAudios === audios) currentAudios = []
  }

  try {
    await Promise.all(audios.map((audio) => audio.play()))
    source.start()
    return true
  } catch {
    await ctx.close().catch(() => undefined)
    return false
  }
}

export async function playCloudAudio(
  audioBase64: string,
  mimeType = 'audio/webm',
  opts?: PlayCloudAudioOptions,
): Promise<void> {
  stopCloudAudio()
  const token = ++playbackToken
  const bytes = base64ToBytes(audioBase64)
  const outputs = buildAudioOutputs(opts)
  // Roteamento multi-saida (cabo e/ou monitor) exige Web Audio: o blob URL toca
  // num unico sink. So o caso "padrao puro" (preview) usa o blob primeiro.
  const needsWebAudio = outputs.some((o) => o.sinkId) || outputs.length > 1

  if (!needsWebAudio) {
    const blob = new Blob([bytes], { type: mimeType })
    const blobUrl = URL.createObjectURL(blob)
    if (await tryPlayWithUrl(blobUrl, undefined, token)) return
    URL.revokeObjectURL(blobUrl)
    if (token !== playbackToken) return
    if (await tryPlayWithWebAudio(bytes, outputs, token)) return
    throw new Error('Could not play the audio: all strategies failed.')
  }

  // Cabo e/ou monitor: toca em todas as saidas ao mesmo tempo.
  if (await tryPlayWithWebAudio(bytes, outputs, token)) return
  if (token !== playbackToken) return
  // Fallback degradado: ao menos o cabo via blob (sem monitor) para o Discord ouvir.
  const cableSink = outputs.find((o) => o.sinkId)?.sinkId
  const blob = new Blob([bytes], { type: mimeType })
  const blobUrl = URL.createObjectURL(blob)
  if (await tryPlayWithUrl(blobUrl, cableSink, token)) return
  URL.revokeObjectURL(blobUrl)
  throw new Error('Nao foi possivel reproduzir o audio: todas as estrategias falharam.')
}

export function stopCloudAudio(): void {
  playbackToken += 1
  for (const audio of currentAudios) {
    try {
      audio.pause()
      audio.currentTime = 0
    } catch {
      /* ignore */
    }
    if (audio.srcObject) audio.srcObject = null
  }
  currentAudios = []
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
  if (currentAudios.some((audio) => !audio.paused)) return true
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
