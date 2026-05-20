import { useEffect, useRef, useState } from 'react'
import type { AppSettings, TTSHistoryItem } from '../../../shared/types'
import {
  DEFAULT_COMMUNICATION_STATE,
  pushHistoryItem,
  removeQuickPhrase,
  sanitizeCommunicationState,
  serializeCommunicationState,
  upsertQuickPhrase,
} from '../utils/communicationState'

export function useCommunicationSettings() {
  const [text, setText] = useState(DEFAULT_COMMUNICATION_STATE.ttsDraft)
  const [history, setHistory] = useState<TTSHistoryItem[]>(DEFAULT_COMMUNICATION_STATE.ttsHistory)
  const [quickPhrases, setQuickPhrases] = useState<string[]>(DEFAULT_COMMUNICATION_STATE.quickPhrases)
  const [keepTextAfterSpeak, setKeepTextAfterSpeak] = useState(DEFAULT_COMMUNICATION_STATE.keepTextAfterSpeak)
  const [hydrated, setHydrated] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true

    window.electronAPI
      .loadSettings()
      .then((settings) => {
        if (!active) return
        const state = sanitizeCommunicationState(settings)
        setText(state.ttsDraft)
        setHistory(state.ttsHistory)
        setQuickPhrases(state.quickPhrases)
        setKeepTextAfterSpeak(state.keepTextAfterSpeak)
        setHydrated(true)
      })
      .catch((error) => {
        console.error('Failed to load communication settings', error)
        setHydrated(true)
      })

    const syncFromWindowEvent = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AppSettings> | null>).detail
      if (!detail) return
      const sanitized = sanitizeCommunicationState(detail)
      if (Object.prototype.hasOwnProperty.call(detail, 'ttsDraft')) {
        setText(sanitized.ttsDraft)
      }
      if (Object.prototype.hasOwnProperty.call(detail, 'ttsHistory')) {
        setHistory(sanitized.ttsHistory)
      }
      if (Object.prototype.hasOwnProperty.call(detail, 'quickPhrases')) {
        setQuickPhrases(sanitized.quickPhrases)
      }
      if (Object.prototype.hasOwnProperty.call(detail, 'keepTextAfterSpeak')) {
        setKeepTextAfterSpeak(sanitized.keepTextAfterSpeak)
      }
    }

    window.addEventListener('voicelaunch:communication-updated', syncFromWindowEvent as EventListener)

    return () => {
      active = false
      window.removeEventListener('voicelaunch:communication-updated', syncFromWindowEvent as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      void window.electronAPI
        .saveSettings(
          serializeCommunicationState({
            ttsDraft: text,
            ttsHistory: history,
            quickPhrases,
            keepTextAfterSpeak,
          }),
        )
        .catch((error) => {
          console.error('Failed to save communication settings', error)
        })
    }, 250)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [hydrated, text, history, quickPhrases, keepTextAfterSpeak])

  return {
    text,
    setText,
    history,
    quickPhrases,
    keepTextAfterSpeak,
    setKeepTextAfterSpeak,
    hydrated,
    addHistoryItem: (item: TTSHistoryItem) => setHistory((current) => pushHistoryItem(current, item)),
    addQuickPhrase: (phrase: string) => setQuickPhrases((current) => upsertQuickPhrase(current, phrase)),
    deleteQuickPhrase: (phrase: string) => setQuickPhrases((current) => removeQuickPhrase(current, phrase)),
  }
}
