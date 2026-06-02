import { useEffect, useState } from 'react'
import { Headphones, Loader2, PlayCircle, X } from 'lucide-react'
import { toast } from '../utils/toast'
import { useAppStore } from '../stores/appStore'
import { playCloudAudio } from '../utils/cloudAudio'

const AUTO_HIDE_MS = 6000
const TEST_PHRASE = 'Testando, um, dois, tres.'

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
          toast('Escolha uma voz online', 'Selecione uma voz Edge TTS antes de testar.', 'warning')
          return
        }
        const response = await window.electronAPI.synthesizeCloud({
          text: TEST_PHRASE,
          voice: cloudVoiceShortName,
          speed,
        })
        if (!response.success || !response.audioBase64) {
          toast('Falha no teste', response.error || 'Nao foi possivel gerar o audio.', 'error')
          return
        }
        await playCloudAudio(
          response.audioBase64,
          response.mimeType ?? 'audio/webm',
          cableDeviceId ?? undefined,
          { monitor: Boolean(cableDeviceId) },
        )
        return
      }

      if (!modelId) {
        toast('Sem modelo pronto', 'Instale Piper ou Kokoro antes de testar.', 'warning')
        return
      }
      const response = await window.electronAPI.synthesize({ text: TEST_PHRASE, modelId, speed })
      if (response.success && response.audioPath) {
        await window.electronAPI.playAudio(response.audioPath)
      } else {
        toast('Falha no teste', response.error || 'Nao foi possivel gerar o audio.', 'error')
      }
    } catch (error) {
      toast('Falha no teste', String(error), 'error')
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
        <p className="text-sm font-medium text-ink-strong">Microfone virtual ativo</p>
        <p className="text-xs text-ink-body mt-0.5">
          Selecione <span className="font-mono" style={{ color: 'var(--vl-state-live)' }}>CABLE Output</span> como microfone no Discord e teste com o botao abaixo.
        </p>
      </div>
      <button
        onClick={handleTest}
        disabled={testing}
        className="btn-primary btn-primary--armed inline-flex items-center gap-2 text-sm"
      >
        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
        {testing ? 'Testando...' : 'Testar agora'}
      </button>
      <button
        onClick={onClose}
        className="p-1.5 rounded-md text-ink-soft hover:bg-brand-500/15 hover:text-ink-strong transition-colors"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
