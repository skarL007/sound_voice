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

    window.electronAPI.loadSettings().then((settings) => {
      if (!active) return
      const state = sanitizeCommunicationState(settings)
      setText(state.ttsDraft)
      setHistory(state.ttsHistory)
      setQuickPhrases(state.quickPhrases)
      setKeepTextAfterSpeak(state.keepTextAfterSpeak)
      setHydrated(true)
    })

    const syncFromWindowEvent = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AppSettings>>).detail
      const state = sanitizeCommunicationState(detail)
      setText(state.ttsDraft)
      setHistory(state.ttsHistory)
      setQuickPhrases(state.quickPhrases)
      setKeepTextAfterSpeak(state.keepTextAfterSpeak)
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
      window.electronAPI.saveSettings(
        serializeCommunicationState({
          ttsDraft: text,
          ttsHistory: history,
          quickPhrases,
          keepTextAfterSpeak,
        }),
      )
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
