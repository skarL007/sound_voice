import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { validateModelId, validateAudioExtension, isHttpUrl } from '../security-utils'

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
  it('accepts HTTP and HTTPS URLs', () => {
    expect(isHttpUrl('https://example.com')).toBe(true)
    expect(isHttpUrl('http://localhost:5173')).toBe(true)
  })

  it('rejects non-HTTP protocols', () => {
    expect(isHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
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
})
