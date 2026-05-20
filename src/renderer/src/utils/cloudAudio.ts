let currentAudio: HTMLAudioElement | null = null
let currentUrl: string | null = null

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

export async function playCloudAudio(audioBase64: string, mimeType = 'audio/mpeg', deviceId?: string): Promise<void> {
  stopCloudAudio()
  const blob = base64ToBlob(audioBase64, mimeType)
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.preload = 'auto'

  if (deviceId && typeof (audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId === 'function') {
    try {
      await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId)
    } catch {
      // Device routing not supported; fall back to default output.
    }
  }

  currentAudio = audio
  currentUrl = url

  audio.addEventListener('ended', () => {
    if (currentUrl === url) {
      URL.revokeObjectURL(url)
      currentUrl = null
    }
    if (currentAudio === audio) currentAudio = null
  })
  audio.addEventListener('error', () => {
    if (currentUrl === url) {
      URL.revokeObjectURL(url)
      currentUrl = null
    }
    if (currentAudio === audio) currentAudio = null
  })

  await audio.play()
}

export function stopCloudAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.currentTime = 0
    } catch {
      /* ignore */
    }
    currentAudio = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

export function isCloudAudioPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused
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
