import { describe, expect, it } from 'vitest'
import type { CloudVoice } from '../../../shared/types'
import {
  filterCloudVoices,
  localeFlag,
  shortVoiceLabel,
  sortAvailableLocales,
} from './cloudVoiceFormatting'

function makeVoice(overrides: Partial<CloudVoice>): CloudVoice {
  return {
    Name: 'Microsoft Server Speech Text to Speech Voice (en-US, Mock)',
    ShortName: 'en-US-MockNeural',
    Gender: 'Female',
    Locale: 'en-US',
    SuggestedCodec: 'audio-24khz-48kbitrate-mono-mp3',
    FriendlyName: 'Microsoft Mock Online (Natural) - English (United States)',
    Status: 'GA',
    ...overrides,
  }
}

describe('localeFlag', () => {
  it('produz emoji de bandeira a partir do code regional', () => {
    expect(localeFlag('pt-BR')).toBe('🇧🇷')
    expect(localeFlag('en-US')).toBe('🇺🇸')
    expect(localeFlag('ja-JP')).toBe('🇯🇵')
  })

  it('retorna globo quando nao ha regiao', () => {
    expect(localeFlag('xx')).toBe('🌐')
    expect(localeFlag('en')).toBe('🌐')
  })
})

describe('shortVoiceLabel', () => {
  it('remove prefixo Microsoft e sufixo Online (Natural) inteiro', () => {
    const voice = makeVoice({ FriendlyName: 'Microsoft Aria Online (Natural) - English (United States)' })
    expect(shortVoiceLabel(voice)).toBe('Aria')
  })

  it('preserva FriendlyName que nao casa com o padrao da Microsoft', () => {
    const voice = makeVoice({ FriendlyName: 'Custom Voice Pack' })
    expect(shortVoiceLabel(voice)).toBe('Custom Voice Pack')
  })

  it('caem para ShortName quando FriendlyName esta vazio', () => {
    const voice = makeVoice({ FriendlyName: '', ShortName: 'en-US-MockNeural' })
    expect(shortVoiceLabel(voice)).toBe('Mock')
  })
})

describe('sortAvailableLocales', () => {
  it('coloca locales populares na frente quando presentes', () => {
    const voices = [
      makeVoice({ Locale: 'pt-BR' }),
      makeVoice({ Locale: 'zh-CN' }),
      makeVoice({ Locale: 'en-US' }),
      makeVoice({ Locale: 'ka-GE' }),
    ]
    const sorted = sortAvailableLocales(voices)
    expect(sorted.slice(0, 2)).toEqual(['pt-BR', 'en-US'])
    // resto ordenado alfabeticamente entre o que nao eh popular
    expect(sorted).toContain('zh-CN')
    expect(sorted).toContain('ka-GE')
  })

  it('deduplica locales', () => {
    const voices = [
      makeVoice({ Locale: 'pt-BR' }),
      makeVoice({ Locale: 'pt-BR' }),
      makeVoice({ Locale: 'en-US' }),
    ]
    const sorted = sortAvailableLocales(voices)
    expect(sorted).toEqual(['pt-BR', 'en-US'])
  })
})

describe('filterCloudVoices', () => {
  const voices: CloudVoice[] = [
    makeVoice({ ShortName: 'pt-BR-Francisca', Locale: 'pt-BR', FriendlyName: 'Microsoft Francisca' }),
    makeVoice({ ShortName: 'pt-BR-Antonio', Locale: 'pt-BR', FriendlyName: 'Microsoft Antonio', Gender: 'Male' }),
    makeVoice({ ShortName: 'en-US-Aria', Locale: 'en-US', FriendlyName: 'Microsoft Aria' }),
    makeVoice({
      ShortName: 'en-US-Guy',
      Locale: 'en-US',
      FriendlyName: 'Microsoft Guy',
      Gender: 'Male',
      VoiceTag: { VoicePersonalities: ['News', 'Friendly'] },
    }),
  ]

  it('filtra por locale exato', () => {
    const result = filterCloudVoices(voices, { localeFilter: 'pt-BR', search: '' })
    expect(result).toHaveLength(2)
    expect(result.every((voice) => voice.Locale === 'pt-BR')).toBe(true)
  })

  it('respeita filtro all', () => {
    const result = filterCloudVoices(voices, { localeFilter: 'all', search: '' })
    expect(result).toHaveLength(4)
  })

  it('aceita busca por ShortName', () => {
    const result = filterCloudVoices(voices, { localeFilter: 'all', search: 'Antonio' })
    expect(result).toHaveLength(1)
    expect(result[0].ShortName).toBe('pt-BR-Antonio')
  })

  it('aceita busca por personalidade', () => {
    const result = filterCloudVoices(voices, { localeFilter: 'all', search: 'news' })
    expect(result).toHaveLength(1)
    expect(result[0].ShortName).toBe('en-US-Guy')
  })

  it('ordena alfabeticamente pelo label curto', () => {
    const result = filterCloudVoices(voices, { localeFilter: 'pt-BR', search: '' })
    const labels = result.map(shortVoiceLabel)
    expect(labels).toEqual([...labels].sort())
  })
})
