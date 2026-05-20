import { describe, expect, it } from 'vitest'
import { validateAudioExtension, validateModelId, isHttpUrl, sanitizeFileName, shouldOpenExternalUrl } from './security-utils'

describe('validateModelId', () => {
  it('aceita ids alfanumericos e separadores', () => {
    expect(() => validateModelId('piper')).not.toThrow()
    expect(() => validateModelId('xtts_v2')).not.toThrow()
    expect(() => validateModelId('voice-clone-1')).not.toThrow()
  })

  it('rejeita path traversal', () => {
    expect(() => validateModelId('../../etc/passwd')).toThrow()
    expect(() => validateModelId('a/b')).toThrow()
    expect(() => validateModelId('a\\b')).toThrow()
  })

  it('rejeita string vazia', () => {
    expect(() => validateModelId('')).toThrow()
  })

  it('rejeita caracteres especiais', () => {
    expect(() => validateModelId('piper;rm -rf')).toThrow()
    expect(() => validateModelId('piper$(whoami)')).toThrow()
    expect(() => validateModelId('a b')).toThrow()
  })
})

describe('validateAudioExtension', () => {
  it('aceita formatos comuns de audio', () => {
    expect(validateAudioExtension('wav')).toBe('wav')
    expect(validateAudioExtension('mp3')).toBe('mp3')
    expect(validateAudioExtension('ogg')).toBe('ogg')
    expect(validateAudioExtension('opus')).toBe('opus')
    expect(validateAudioExtension('webm')).toBe('webm')
    expect(validateAudioExtension('flac')).toBe('flac')
    expect(validateAudioExtension('m4a')).toBe('m4a')
  })

  it('normaliza ponto e case', () => {
    expect(validateAudioExtension('.WAV')).toBe('wav')
    expect(validateAudioExtension('Mp3')).toBe('mp3')
  })

  it('rejeita executaveis e scripts', () => {
    expect(() => validateAudioExtension('exe')).toThrow(/nao permitida/)
    expect(() => validateAudioExtension('bat')).toThrow(/nao permitida/)
    expect(() => validateAudioExtension('cmd')).toThrow(/nao permitida/)
    expect(() => validateAudioExtension('ps1')).toThrow(/nao permitida/)
    expect(() => validateAudioExtension('js')).toThrow(/nao permitida/)
    expect(() => validateAudioExtension('sh')).toThrow(/nao permitida/)
  })

  it('rejeita extensoes com caracteres especiais', () => {
    expect(() => validateAudioExtension('wav;ls')).toThrow(/Invalid file extension/)
    expect(() => validateAudioExtension('../mp3')).toThrow(/Invalid file extension/)
    expect(() => validateAudioExtension('mp3 ')).toThrow(/Invalid file extension/)
  })
})

describe('isHttpUrl + shouldOpenExternalUrl', () => {
  it('aceita http e https', () => {
    expect(isHttpUrl('http://example.com')).toBe(true)
    expect(isHttpUrl('https://example.com/foo')).toBe(true)
  })

  it('rejeita schemes perigosos', () => {
    expect(isHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('data:text/html,<script>')).toBe(false)
    expect(isHttpUrl('not-a-url')).toBe(false)
  })

  it('shouldOpenExternalUrl casa com isHttpUrl', () => {
    expect(shouldOpenExternalUrl('https://vb-audio.com/Cable/')).toBe(true)
    expect(shouldOpenExternalUrl('javascript:alert(1)')).toBe(false)
  })
})

describe('sanitizeFileName', () => {
  it('substitui caracteres perigosos por underscore', () => {
    expect(sanitizeFileName('arquivo<seguro>.wav')).toBe('arquivo_seguro_.wav')
    expect(sanitizeFileName('test/path:bad')).toBe('test_path_bad')
    expect(sanitizeFileName('voice clone (1).wav')).toBe('voice_clone__1_.wav')
  })

  it('preserva alfanumericos e _ . -', () => {
    expect(sanitizeFileName('voice-1.wav')).toBe('voice-1.wav')
    expect(sanitizeFileName('my_voice.mp3')).toBe('my_voice.mp3')
  })
})
