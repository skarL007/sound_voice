/**
 * Security validation utilities for IPC handlers.
 * All validation functions are pure and throw on invalid input.
 */

const SAFE_MODEL_ID_RE = /^[a-z0-9_\-]+$/i

export function validateModelId(modelId: string): void {
  if (!modelId || !SAFE_MODEL_ID_RE.test(modelId)) {
    throw new Error('Invalid modelId')
  }
}

const SAFE_EXT_RE = /^[a-z0-9]+$/i
// Whitelist estrita de containers de audio aceitos. Restringimos para evitar que
// usuario mal-intencionado escreva .exe ou outro binario executavel via voice:save-audio.
const AUDIO_EXT_WHITELIST = new Set<string>([
  'wav',
  'mp3',
  'ogg',
  'oga',
  'opus',
  'webm',
  'm4a',
  'aac',
  'flac',
])

export function validateAudioExtension(ext: string): string {
  const clean = (ext.startsWith('.') ? ext.slice(1) : ext).toLowerCase()
  if (!SAFE_EXT_RE.test(clean)) {
    throw new Error('Invalid file extension')
  }
  if (!AUDIO_EXT_WHITELIST.has(clean)) {
    throw new Error(`Extensao de audio nao permitida: ${clean}`)
  }
  return clean
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9_\-.]/gi, '_')
}

export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function shouldOpenExternalUrl(url: string): boolean {
  return isHttpUrl(url)
}
