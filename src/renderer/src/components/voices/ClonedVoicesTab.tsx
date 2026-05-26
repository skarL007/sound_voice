import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Mic, Play, Trash2, UserCircle } from 'lucide-react'
import type { ClonedVoice, HardwareInfo } from '../../../../shared/types'
import { getCloneCapability } from '../../utils/modelSupport'
import { toast } from '../../utils/toast'

export default function ClonedVoicesTab() {
  const [voices, setVoices] = useState<ClonedVoice[]>([])
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendOnline, setBackendOnline] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      window.electronAPI.getHardwareInfo(),
      window.electronAPI.getBackendStatus(),
      window.electronAPI.listClonedVoices(),
    ])
      .then(([hw, status, list]) => {
        if (!active) return
        setHardware(hw)
        setBackendOnline(status.running)
        setVoices(list)
      })
      .catch((err) => {
        if (active) toast('Erro ao listar vozes clonadas', String(err), 'error')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const cap = getCloneCapability(hardware)

  const previewVoice = async (voice: ClonedVoice) => {
    if (!voice.samplePath) return
    try {
      await window.electronAPI.playAudio(voice.samplePath)
    } catch (err) {
      toast('Falha ao ouvir', String(err), 'error')
    }
  }

  const deleteVoice = async (voiceId: string) => {
    const ok = await window.electronAPI.deleteClonedVoice(voiceId)
    if (ok) {
      setVoices((prev) => prev.filter((voice) => voice.id !== voiceId))
      toast('Voz removida', '', 'info')
    }
  }

  if (loading) {
    return (
      <div className="hud-frame p-6 flex items-center justify-center gap-3 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando vozes clonadas...
      </div>
    )
  }

  if (!cap.enabled) {
    return (
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" style={{ color: 'var(--vl-state-warn)' }} />
          <h3 className="font-medium text-ink-strong">Clonagem nao disponivel neste hardware</h3>
        </div>
        <p className="text-sm text-ink-body">{cap.reason}</p>
        <p className="text-sm text-ink-soft">
          Voce pode usar as vozes online (Edge TTS) que cobrem mais de 60 idiomas e nao precisam de GPU.
        </p>
      </div>
    )
  }

  if (!backendOnline) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }}
      >
        <p className="text-sm text-ink-body">
          O backend Python precisa estar ativo para listar e usar vozes clonadas. Tente reiniciar o backend nas Configuracoes.
        </p>
      </div>
    )
  }

  if (voices.length === 0) {
    return (
      <div className="hud-frame p-8 text-center space-y-3">
        <UserCircle className="h-12 w-12 mx-auto" style={{ color: 'var(--vl-state-ready)' }} />
        <h3 className="text-lg font-semibold text-ink-strong">Nenhuma voz clonada ainda</h3>
        <p className="text-sm text-ink-soft max-w-md mx-auto">
          Va para a aba <strong>Clonar</strong>, grave 6-30 segundos da voz que voce quer e o XTTS v2 produz um modelo personalizado.
        </p>
        <a href="#/clone" className="btn-primary inline-flex items-center gap-2">
          <Mic className="h-4 w-4" />
          Comecar clonagem
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {voices.map((voice) => (
        <div key={voice.id} className="hud-frame card-hover p-4 flex items-center gap-3">
          <UserCircle className="h-8 w-8 flex-shrink-0" style={{ color: 'var(--vl-state-ready)' }} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink-strong truncate">{voice.name}</p>
            <p className="text-sm text-ink-soft truncate">{voice.description || 'Sem descricao'}</p>
            <p className="text-[11px] font-mono text-ink-mute mt-0.5">{voice.modelId}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => void previewVoice(voice)} className="btn-secondary inline-flex items-center gap-1.5 text-xs">
              <Play className="h-3.5 w-3.5" />
              Ouvir
            </button>
            <button
              onClick={() => void deleteVoice(voice.id)}
              className="btn-ghost text-xs"
              style={{ color: 'var(--vl-state-error)' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
