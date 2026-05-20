import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUICK_PHRASES,
  MAX_HISTORY_ITEMS,
  MAX_QUICK_PHRASES,
  buildHistoryItem,
  pushHistoryItem,
  removeQuickPhrase,
  sanitizeCommunicationState,
  upsertQuickPhrase,
} from './communicationState'

describe('communicationState', () => {
  it('falls back to defaults when settings are empty', () => {
    const state = sanitizeCommunicationState({})

    expect(state.quickPhrases).toEqual(DEFAULT_QUICK_PHRASES)
    expect(state.keepTextAfterSpeak).toBe(true)
    expect(state.ttsHistory).toEqual([])
  })

  it('normalizes and filters persisted settings', () => {
    const state = sanitizeCommunicationState({
      ttsDraft: 'x'.repeat(5100),
      quickPhrases: [' Ola ', 'ola', 42 as unknown as string, '   ', 'Preciso de ajuda.', 'PRECISO DE AJUDA.'],
      keepTextAfterSpeak: 'yes' as unknown as boolean,
      ttsHistory: [
        {
          id: 'first',
          text: '  Frase valida  ',
          modelId: 'piper',
          timestamp: 10,
          voiceId: 12 as unknown as string,
          audioPath: 123 as unknown as string,
        },
        {
          id: 99 as unknown as string,
          text: '',
          modelId: 'piper',
          timestamp: 20,
        },
        {
          id: 'second',
          text: 'Outra frase',
          modelId: 'piper',
          timestamp: 5,
        },
      ],
    })

    expect(state.ttsDraft).toHaveLength(5000)
    expect(state.ttsHistory).toEqual([
      {
        id: 'first',
        text: 'Frase valida',
        modelId: 'piper',
        timestamp: 10,
        voiceId: undefined,
        audioPath: undefined,
      },
      {
        id: 'second',
        text: 'Outra frase',
        modelId: 'piper',
        timestamp: 5,
        voiceId: undefined,
        audioPath: undefined,
      },
    ])

    expect(state.quickPhrases).toEqual(['Ola', 'Preciso de ajuda.'])
    expect(state.keepTextAfterSpeak).toBe(true)
  })

  it('deduplicates and normalizes quick phrases', () => {
    const phrases = upsertQuickPhrase(['Sim.', 'Nao.'], '  sim.  ')
    expect(phrases[0]).toBe('sim.')
    expect(phrases).toHaveLength(2)
  })

  it('restores defaults if all quick phrases are removed', () => {
    const phrases = removeQuickPhrase(['Unica frase'], 'Unica frase')
    expect(phrases).toEqual(DEFAULT_QUICK_PHRASES)
  })

  it('caps quick phrases and keeps newest insertion order', () => {
    let phrases = [...DEFAULT_QUICK_PHRASES]
    const baseSize = MAX_QUICK_PHRASES - phrases.length

    for (let index = 0; index < baseSize + 2; index += 1) {
      phrases = upsertQuickPhrase(phrases, `extra-${index}`)
    }

    expect(phrases).toHaveLength(MAX_QUICK_PHRASES)
    expect(phrases[0]).toBe('extra-3')
    expect(phrases).toContain('extra-2')
  })

  it('keeps the newest history first and caps the list', () => {
    let history = Array.from({ length: MAX_HISTORY_ITEMS }, (_, index) =>
      buildHistoryItem({
        text: `Frase ${index}`,
        modelId: 'piper',
      }),
    )

    const newest = buildHistoryItem({ text: 'Frase nova', modelId: 'kokoro' })
    history = pushHistoryItem(history, newest)

    expect(history[0].text).toBe('Frase nova')
    expect(history).toHaveLength(MAX_HISTORY_ITEMS)
  })

  it('produces unique ids even in tight bursts', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i += 1) {
      ids.add(buildHistoryItem({ text: `Frase ${i}`, modelId: 'piper' }).id)
    }
    expect(ids.size).toBe(1000)
  })
})
