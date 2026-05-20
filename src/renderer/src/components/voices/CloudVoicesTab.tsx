import { useEffect, useMemo, useState } from 'react'
import { Cloud, Globe, Loader2, PlayCircle, Search, StopCircle } from 'lucide-react'
import type { CloudVoice } from '../../../../shared/types'
import { useAppStore } from '../../stores/appStore'
import { playCloudAudio, stopCloudAudio } from '../../utils/cloudAudio'
import { toast } from '../../utils/toast'
import { useCloudVoices } from '../../hooks/useCloudVoices'
import {
  SAMPLE_TEXT_BY_LOCALE,
  filterCloudVoices,
  localeFlag,
  shortVoiceLabel,
  sortAvailableLocales,
} from '../../utils/cloudVoiceFormatting'

export default function CloudVoicesTab() {
  const { voices, loading, error } = useCloudVoices()
  const [search, setSearch] = useState('')
  const [localeFilter, setLocaleFilter] = useState<string>('pt-BR')
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const cableDeviceId = useAppStore((state) => state.cableDeviceId)
  const storedCloudVoice = useAppStore((state) => state.cloudVoice)
  const setStoredCloudVoice = useAppStore((state) => state.setCloudVoice)
  const setVoiceSource = useAppStore((state) => state.setVoiceSource)

  useEffect(() => {
    return () => {
      stopCloudAudio()
    }
  }, [])

  const availableLocales = useMemo(() => sortAvailableLocales(voices), [voices])
  const filtered = useMemo(
    () => filterCloudVoices(voices, { localeFilter, search }),
    [voices, localeFilter, search],
  )

  const handlePreview = async (voice: CloudVoice) => {
    if (previewingId === voice.ShortName) {
      stopCloudAudio()
      setPreviewingId(null)
      return
    }
    setPreviewingId(voice.ShortName)
    const sample = SAMPLE_TEXT_BY_LOCALE[voice.Locale] ?? `Hello, I'm ${shortVoiceLabel(voice)}.`
    try {
      const response = await window.electronAPI.synthesizeCloud({ text: sample, voice: voice.ShortName, speed: 1.0 })
      if (response.success && response.audioBase64) {
        await playCloudAudio(response.audioBase64, response.mimeType ?? 'audio/webm')
      } else {
        toast('Falha na previa', response.error || 'Nao foi possivel gerar.', 'error')
      }
    } catch (err) {
      toast('Falha na previa', String(err), 'error')
    } finally {
      setPreviewingId(null)
    }
  }

  const handleSelectAsDefault = (voice: CloudVoice) => {
    setStoredCloudVoice(voice.ShortName)
    setVoiceSource('cloud')
    toast('Voz padrao definida', `${shortVoiceLabel(voice)} sera usada em Falar.`, 'success')
  }

  if (loading) {
    return (
      <div className="hud-frame p-6 flex items-center justify-center gap-3 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando vozes online...
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-2xl p-4 text-sm"
        style={{ background: 'rgba(255,107,125,0.10)', border: '1px solid rgba(255,107,125,0.30)', color: '#FFC1CB' }}
      >
        Sem internet ou Edge TTS indisponivel: {error}.
      </div>
    )
  }

  if (voices.length === 0) {
    return <div className="hud-frame p-6 text-ink-soft">Nenhuma voz online disponivel.</div>
  }

  return (
    <div className="space-y-4">
      <div className="hud-frame hud-frame--hero scanline p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5" style={{ color: 'var(--vl-state-live)' }} />
          <h2 className="text-lg font-semibold text-ink-strong">Catalogo online (Edge TTS)</h2>
          <span className="ml-auto text-sm text-ink-soft">
            {voices.length} vozes em {availableLocales.length} idiomas
          </span>
        </div>
        <p className="text-sm text-ink-body">
          Vozes pre-treinadas da Microsoft, sem instalacao, sem GPU. Precisa apenas de internet.
          {cableDeviceId && <span> Saida configurada para microfone virtual ja ativada.</span>}
        </p>
      </div>

      <div className="hud-frame p-3 flex flex-wrap items-center gap-2">
        <Globe className="h-4 w-4 text-ink-soft" />
        <select
          value={localeFilter}
          onChange={(event) => setLocaleFilter(event.target.value)}
          className="input-field text-xs py-1.5 w-40"
        >
          <option value="all">Todos os idiomas</option>
          {availableLocales.map((locale) => (
            <option key={locale} value={locale}>
              {localeFlag(locale)} {locale}
            </option>
          ))}
        </select>
        <Search className="h-4 w-4 text-ink-soft ml-2" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar voz, idioma, personalidade..."
          className="input-field text-xs py-1.5 flex-1 min-w-[160px]"
        />
        <span className="text-xs text-ink-mute ml-auto">{filtered.length} resultados</span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {filtered.map((voice) => {
          const personalities = voice.VoiceTag?.VoicePersonalities ?? []
          const isSelected = voice.ShortName === storedCloudVoice
          const isPreviewing = voice.ShortName === previewingId
          return (
            <div
              key={voice.ShortName}
              className={`hud-frame card-hover p-3 flex items-center gap-3 ${isSelected ? 'status-pill--ready' : ''}`}
              style={isSelected ? undefined : { background: 'rgba(14,8,32,0.6)' }}
            >
              <span className="text-2xl flex-shrink-0">{localeFlag(voice.Locale)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-ink-strong text-sm truncate">{shortVoiceLabel(voice)}</span>
                  <span
                    className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: voice.Gender === 'Female' ? 'rgba(255,107,125,0.16)' : 'rgba(73,230,255,0.14)',
                      color: voice.Gender === 'Female' ? '#FFC1CB' : '#A5F0FF',
                    }}
                  >
                    {voice.Gender === 'Female' ? 'F' : 'M'}
                  </span>
                  <span className="text-[10px] font-mono text-ink-mute">{voice.Locale}</span>
                </div>
                {personalities.length > 0 && (
                  <p className="text-xs text-ink-soft mt-0.5 truncate">{personalities.join(' · ')}</p>
                )}
              </div>
              <button
                onClick={() => void handlePreview(voice)}
                className="btn-ghost text-xs"
                aria-label={`Previa da voz ${shortVoiceLabel(voice)}`}
                title="Ouvir amostra"
              >
                {isPreviewing ? <StopCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleSelectAsDefault(voice)}
                className={`text-xs px-2.5 py-1 rounded-lg ${isSelected ? 'btn-secondary' : 'btn-primary'}`}
                aria-label={`Definir ${shortVoiceLabel(voice)} como voz padrao`}
              >
                {isSelected ? 'Padrao' : 'Usar'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
