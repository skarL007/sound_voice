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
        <UserCircle className="w-7 h-7 text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Clonar Voz</h1>
      </div>

      <p className="text-slate-400">
        A clonagem fica fora do caminho principal do MVP local. Ela entra como recurso avancado apenas quando o runtime CUDA ja esta validado.
      </p>

      {!cloneCapability.enabled && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-200 text-sm font-medium">Clonagem avancada indisponivel neste runtime</p>
            <p className="text-yellow-200/70 text-sm mt-1">{cloneCapability.reason}</p>
            <p className="text-yellow-200/70 text-sm mt-2">
              Primeiro valide a fala local com Piper ou Kokoro. Se quiser clonagem, use uma maquina com NVIDIA/CUDA funcional.
            </p>
          </div>
        </div>
      )}

      <div className="glass-panel p-6">
        <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-4 mb-6">
          <p className="text-sm text-brand-200 font-medium">Motor desta tela</p>
          <p className="text-sm text-brand-100 mt-1">XTTS v2 (avancado, recomendado apenas com NVIDIA/CUDA)</p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  wizard.step >= step ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step}
              </div>
              {step < 4 && <div className="w-8 h-0.5 bg-slate-800" />}
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
                <Mic className={`w-8 h-8 ${wizard.isRecording ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
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
              <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-300 mb-2">Preview do audio:</p>
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
            <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto" />
            <h3 className="text-lg font-medium text-white">Processando...</h3>
            <p className="text-slate-400">{wizard.progress.message || 'Extraindo caracteristicas da voz...'}</p>
            <div className="max-w-xs mx-auto">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${wizard.progress.percent}%` }} />
              </div>
              <p className="text-sm text-slate-500 mt-2">{wizard.progress.percent}%</p>
            </div>
          </div>
        )}

        {wizard.step === 4 && wizard.result && (
          <div className="space-y-4 text-center py-6">
            {wizard.result.success ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                <h3 className="text-lg font-medium text-white">Clonagem concluida</h3>
                <p className="text-slate-400">
                  A voz <strong>&quot;{wizard.name}&quot;</strong> esta pronta para uso na aba &quot;Falar&quot;.
                </p>
                <button onClick={resetWizard} className="btn-primary">Clonar outra voz</button>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                <h3 className="text-lg font-medium text-white">Falha na clonagem</h3>
                <p className="text-slate-400">{wizard.result.error || 'Erro desconhecido'}</p>
                <button onClick={resetWizard} className="btn-secondary">Tentar novamente</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-lg font-medium text-white mb-4">Vozes clonadas</h2>

        {clonedVoices.length === 0 ? (
          <p className="text-slate-500">Nenhuma voz clonada ainda.</p>
        ) : (
          <div className="space-y-3">
            {clonedVoices.map((voice) => (
              <div key={voice.id} className="flex items-center justify-between gap-3 p-4 bg-slate-800/40 rounded-xl border border-slate-800">
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
                    className="btn-secondary text-sm flex items-center gap-2 text-red-300 hover:text-red-200 hover:bg-red-500/20"
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
