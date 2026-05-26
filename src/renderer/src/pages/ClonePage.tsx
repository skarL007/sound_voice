import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Mic,
  Play,
  Trash2,
  Upload,
  UserCircle,
  Wand2,
} from 'lucide-react'
import type { HardwareInfo } from '../../../shared/types'
import { notify } from '../utils/notify'
import { toast } from '../utils/toast'
import { getCloneCapability } from '../utils/modelSupport'

interface CloneWizardState {
  step: number
  audioPath: string
  audioDuration: number
  name: string
  description: string
  modelId: string
  isRecording: boolean
  isProcessing: boolean
  progress: { stage: string; percent: number; message: string }
  result: { success: boolean; voiceId?: string; error?: string } | null
}

export default function ClonePage() {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [wizard, setWizard] = useState<CloneWizardState>({
    step: 1,
    audioPath: '',
    audioDuration: 0,
    name: '',
    description: '',
    modelId: 'xtts_v2',
    isRecording: false,
    isProcessing: false,
    progress: { stage: '', percent: 0, message: '' },
    result: null,
  })
  const [clonedVoices, setClonedVoices] = useState<any[]>([])
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.electronAPI.getHardwareInfo().then(setHardware)
    loadClonedVoices()
    const unsub = window.electronAPI.onCloneProgress((data) => {
      setWizard((prev) => ({ ...prev, progress: data }))
    })
    return () => {
      unsub()
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [])

  // Escape fecha/cancela o wizard quando estiver no meio do fluxo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && wizard.step > 1 && !wizard.isProcessing) {
        e.preventDefault()
        resetWizard()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [wizard.step, wizard.isProcessing])

  const cloneCapability = getCloneCapability(hardware)

  const loadClonedVoices = async () => {
    const voices = await window.electronAPI.listClonedVoices()
    setClonedVoices(voices)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        const arrayBuffer = await blob.arrayBuffer()
        const filePath = await window.electronAPI.saveAudioBlob(arrayBuffer, 'webm')

        setWizard((prev) => ({
          ...prev,
          isRecording: false,
          audioPath: filePath,
          audioDuration: 6,
          step: 2,
        }))
      }

      recorder.start()
      setMediaRecorder(recorder)
      setWizard((prev) => ({ ...prev, isRecording: true }))
    } catch {
      toast('Erro no microfone', 'Nao foi possivel acessar o microfone.', 'error')
    }
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    mediaRecorder?.stream.getTracks().forEach((track) => track.stop())
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAudioUrl(url)

    const arrayBuffer = await file.arrayBuffer()
    const ext = file.name.split('.').pop() || 'wav'
    const filePath = await window.electronAPI.saveAudioBlob(arrayBuffer, ext)

    setWizard((prev) => ({
      ...prev,
      audioPath: filePath,
      audioDuration: 6,
      step: 2,
    }))
  }

  const startCloning = async () => {
    if (!cloneCapability.enabled) return

    setWizard((prev) => ({ ...prev, isProcessing: true, step: 3 }))

    const result = await window.electronAPI.cloneVoice({
      audioPath: wizard.audioPath,
      modelId: 'xtts_v2',
      name: wizard.name || 'Minha Voz',
      description: wizard.description,
    })

    setWizard((prev) => ({
      ...prev,
      isProcessing: false,
      result,
      step: result.success ? 4 : 3,
    }))

    if (result.success) {
      loadClonedVoices()
      const msg = `A voz "${wizard.name}" esta pronta para uso!`
      notify('Voz clonada', msg)
      toast('Voz clonada', msg, 'success')
    } else {
      const msg = result.error || 'Erro desconhecido'
      notify('Falha na clonagem', msg)
      toast('Falha na clonagem', msg, 'error')
    }
  }

  const resetWizard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setWizard({
      step: 1,
      audioPath: '',
      audioDuration: 0,
      name: '',
      description: '',
      modelId: 'xtts_v2',
      isRecording: false,
      isProcessing: false,
      progress: { stage: '', percent: 0, message: '' },
      result: null,
    })
    setAudioUrl(null)
  }

  const previewVoice = async (voice: any) => {
    if (!voice.samplePath) return
    try {
      await window.electronAPI.playAudio(voice.samplePath)
    } catch (error) {
      console.error('Preview error:', error)
    }
  }

  const deleteVoice = async (voiceId: string) => {
    const ok = await window.electronAPI.deleteClonedVoice(voiceId)
    if (ok) loadClonedVoices()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <UserCircle className="w-7 h-7" style={{ color: 'var(--vl-state-ready)' }} />
        <h1 className="text-2xl font-bold text-ink-strong">Clonar Voz</h1>
      </div>

      <p className="text-ink-soft">
        A clonagem fica fora do caminho principal do MVP local. Ela entra como recurso avancado apenas quando o runtime CUDA ja esta validado.
      </p>

      {!cloneCapability.enabled && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: 'rgba(255,193,90,0.10)', border: '1px solid rgba(255,193,90,0.30)' }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-warn)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#FFE2A8' }}>Clonagem avancada indisponivel neste runtime</p>
            <p className="text-sm mt-1 text-ink-body">{cloneCapability.reason}</p>
            <p className="text-sm mt-2 text-ink-body">
              Primeiro valide a fala local com Piper ou Kokoro. Se quiser clonagem, use uma maquina com NVIDIA/CUDA funcional.
            </p>
          </div>
        </div>
      )}

      <div className="hud-frame p-6">
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.30)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--vl-purple-200)' }}>Motor desta tela</p>
          <p className="text-sm mt-1 text-ink-strong">XTTS v2 (avancado, recomendado apenas com NVIDIA/CUDA)</p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: wizard.step >= step ? 'linear-gradient(135deg, #A06EFF, #7C3AED)' : 'rgba(19,9,43,0.7)',
                  color: wizard.step >= step ? '#fff' : 'var(--vl-ink-mute)',
                  boxShadow: wizard.step >= step ? '0 0 16px rgba(139,92,246,0.5)' : 'none',
                }}
              >
                {step}
              </div>
              {step < 4 && (
                <div className="w-8 h-0.5" style={{ background: 'var(--vl-hud-border)' }} />
              )}
            </div>
          ))}
        </div>

        {wizard.step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Passo 1: Capturar audio</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={wizard.isRecording ? stopRecording : startRecording}
                disabled={!cloneCapability.enabled}
                className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-3 transition-all ${
                  wizard.isRecording
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-slate-700 hover:border-brand-500 hover:bg-brand-500/5'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={wizard.isRecording ? 'Parar gravacao' : 'Gravar do microfone'}
              >
                <Mic
                  className={`w-8 h-8 ${wizard.isRecording ? 'animate-pulse' : ''}`}
                  style={{ color: wizard.isRecording ? 'var(--vl-state-error)' : 'var(--vl-ink-soft)' }}
                />
                <span className="text-white font-medium">
                  {wizard.isRecording ? 'Parar Gravacao' : 'Gravar do Microfone'}
                </span>
                <span className="text-xs text-slate-500">
                  {wizard.isRecording ? 'Gravando...' : 'Clique para comecar'}
                </span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!cloneCapability.enabled}
                className="p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-brand-500 hover:bg-brand-500/5 flex flex-col items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Importar arquivo de audio"
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-white font-medium">Importar Arquivo</span>
                <span className="text-xs text-slate-500">WAV, MP3, OGG (6-30s)</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {audioUrl && (
              <div className="panel-muted mt-4 p-4">
                <p className="text-sm text-ink-body mb-2">Preview do audio:</p>
                <audio src={audioUrl} controls className="w-full" />
              </div>
            )}
          </div>
        )}

        {wizard.step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Passo 2: Configurar</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Nome da Voz</label>
                <input
                  type="text"
                  value={wizard.name}
                  onChange={(event) => setWizard((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Ex: Minha Voz, Voz do Joao"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Descricao (opcional)</label>
                <input
                  type="text"
                  value={wizard.description}
                  onChange={(event) => setWizard((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Ex: Voz grave, tom calmo"
                  className="input-field"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                Tempo estimado de processamento: <span className="text-brand-300">2-4 segundos</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={resetWizard} className="btn-secondary" aria-label="Voltar ao passo anterior">Voltar</button>
              <button
                onClick={startCloning}
                disabled={!wizard.name || !wizard.audioPath || !cloneCapability.enabled}
                className="btn-primary flex items-center gap-2"
                aria-label="Iniciar clonagem de voz"
              >
                <Wand2 className="w-4 h-4" />
                Iniciar Clonagem
              </button>
            </div>
          </div>
        )}

        {wizard.step === 3 && wizard.isProcessing && (
          <div className="space-y-4 text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: 'var(--vl-state-ready)' }} />
            <h3 className="text-lg font-medium text-ink-strong">Processando...</h3>
            <p className="text-ink-soft">{wizard.progress.message || 'Extraindo caracteristicas da voz...'}</p>
            <div className="max-w-xs mx-auto">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(95,35,194,0.25)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${wizard.progress.percent}%`,
                    background: 'linear-gradient(90deg, #8B5CF6, #49E6FF)',
                    boxShadow: '0 0 12px rgba(139,92,246,0.7)',
                  }}
                />
              </div>
              <p className="text-sm text-ink-soft mt-2 font-mono">{wizard.progress.percent}%</p>
            </div>
          </div>
        )}

        {wizard.step === 4 && wizard.result && (
          <div className="space-y-4 text-center py-6">
            {wizard.result.success ? (
              <>
                <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: 'var(--vl-state-success)' }} />
                <h3 className="text-lg font-medium text-ink-strong">Clonagem concluida</h3>
                <p className="text-ink-soft">
                  A voz <strong>&quot;{wizard.name}&quot;</strong> esta pronta para uso na aba &quot;Falar&quot;.
                </p>
                <button onClick={resetWizard} className="btn-primary">Clonar outra voz</button>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 mx-auto" style={{ color: 'var(--vl-state-error)' }} />
                <h3 className="text-lg font-medium text-ink-strong">Falha na clonagem</h3>
                <p className="text-ink-soft">{wizard.result.error || 'Erro desconhecido'}</p>
                <button onClick={resetWizard} className="btn-secondary">Tentar novamente</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="hud-frame p-6">
        <h2 className="text-lg font-medium text-white mb-4">Vozes clonadas</h2>

        {clonedVoices.length === 0 ? (
          <p className="text-slate-500">Nenhuma voz clonada ainda.</p>
        ) : (
          <div className="space-y-3">
            {clonedVoices.map((voice) => (
              <div key={voice.id} className="hud-frame flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-white font-medium">{voice.name}</p>
                  <p className="text-sm text-slate-500">{voice.description || 'Sem descricao'}</p>
                  <p className="text-xs text-slate-600 mt-1">{voice.modelId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => previewVoice(voice)}
                    className="btn-secondary text-sm flex items-center gap-2"
                    aria-label={`Ouvir amostra da voz ${voice.name}`}
                  >
                    <Play className="w-4 h-4" />
                    Ouvir
                  </button>
                  <button
                    onClick={() => deleteVoice(voice.id)}
                    className="btn-secondary text-sm flex items-center gap-2"
                    style={{ color: 'var(--vl-state-error)' }}
                    aria-label={`Excluir voz ${voice.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
