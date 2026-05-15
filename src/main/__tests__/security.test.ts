import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  validateModelId,
  validateAudioExtension,
  isHttpUrl,
  shouldOpenExternalUrl,
} from '../security-utils'

describe('validateModelId', () => {
  it('accepts valid alphanumeric IDs', () => {
    expect(() => validateModelId('piper')).not.toThrow()
    expect(() => validateModelId('xtts_v2')).not.toThrow()
    expect(() => validateModelId('kokoro-82m')).not.toThrow()
    expect(() => validateModelId('Model123')).not.toThrow()
  })

  it('rejects empty string', () => {
    expect(() => validateModelId('')).toThrow('Invalid modelId')
  })

  it('rejects path traversal attempts', () => {
    expect(() => validateModelId('../../windows')).toThrow('Invalid modelId')
    expect(() => validateModelId('..')).toThrow('Invalid modelId')
    expect(() => validateModelId('models/../../etc')).toThrow('Invalid modelId')
  })

  it('rejects special characters', () => {
    expect(() => validateModelId('model;rm -rf')).toThrow('Invalid modelId')
    expect(() => validateModelId('model&whoami')).toThrow('Invalid modelId')
    expect(() => validateModelId('model|cat')).toThrow('Invalid modelId')
    expect(() => validateModelId('model<script>')).toThrow('Invalid modelId')
  })
})

describe('validateAudioExtension', () => {
  it('accepts valid extensions', () => {
    expect(validateAudioExtension('wav')).toBe('wav')
    expect(validateAudioExtension('webm')).toBe('webm')
    expect(validateAudioExtension('.mp3')).toBe('mp3')
  })

  it('rejects path traversal in extension', () => {
    expect(() => validateAudioExtension('../../exe')).toThrow('Invalid file extension')
    expect(() => validateAudioExtension('bat..exe')).toThrow('Invalid file extension')
  })

  it('rejects empty extension', () => {
    expect(() => validateAudioExtension('')).toThrow('Invalid file extension')
  })
})

describe('isHttpUrl', () => {
  it('accepts https URLs', () => {
    expect(isHttpUrl('https://example.com')).toBe(true)
  })

  it('accepts http URLs', () => {
    expect(isHttpUrl('http://localhost:5173')).toBe(true)
  })

  it('rejects file URLs', () => {
    expect(isHttpUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects javascript URLs', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects other non-HTTP protocols', () => {
    expect(isHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isHttpUrl('vbscript:msgbox(1)')).toBe(false)
  })

  it('rejects invalid URLs', () => {
    expect(isHttpUrl('not a url')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
  })
})

describe('main window security', () => {
  it('enables Electron sandbox for renderer isolation', () => {
    const source = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf-8')

    expect(source).toMatch(/sandbox:\s*true/)
    expect(source).not.toMatch(/sandbox:\s*false/)
  })

  it('allows external opening only for http and https URLs', () => {
    expect(shouldOpenExternalUrl('https://example.com')).toBe(true)
    expect(shouldOpenExternalUrl('http://localhost:5173')).toBe(true)
    expect(shouldOpenExternalUrl('javascript:alert(1)')).toBe(false)
    expect(shouldOpenExternalUrl('file:///etc/passwd')).toBe(false)
  })
})
