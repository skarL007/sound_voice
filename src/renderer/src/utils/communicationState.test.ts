import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUICK_PHRASES,
  MAX_HISTORY_ITEMS,
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

  it('deduplicates and normalizes quick phrases', () => {
    const phrases = upsertQuickPhrase(['Sim.', 'Nao.'], '  sim.  ')
    expect(phrases[0]).toBe('sim.')
    expect(phrases).toHaveLength(2)
  })

  it('restores defaults if all quick phrases are removed', () => {
    const phrases = removeQuickPhrase(['Unica frase'], 'Unica frase')
    expect(phrases).toEqual(DEFAULT_QUICK_PHRASES)
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
})
