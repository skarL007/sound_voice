import { useEffect, useState } from 'react'
import type { CloudVoice } from '../../../shared/types'

interface UseCloudVoicesResult {
  voices: CloudVoice[]
  loading: boolean
  error: string | null
  reload: () => void
}

// Cache simples em memoria pra evitar request duplicado quando o usuario abre
// CloudVoicePicker e CloudVoicesTab na mesma sessao.
let cachedVoices: CloudVoice[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export function useCloudVoices(): UseCloudVoicesResult {
  const [voices, setVoices] = useState<CloudVoice[]>(cachedVoices ?? [])
  const [loading, setLoading] = useState(cachedVoices === null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    if (cachedVoices && Date.now() - cachedAt < CACHE_TTL_MS && reloadKey === 0) {
      setVoices(cachedVoices)
      setLoading(false)
      return
    }
    setLoading(true)
    window.electronAPI
      .listCloudVoices()
      .then((response) => {
        if (!active) return
        if (response.success) {
          cachedVoices = response.voices
          cachedAt = Date.now()
          setVoices(response.voices)
          setError(null)
        } else {
          setError(response.error || 'Failed to load online voices.')
        }
      })
      .catch((err) => {
        if (active) setError(String(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  return {
    voices,
    loading,
    error,
    reload: () => {
      cachedVoices = null
      setReloadKey((k) => k + 1)
    },
  }
}
