import { useMemo, useState } from 'react'
import { Cloud, Globe, Search, Volume2 } from 'lucide-react'
import type { CloudVoice } from '../../../shared/types'
import { useCloudVoices } from '../hooks/useCloudVoices'
import {
  filterCloudVoices,
  localeFlag,
  shortVoiceLabel,
  sortAvailableLocales,
} from '../utils/cloudVoiceFormatting'

interface CloudVoicePickerProps {
  selectedVoice: string | null
  onSelect: (voice: CloudVoice) => void
}

export default function CloudVoicePicker({ selectedVoice, onSelect }: CloudVoicePickerProps) {
  const { voices, loading, error } = useCloudVoices()
  const [search, setSearch] = useState('')
  const [localeFilter, setLocaleFilter] = useState<string>('pt-BR')

  const availableLocales = useMemo(() => sortAvailableLocales(voices), [voices])
  const filteredVoices = useMemo(
    () => filterCloudVoices(voices, { localeFilter, search }),
    [voices, localeFilter, search],
  )

  if (loading) {
    return (
      <div className="hud-frame p-4 space-y-3" aria-busy="true" aria-label="Carregando vozes online">
        <div className="skeleton-pulse h-4 w-40" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-pulse h-12 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-2xl p-4 text-sm"
        style={{ background: 'rgba(255,107,125,0.10)', border: '1px solid rgba(255,107,125,0.30)', color: '#FFC1CB' }}
      >
        Falha ao carregar vozes online: {error}. Verifique sua conexao com a internet e tente novamente.
      </div>
    )
  }

  if (voices.length === 0) {
    return (
      <div className="hud-frame p-4 text-ink-soft">
        Nenhuma voz online disponivel no momento.
      </div>
    )
  }

  return (
    <div className="hud-frame p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4" style={{ color: 'var(--vl-state-live)' }} />
        <h3 className="text-sm font-semibold text-ink-strong">Vozes online (Edge TTS)</h3>
        <span className="text-xs text-ink-soft ml-auto">{voices.length} vozes · sem instalacao</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-ink-soft" />
          <select
            value={localeFilter}
            onChange={(event) => setLocaleFilter(event.target.value)}
            className="input-field py-1.5 text-xs w-40"
            aria-label="Filtrar por idioma"
          >
            <option value="all">Todos os idiomas</option>
            {availableLocales.map((locale) => (
              <option key={locale} value={locale}>
                {localeFlag(locale)} {locale}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <Search className="h-3.5 w-3.5 text-ink-soft" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar voz..."
            className="input-field py-1.5 text-xs"
            aria-label="Buscar voz"
          />
        </div>
      </div>

      <div className="max-h-[320px] overflow-auto space-y-1.5 pr-1">
        {filteredVoices.length === 0 && (
          <p className="text-sm text-ink-soft text-center py-6">Nenhuma voz com esses filtros.</p>
        )}
        {filteredVoices.map((voice) => {
          const isSelected = voice.ShortName === selectedVoice
          const personalities = voice.VoiceTag?.VoicePersonalities ?? []
          return (
            <button
              key={voice.ShortName}
              onClick={() => onSelect(voice)}
              className={`w-full text-left rounded-xl p-3 transition-all flex items-center gap-3 ${
                isSelected ? 'status-pill--ready' : ''
              }`}
              style={
                isSelected
                  ? undefined
                  : { border: '1px solid var(--vl-hud-border)', background: 'rgba(14,8,32,0.6)' }
              }
              aria-pressed={isSelected}
            >
              <span className="text-lg">{localeFlag(voice.Locale)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-ink-strong text-sm">{shortVoiceLabel(voice)}</span>
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
              {isSelected && <Volume2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--vl-state-ready)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
