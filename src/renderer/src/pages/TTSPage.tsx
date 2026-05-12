import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  BookmarkPlus,
  History,
  Keyboard,
  Mic,
  MonitorUp,
  Pin,
  Send,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react'
import type { HardwareInfo, ModelInfo } from '../../../shared/types'
import VirtualKeyboard from '../components/VirtualKeyboard'
import { useCommunicationSettings } from '../hooks/useCommunicationSettings'
import { useAppStore } from '../stores/appStore'
import { notify } from '../utils/notify'
import { toast } from '../utils/toast'
import { buildHistoryItem } from '../utils/communicationState'
import { isModelVisibleInMvp } from '../utils/modelSupport'

export default function TTSPage() {
  const { defaultModelId, defaultSpeed, setDefaultModelId, setDefaultSpeed, showExperimentalModels } = useAppStore()
  const {
    text,
    setText,
    history,
    quickPhrases,
    keepTextAfterSpeak,
    setKeepTextAfterSpeak,
    addHistoryItem,
    addQuickPhrase,
    deleteQuickPhrase,
  } = useCommunicationSettings()
  const [modelId, setModelId] = useState(defaultModelId)
  const [voiceId, setVoiceId] = useState('')
  const [speed, setSpeed] = useState(defaultSpeed)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [virtualMicEnabled, setVirtualMicEnabled] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const cancelRef = useRef(false)
  const isSpeakingRef = useRef(false)

  useEffect(() => {
    window.electronAPI.getVirtualMicStatus().then((enabled) => {
      setVirtualMicEnabled(enabled)
    })

    const unsubFocus = window.electronAPI.onGlobalFocusTTS(() => {
      textAreaRef.current?.focus()
    })
    const unsubStop = window.electronAPI.onGlobalStopAudio(() => {
      if (isSpeakingRef.current) {
        cancelRef.current = true
        window.electronAPI.stopAudio()
        setIsSpeaking(false)
      }
    })

    const syncVirtualMic = (event: Event) => {
      setVirtualMicEnabled((event as CustomEvent<boolean>).detail)
    }

    window.addEventListener('voicelaunch:virtual-mic-changed', syncVirtualMic as EventListener)

    return () => {
      unsubFocus()
      unsubStop()
      window.removeEventListener('voicelaunch:virtual-mic-changed', syncVirtualMic as EventListener)
    }
  }, [])

  useEffect(() => {
    isSpeakingRef.current = isSpeaking
  }, [isSpeaking])

  useEffect(() => {
    loadRuntimeState()
  }, [showExperimentalModels])

  const loadRuntimeState = async () => {
    const [registry, detectedHardware] = await Promise.all([
      window.electronAPI.getModelRegistry(),
      window.electronAPI.getHardwareInfo(),
    ])

    setHardware(detectedHardware)

    const visibleInstalledModels = registry.filter(
      (model) => model.installed && isModelVisibleInMvp(model, detectedHardware, showExperimentalModels),
    )
    setAvailableModels(visibleInstalledModels)

    if (visibleInstalledModels.length === 0) {
      setModelId('')
      return
    }

    if (!visibleInstalledModels.find((model) => model.id === modelId)) {
      const fallback = visibleInstalledModels[0].id
      setModelId(fallback)
      setDefaultModelId(fallback)
    }
  }

  const handleModelChange = (newModelId: string) => {
    setModelId(newModelId)
    setDefaultModelId(newModelId)
  }

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed)
    setDefaultSpeed(newSpeed)
  }

  const saveCurrentPhrase = () => {
    if (!text.trim()) return
    addQuickPhrase(text)
    toast('Frase salva', 'A frase atual foi adicionada aos atalhos rapidos.', 'success')
  }

  const speak = async (textToSpeak: string) => {
    if (!textToSpeak.trim() || !modelId) return

    if (isSpeaking) {
      cancelRef.current = true
      await window.electronAPI.stopAudio()
      setIsSpeaking(false)
      return
    }

    cancelRef.current = false
    setIsSpeaking(true)

    try {
      const response = await window.electronAPI.synthesize({
        text: textToSpeak,
        modelId,
        voiceId: voiceId || undefined,
        speed,
      })

      if (cancelRef.current) return

      if (response.success && response.audioPath) {
        await window.electronAPI.playAudio(response.audioPath)
        if (cancelRef.current) return

        addHistoryItem(
          buildHistoryItem({
            text: textToSpeak,
            modelId,
            voiceId: voiceId || undefined,
            audioPath: response.audioPath,
          }),
        )

        if (keepTextAfterSpeak) {
          setText(textToSpeak)
        } else {
          setText('')
        }
      } else {
        const msg = response.error || 'Nao foi possivel gerar o audio.'
        notify('Erro na fala', msg)
        toast('Erro na fala', msg, 'error')
      }
    } catch (error) {
      if (cancelRef.current) return
      const msg = String(error)
      notify('Erro na fala', msg)
      toast('Erro na fala', msg, 'error')
    } finally {
      setIsSpeaking(false)
    }
  }

  const toggleVirtualMic = async () => {
    const newState = !virtualMicEnabled
    const success = await window.electronAPI.setVirtualMic(newState)
    if (success) {
      setVirtualMicEnabled(newState)
      window.dispatchEvent(new CustomEvent('voicelaunch:virtual-mic-changed', { detail: newState }))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void speak(text)
    }
  }

  const noReadyModel = availableModels.length === 0
  const activeModel = availableModels.find((model) => model.id === modelId)

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-400/25 bg-brand-400/10 shadow-[0_0_0_1px_rgba(73,230,255,0.08)]">
              <Volume2 className="h-5 w-5 text-brand-300" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-50">Falar</h1>
              <p className="max-w-2xl text-sm text-slate-400">
                Console principal para composicao, repeticao e disparo rapido de voz.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleVirtualMic}
              className={`inline-flex items-center gap-2 rounded-[14px] border px-4 py-2 text-sm font-medium transition-all ${
                virtualMicEnabled
                  ? 'border-green-400/40 bg-green-500/15 text-green-200 shadow-[0_10px_24px_rgba(34,197,94,0.14)]'
                  : 'border-[rgba(51,80,107,0.65)] bg-[rgba(17,26,36,0.92)] text-slate-300 hover:border-brand-400/40 hover:text-slate-100'
              }`}
              title="Envia a voz gerada como microfone virtual para outros aplicativos"
            >
              <Mic className="h-4 w-4" />
              {virtualMicEnabled ? 'Microfone virtual ativo' : 'Ativar microfone virtual'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`btn-secondary inline-flex items-center gap-2 text-sm ${
                showHistory ? 'border-brand-400/50 text-brand-200' : ''
              }`}
              title="Historico de frases"
              aria-label="Historico de frases"
            >
              <History className="h-4 w-4" />
              {showHistory ? 'Ocultar historico' : 'Abrir historico'}
            </button>
          </div>
        </div>

        <div className="panel-surface flex flex-wrap items-center gap-3 p-3">
          <span className="status-pill border-brand-400/25 bg-brand-400/10 text-brand-100">
            <Volume2 className="h-3.5 w-3.5 text-brand-300" />
            Modelo: {activeModel?.name ?? 'Nenhum modelo pronto'}
          </span>
          <span
            className={`status-pill ${
              virtualMicEnabled
                ? 'border-green-400/30 bg-green-500/10 text-green-200'
                : 'border-slate-700 bg-slate-900/60 text-slate-400'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            {virtualMicEnabled ? 'Mic virtual ligado' : 'Mic virtual desligado'}
          </span>
          <span
            className={`status-pill ${
              isSpeaking
                ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
                : 'border-slate-700 bg-slate-900/60 text-slate-300'
            }`}
          >
            <MonitorUp className="h-3.5 w-3.5" />
            {isSpeaking ? 'Falando agora' : 'Pronto para falar'}
          </span>
          <span
            className={`status-pill ${
              keepTextAfterSpeak
                ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                : 'border-slate-700 bg-slate-900/60 text-slate-400'
            }`}
          >
            <Pin className="h-3.5 w-3.5" />
            {keepTextAfterSpeak ? 'Manter texto ligado' : 'Manter texto desligado'}
          </span>
        </div>
      </div>

      {noReadyModel && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-200 text-sm font-medium">Nenhum modelo estavel pronto para uso</p>
            <p className="text-yellow-200/70 text-sm mt-1">
              Prepare primeiro o Piper na aba Modelos. Esse e o caminho mais seguro para a primeira fala local.
            </p>
            {hardware?.gpuVendor?.trim().toLowerCase() === 'amd' && (
              <p className="text-yellow-200/70 text-sm mt-2">
                Para AMD, o fluxo principal do MVP continua em Piper e Kokoro.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="panel-surface mb-4 flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Modelo</label>
          <select
            value={modelId}
            onChange={(e) => handleModelChange(e.target.value)}
            className="input-field w-56 py-2 text-sm"
            disabled={noReadyModel}
          >
            {noReadyModel && <option value="">Nenhum modelo pronto</option>}
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Velocidade</label>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-28 accent-brand-400"
          />
          <span className="w-10 text-sm text-slate-300">{speed.toFixed(1)}x</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Voz</label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="Padrao"
            className="input-field w-40 py-2 text-sm"
            disabled={noReadyModel}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="panel-surface flex min-h-0 flex-1 flex-col p-5">
            <textarea
              ref={textAreaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma frase e fale imediatamente. Enter envia. Shift+Enter quebra linha."
              className="min-h-[280px] flex-1 resize-none bg-transparent text-xl leading-8 text-slate-50 outline-none placeholder:text-slate-500"
              autoFocus
              disabled={noReadyModel}
            />

            <div className="mt-4 flex flex-col gap-3 border-t border-chrome-600/70 pt-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
                    {text.length} caracteres
                  </span>
                  <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
                    {availableModels.length} modelos prontos
                  </span>
                  <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
                    {voiceId.trim() ? `Voz ${voiceId}` : 'Voz padrao'}
                  </span>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={keepTextAfterSpeak}
                    onChange={(event) => setKeepTextAfterSpeak(event.target.checked)}
                    className="accent-brand-500"
                  />
                  Manter texto apos falar
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                  onClick={() => {
                    setText('')
                    textAreaRef.current?.focus()
                  }}
                  className="btn-secondary text-sm"
                  aria-label="Limpar texto"
                >
                  Limpar
                </button>
                <VirtualKeyboard
                  onKeyPress={(key) => {
                    setText((prev) => prev + key)
                    setTimeout(() => textAreaRef.current?.focus(), 50)
                  }}
                  onBackspace={() => {
                    setText((prev) => prev.slice(0, -1))
                  }}
                  onSpace={() => {
                    setText((prev) => prev + ' ')
                  }}
                  onEnter={() => {
                    void speak(text)
                  }}
                />
                <button
                  onClick={saveCurrentPhrase}
                  disabled={!text.trim()}
                  className="btn-secondary text-sm flex items-center gap-2"
                  aria-label="Salvar frase atual como atalho rapido"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Salvar frase
                </button>
                <button
                  onClick={() => void speak(text)}
                  disabled={(!isSpeaking && !text.trim()) || noReadyModel}
                  className="btn-primary inline-flex min-w-[158px] items-center justify-center gap-2 px-5 py-3 text-sm"
                  aria-label={isSpeaking ? 'Parar de falar' : 'Falar texto'}
                >
                  {isSpeaking ? (
                    <>
                      <Square className="w-4 h-4" />
                      Parar
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Falar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="panel-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="h-4 w-4 text-brand-300" />
              <h3 className="text-sm font-semibold text-slate-200">Frases rapidas</h3>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              As 9 primeiras frases tambem podem ser usadas com os atalhos globais `Ctrl+Shift+1..9`.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {quickPhrases.map((phrase) => (
                <div
                  key={phrase}
                  className="group flex min-h-[88px] flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/50 p-3 transition-all hover:border-brand-400/35 hover:bg-slate-900/80"
                >
                  <button
                    onClick={() => {
                      setText(phrase)
                      void speak(phrase)
                    }}
                    disabled={noReadyModel}
                    className="flex-1 text-left text-sm font-medium text-slate-200 transition-colors disabled:opacity-50 group-hover:text-slate-50"
                  >
                    <span className="line-clamp-3">{phrase}</span>
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Command pad</span>
                    <button
                      onClick={() => deleteQuickPhrase(phrase)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-red-400/40 hover:text-red-200"
                      aria-label={`Remover frase rapida: ${phrase}`}
                      title="Remover frase rapida"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showHistory && (
          <aside className="panel-surface w-full overflow-auto p-4 xl:w-80">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-brand-300" />
              <h3 className="text-sm font-semibold text-slate-200">Historico persistente</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma frase ainda.</p>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3"
                  >
                    <button
                      onClick={() => {
                        setText(item.text)
                        setModelId(item.modelId)
                        if (item.voiceId) setVoiceId(item.voiceId)
                      }}
                      className="w-full text-left"
                      aria-label={`Carregar frase: ${item.text.slice(0, 30)}`}
                    >
                      <p className="line-clamp-3 text-sm text-slate-200">{item.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-400">
                          {item.modelId}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setText(item.text)
                          void speak(item.text)
                        }}
                        className="btn-secondary flex items-center gap-1 text-xs"
                      >
                        <Send className="w-3 h-3" />
                        Repetir
                      </button>
                      <button
                        onClick={() => {
                          addQuickPhrase(item.text)
                          toast('Frase fixada', 'A frase do historico foi adicionada aos atalhos rapidos.', 'success')
                        }}
                        className="btn-secondary flex items-center gap-1 text-xs"
                      >
                        <Pin className="w-3 h-3" />
                        Fixar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {virtualMicEnabled && (
        <div className="mt-4 flex items-center gap-2 text-sm text-green-300 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
          <MonitorUp className="w-4 h-4" />
          <span>
            O audio gerado sera enviado para o <strong>microfone virtual</strong>.
            Selecione &quot;CABLE Output&quot; como microfone no Discord, Zoom ou jogos.
          </span>
        </div>
      )}
    </div>
  )
}
