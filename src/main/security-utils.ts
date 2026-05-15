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

export function validateAudioExtension(ext: string): string {
  const clean = ext.startsWith('.') ? ext.slice(1) : ext
  if (!SAFE_EXT_RE.test(clean)) {
    throw new Error('Invalid file extension')
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
