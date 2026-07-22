import { useEffect, useState } from 'react'
import { Headphones, Loader2, PlayCircle, X } from 'lucide-react'
import { toast } from '../utils/toast'
import { useAppStore } from '../stores/appStore'
import { playCloudAudio } from '../utils/cloudAudio'

const AUTO_HIDE_MS = 6000
const TEST_PHRASE = 'Testing, one, two, three.'

interface DiscordReadyBannerProps {
  visible: boolean
  onClose: () => void
  modelId?: string
  speed?: number
}

export default function DiscordReadyBanner({ visible, onClose, modelId, speed = 1 }: DiscordReadyBannerProps) {
  const [testing, setTesting] = useState(false)
  const voiceSource = useAppStore((state) => state.voiceSource)
  const cloudVoiceShortName = useAppStore((state) => state.cloudVoice)
  const cableDeviceId = useAppStore((state) => state.cableDeviceId)
  const monitorDeviceId = useAppStore((state) => state.monitorDeviceId)

  useEffect(() => {
    if (!visible) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return
    const timer = window.setTimeout(() => onClose(), AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [visible, onClose])

  if (!visible) return null

  const handleTest = async () => {
    setTesting(true)
    try {
      if (voiceSource === 'cloud') {
        if (!cloudVoiceShortName) {
          toast('Choose an online voice', 'Select an Edge TTS voice before testing.', 'warning')
          return
        }
        const response = await window.electronAPI.synthesizeCloud({
          text: TEST_PHRASE,
          voice: cloudVoiceShortName,
          speed,
        })
        if (!response.success || !response.audioBase64) {
          toast('Test failed', response.error || 'Could not generate the audio.', 'error')
          return
        }
        await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm', {
          cableDeviceId: cableDeviceId ?? undefined,
          monitorDeviceId,
        })
        return
      }

      if (!modelId) {
        toast('No model ready', 'Install Piper or Kokoro before testing.', 'warning')
        return
      }
      const response = await window.electronAPI.synthesize({ text: TEST_PHRASE, modelId, speed })
      if (response.success && response.audioPath) {
        await window.electronAPI.playAudio(response.audioPath)
      } else {
        toast('Test failed', response.error || 'Could not generate the audio.', 'error')
      }
    } catch (error) {
      toast('Test failed', String(error), 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="hud-frame mb-4 flex flex-wrap items-center gap-3 p-3"
      style={{
        background: 'var(--vl-state-live-bg)',
        border: '1px solid var(--vl-state-live-accent)',
        boxShadow: 'none',
      }}
    >
      <Headphones className="h-5 w-5" style={{ color: 'var(--vl-state-live)' }} />
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-medium text-ink-strong">Virtual microphone active</p>
        <p className="text-xs text-ink-body mt-0.5">
          Select <span className="font-mono" style={{ color: 'var(--vl-state-live)' }}>CABLE Output</span> as the microphone in Discord and test with the button below.
        </p>
      </div>
      <button
        onClick={handleTest}
        disabled={testing}
        className="btn-primary btn-primary--armed inline-flex items-center gap-2 text-sm"
      >
        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
        {testing ? 'Testing...' : 'Test now'}
      </button>
      <button
        onClick={onClose}
        className="p-1.5 rounded-md text-ink-soft hover:bg-brand-500/15 hover:text-ink-strong transition-colors"
        aria-label="Close notice"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
