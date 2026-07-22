import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { playCloudAudio } from '../utils/cloudAudio'
import { toast } from '../utils/toast'
import { deriveName } from '../components/ShortcutControls'
import {
  HOTKEY_SLOTS,
  formatHotkeyDisplay,
  generateShortcutId,
  isHotkeyTaken,
  suggestNextHotkey,
} from '../utils/voiceShortcuts'
import type { CloudVoice, VoiceShortcut } from '../../../shared/types'

/**
 * Estado e acoes compartilhados de atalhos de voz, usados tanto pela tela
 * Atalhos quanto pelos cards da tela Falar. Centraliza carregar vozes,
 * pre-aquecer o cache, criar, testar e o feedback de disparo.
 */
export function useVoiceShortcuts() {
  const voiceShortcuts = useAppStore((s) => s.voiceShortcuts)
  const addVoiceShortcut = useAppStore((s) => s.addVoiceShortcut)
  const updateShortcut = useAppStore((s) => s.updateVoiceShortcut)
  const deleteShortcut = useAppStore((s) => s.deleteVoiceShortcut)
  const cloudVoiceDefault = useAppStore((s) => s.cloudVoice)
  const cableDeviceId = useAppStore((s) => s.cableDeviceId)
  const monitorDeviceId = useAppStore((s) => s.monitorDeviceId)

  const [cloudVoices, setCloudVoices] = useState<CloudVoice[]>([])
  const [cloudError, setCloudError] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true
    window.electronAPI.listCloudVoices().then((response) => {
      if (!active) return
      if (response.success) {
        setCloudVoices(response.voices)
        setCloudError(null)
      } else {
        setCloudError(response.error || 'Failed to load online voices.')
      }
    })
    const handleTriggered = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      setActiveId(id)
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current)
      activeTimerRef.current = setTimeout(() => setActiveId(null), 2000)
    }
    window.addEventListener('voicelaunch:shortcut-triggered', handleTriggered as EventListener)
    return () => {
      active = false
      window.removeEventListener('voicelaunch:shortcut-triggered', handleTriggered as EventListener)
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current)
    }
  }, [])

  // Pre-aquece o cache do Edge TTS para os atalhos dispararem na hora.
  useEffect(() => {
    let cancelled = false
    const targets = voiceShortcuts.filter((s) => s.enabled && s.text.trim() && s.voice)
    void (async () => {
      for (const s of targets) {
        if (cancelled) break
        try {
          await window.electronAPI.synthesizeCloud({ text: s.text, voice: s.voice, speed: s.speed, pitch: s.pitch })
        } catch {
          /* best-effort */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [voiceShortcuts])

  const resolveVoice = (preferred?: string): string =>
    preferred || cloudVoiceDefault || cloudVoices[0]?.ShortName || ''

  /** Cria um atalho a partir de um texto. Retorna o atalho criado ou null. */
  const createShortcut = (
    text: string,
    opts?: { voice?: string; hotkey?: string; speed?: number },
  ): VoiceShortcut | null => {
    const trimmed = text.trim()
    if (!trimmed) {
      toast('Write the phrase', 'Type what the shortcut should say.', 'warning')
      return null
    }
    const voice = resolveVoice(opts?.voice)
    if (!voice) {
      toast('Choose a voice', 'Select an online voice first (on the Speak screen).', 'warning')
      return null
    }
    const hotkey = opts?.hotkey || suggestNextHotkey(voiceShortcuts) || HOTKEY_SLOTS[0]
    if (isHotkeyTaken(hotkey, voiceShortcuts)) {
      toast('No key available', 'All shortcut keys are in use.', 'warning')
      return null
    }
    const shortcut: VoiceShortcut = {
      id: generateShortcutId(),
      name: deriveName(trimmed),
      hotkey,
      enabled: true,
      voiceSource: 'cloud',
      voice,
      text: trimmed,
      speed: opts?.speed ?? 1.0,
    }
    addVoiceShortcut(shortcut)
    toast('Shortcut created', `${formatHotkeyDisplay(hotkey)} → speaks your phrase`, 'success')
    return shortcut
  }

  const testShortcut = async (shortcut: VoiceShortcut) => {
    if (testingId) return
    setTestingId(shortcut.id)
    try {
      const voice = resolveVoice(shortcut.voice)
      if (!voice) {
        toast('No voice', 'Choose a voice for the shortcut.', 'warning')
        return
      }
      const response = await window.electronAPI.synthesizeCloud({
        text: shortcut.text,
        voice,
        speed: shortcut.speed,
        pitch: shortcut.pitch,
      })
      if (!response.success || !response.audioBase64) {
        toast('Test failed', response.error || 'Could not generate the voice.', 'error')
        return
      }
      await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm', {
        cableDeviceId: cableDeviceId ?? undefined,
        monitorDeviceId,
      })
    } catch (error) {
      toast('Test failed', String(error), 'error')
    } finally {
      setTestingId(null)
    }
  }

  const sortedShortcuts = useMemo(
    () => [...voiceShortcuts].sort((a, b) => HOTKEY_SLOTS.indexOf(a.hotkey) - HOTKEY_SLOTS.indexOf(b.hotkey)),
    [voiceShortcuts],
  )

  return {
    voiceShortcuts,
    sortedShortcuts,
    cloudVoices,
    cloudError,
    cloudVoiceDefault,
    testingId,
    activeId,
    createShortcut,
    testShortcut,
    updateShortcut,
    deleteShortcut,
    suggestedHotkey: suggestNextHotkey(voiceShortcuts) ?? HOTKEY_SLOTS[0],
  }
}
