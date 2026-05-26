import { useEffect, useState } from 'react'
import { Headphones, PlayCircle, RefreshCw, Volume2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { toast } from '../utils/toast'

const CABLE_HINT = 'cable'

async function ensureMicPermissionForDeviceLabels(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
  } catch {
    // Permissao negada; enumerateDevices ainda devolve dispositivos com labels vazias.
  }
}

async function playTestChime(deviceId: string | null): Promise<void> {
  const ctx = new AudioContext()
  const dest = ctx.createMediaStreamDestination()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 660
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9)
  osc.connect(gain)
  gain.connect(dest)
  osc.start()
  osc.stop(ctx.currentTime + 0.95)

  const audio = new Audio()
  audio.srcObject = dest.stream
  if (deviceId && typeof (audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId === 'function') {
    try {
      await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId)
    } catch {
      // Fallback: toca no default.
    }
  }
  await audio.play()
  setTimeout(() => {
    audio.pause()
    audio.srcObject = null
    ctx.close().catch(() => undefined)
  }, 1100)
}

interface AudioOutputPickerProps {
  showTestButton?: boolean
}

export default function AudioOutputPicker({ showTestButton = true }: AudioOutputPickerProps) {
  const cableDeviceId = useAppStore((state) => state.cableDeviceId)
  const cableDeviceLabel = useAppStore((state) => state.cableDeviceLabel)
  const setCableDevice = useAppStore((state) => state.setCableDevice)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [testing, setTesting] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      const outputs = list.filter((device) => device.kind === 'audiooutput')
      setDevices(outputs)
      const hasLabels = outputs.some((device) => device.label && device.label.length > 0)
      setNeedsPermission(!hasLabels && outputs.length > 0)
    } catch {
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    if (navigator.mediaDevices?.addEventListener) {
      const handler = () => void refresh()
      navigator.mediaDevices.addEventListener('devicechange', handler)
      return () => navigator.mediaDevices.removeEventListener('devicechange', handler)
    }
    return undefined
  }, [])

  const handleRequestPermission = async () => {
    await ensureMicPermissionForDeviceLabels()
    await refresh()
  }

  const handleSelect = (device: MediaDeviceInfo | null) => {
    if (!device) {
      setCableDevice(null, null)
      return
    }
    setCableDevice(device.deviceId, device.label || null)
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await playTestChime(cableDeviceId)
      toast(
        'Chime enviado',
        cableDeviceId
          ? 'Se o Discord/jogo nao ouviu, confirme que CABLE Output esta selecionado la dentro.'
          : 'Tocou no dispositivo padrao. Selecione CABLE Output para mandar para o Discord.',
        'success',
      )
    } catch (error) {
      toast('Falha no teste', String(error), 'error')
    } finally {
      setTesting(false)
    }
  }

  const cableSuggestions = devices.filter((device) => device.label.toLowerCase().includes(CABLE_HINT))
  const otherDevices = devices.filter((device) => !device.label.toLowerCase().includes(CABLE_HINT))

  return (
    <div className="hud-frame p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4" style={{ color: 'var(--vl-state-live)' }} />
          <h3 className="text-sm font-semibold text-ink-strong">Saida de audio para o microfone virtual</h3>
        </div>
        <button
          onClick={() => void refresh()}
          className="btn-ghost text-xs"
          aria-label="Atualizar dispositivos"
          title="Atualizar"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-xs text-ink-soft leading-relaxed">
        Escolha onde a voz online deve tocar. Para o Discord/jogo ouvir, selecione
        {' '}<strong>CABLE Input (VB-Audio Virtual Cable)</strong> aqui e, no Discord, escolha
        {' '}<strong>CABLE Output</strong> como microfone. As vozes locais usam o roteamento do backend Python.
      </p>

      {needsPermission && (
        <div
          className="rounded-2xl p-3 text-xs flex items-start gap-2"
          style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }}
        >
          <Volume2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-warn)' }} />
          <div className="flex-1 text-ink-body">
            Para ver os nomes dos dispositivos preciso de uma permissao rapida.
            <button onClick={handleRequestPermission} className="btn-ghost text-xs ml-2">
              Liberar nomes
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 max-h-[220px] overflow-auto pr-1">
        <button
          onClick={() => handleSelect(null)}
          className={`w-full text-left rounded-xl p-2.5 text-sm transition-all flex items-center gap-2 ${
            cableDeviceId === null ? 'status-pill--ready font-medium' : ''
          }`}
          style={
            cableDeviceId === null
              ? undefined
              : { border: '1px solid var(--vl-hud-border)', background: 'rgba(14,8,32,0.6)' }
          }
        >
          <Volume2 className="h-4 w-4 flex-shrink-0" />
          Padrao do sistema (apenas alto-falante)
        </button>

        {cableSuggestions.length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-1.5 px-1">VB-Cable detectado</p>
            {cableSuggestions.map((device) => (
              <DeviceRow
                key={device.deviceId}
                device={device}
                selected={device.deviceId === cableDeviceId}
                onSelect={() => handleSelect(device)}
                highlight
              />
            ))}
          </div>
        )}

        {otherDevices.length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-1.5 px-1">Outras saidas</p>
            {otherDevices.map((device) => (
              <DeviceRow
                key={device.deviceId}
                device={device}
                selected={device.deviceId === cableDeviceId}
                onSelect={() => handleSelect(device)}
              />
            ))}
          </div>
        )}

        {devices.length === 0 && !loading && (
          <p className="text-xs text-ink-mute">Nenhum dispositivo de saida encontrado.</p>
        )}
      </div>

      {cableDeviceLabel && cableDeviceId && (
        <div className="panel-muted p-2.5 text-xs text-ink-body flex items-center gap-2">
          <span className="text-ink-mute">Selecionado:</span>
          <span className="text-ink-strong font-medium">{cableDeviceLabel}</span>
        </div>
      )}

      {showTestButton && (
        <button
          onClick={() => void handleTest()}
          disabled={testing}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm"
          aria-label="Testar saida de audio"
        >
          <PlayCircle className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
          {testing ? 'Tocando chime...' : 'Testar saida (chime)'}
        </button>
      )}
    </div>
  )
}

function DeviceRow({
  device,
  selected,
  highlight,
  onSelect,
}: {
  device: MediaDeviceInfo
  selected: boolean
  highlight?: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-2.5 text-sm transition-all flex items-center gap-2 mb-1 ${
        selected ? 'status-pill--live font-medium' : ''
      }`}
      style={
        selected
          ? undefined
          : {
              border: '1px solid var(--vl-hud-border)',
              background: highlight ? 'rgba(73,230,255,0.06)' : 'rgba(14,8,32,0.6)',
            }
      }
      aria-pressed={selected}
    >
      <Headphones className="h-4 w-4 flex-shrink-0" style={{ color: highlight ? 'var(--vl-state-live)' : undefined }} />
      <span className="truncate">{device.label || 'Dispositivo sem nome'}</span>
      {highlight && !selected && (
        <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-mute">Recomendado</span>
      )}
    </button>
  )
}
