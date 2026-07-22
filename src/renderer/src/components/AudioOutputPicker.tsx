import { useEffect, useState, type ReactNode } from 'react'
import { Headphones, Mic, PlayCircle, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { toast } from '../utils/toast'
import { buildAudioOutputs } from '../utils/cloudAudio'

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

// Toca um chime curto exatamente nas mesmas saidas que a voz usaria (cabo +
// monitor), para validar os dois caminhos de uma vez.
async function playTestChime(cableId: string | null, monitorId: string | null): Promise<void> {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 660
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9)
  osc.connect(gain)

  const outputs = buildAudioOutputs({ cableDeviceId: cableId, monitorDeviceId: monitorId })
  const audios: HTMLAudioElement[] = []
  for (const out of outputs) {
    if (out.sinkId) {
      const dest = ctx.createMediaStreamDestination()
      gain.connect(dest)
      const audio = new Audio()
      audio.srcObject = dest.stream
      const sinkable = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }
      if (typeof sinkable.setSinkId === 'function') {
        try {
          await sinkable.setSinkId(out.sinkId)
        } catch {
          // Fallback: toca no default.
        }
      }
      audios.push(audio)
    } else {
      gain.connect(ctx.destination)
    }
  }
  osc.start()
  osc.stop(ctx.currentTime + 0.95)
  await Promise.all(audios.map((audio) => audio.play()))
  setTimeout(() => {
    for (const audio of audios) {
      audio.pause()
      audio.srcObject = null
    }
    ctx.close().catch(() => undefined)
  }, 1100)
}

interface AudioOutputPickerProps {
  showTestButton?: boolean
}

export default function AudioOutputPicker({ showTestButton = true }: AudioOutputPickerProps) {
  const cableDeviceId = useAppStore((state) => state.cableDeviceId)
  const setCableDevice = useAppStore((state) => state.setCableDevice)
  const monitorDeviceId = useAppStore((state) => state.monitorDeviceId)
  const monitorDeviceLabel = useAppStore((state) => state.monitorDeviceLabel)
  const setMonitorDevice = useAppStore((state) => state.setMonitorDevice)
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

  const handleTest = async () => {
    setTesting(true)
    try {
      await playTestChime(cableDeviceId, monitorDeviceId)
      const heard = monitorDeviceId !== null
      toast(
        'Chime sent',
        cableDeviceId
          ? `Sent to the virtual microphone${heard ? ' and your headset' : ' (monitor muted)'}. In Discord, confirm CABLE Output as your microphone.`
          : heard
            ? 'Played on your headset/speaker. Select the virtual microphone for Discord to hear it.'
            : 'Monitor muted and no virtual microphone: nothing to hear.',
        'success',
      )
    } catch (error) {
      toast('Test failed', String(error), 'error')
    } finally {
      setTesting(false)
    }
  }

  const cableDevices = devices.filter((device) => device.label.toLowerCase().includes(CABLE_HINT))
  const otherDevices = devices.filter((device) => !device.label.toLowerCase().includes(CABLE_HINT))

  return (
    <div className="hud-frame p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4" style={{ color: 'var(--vl-state-live)' }} />
          <h3 className="text-sm font-semibold text-ink-strong">Virtual microphone audio</h3>
        </div>
        <button
          onClick={() => void refresh()}
          className="btn-ghost text-xs"
          aria-label="Refresh devices"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div
        className="rounded-xl p-3 text-xs flex items-start gap-2"
        style={{ background: 'var(--vl-state-live-bg)', border: '1px solid var(--vl-state-live-border)' }}
      >
        <Mic className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-live)' }} />
        <p className="text-ink-body">
          In <strong>Discord, Zoom, or your game</strong>, choose{' '}
          <span
            className="font-mono px-1 rounded"
            style={{ background: 'var(--vl-surface-overlay)', color: 'var(--vl-state-live-text)' }}
          >
            CABLE Output
          </span>{' '}
          as the microphone. Here in the app, the voice goes out through <strong>CABLE Input</strong> (below).
        </p>
      </div>

      {needsPermission && (
        <div
          className="rounded-2xl p-3 text-xs flex items-start gap-2"
          style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }}
        >
          <Volume2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-warn)' }} />
          <div className="flex-1 text-ink-body">
            To see device names I need a quick permission grant.
            <button onClick={handleRequestPermission} className="btn-ghost text-xs ml-2">
              Grant access
            </button>
          </div>
        </div>
      )}

      {/* 1. Entrada do audio para o microfone (o Discord ouve) */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4" style={{ color: 'var(--vl-state-live)' }} />
          <h4 className="text-sm font-semibold text-ink-strong">1. Virtual microphone (Discord hears this)</h4>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          The voice <strong>enters</strong> here. Choose <strong>CABLE Input</strong> (already marked as recommended).
        </p>
        <div className="space-y-1.5 max-h-[170px] overflow-auto pr-1">
          <SelectRow
            icon={<VolumeX className="h-4 w-4 flex-shrink-0" />}
            label="No virtual microphone (speaker only)"
            selected={cableDeviceId === null}
            onSelect={() => setCableDevice(null, null)}
          />
          {cableDevices.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-1.5 px-1">VB-Cable detected</p>
              {cableDevices.map((device) => (
                <SelectRow
                  key={device.deviceId}
                  icon={<Mic className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--vl-state-live)' }} />}
                  label={device.label || 'Unnamed device'}
                  badge={device.deviceId === cableDeviceId ? undefined : 'Recommended'}
                  selected={device.deviceId === cableDeviceId}
                  highlight
                  onSelect={() => setCableDevice(device.deviceId, device.label || null)}
                />
              ))}
            </div>
          )}
          {otherDevices.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-1.5 px-1">Other outputs</p>
              {otherDevices.map((device) => (
                <SelectRow
                  key={device.deviceId}
                  icon={<Headphones className="h-4 w-4 flex-shrink-0" />}
                  label={device.label || 'Unnamed device'}
                  selected={device.deviceId === cableDeviceId}
                  onSelect={() => setCableDevice(device.deviceId, device.label || null)}
                />
              ))}
            </div>
          )}
          {devices.length === 0 && !loading && (
            <p className="text-xs text-ink-mute">No output device found.</p>
          )}
        </div>
      </section>

      {/* 2. Saida para o usuario ouvir a propria voz (monitor) */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4" style={{ color: 'var(--vl-state-ready)' }} />
          <h4 className="text-sm font-semibold text-ink-strong">2. You hear it on (monitor)</h4>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          The <strong>output</strong> for you to hear your own voice while it goes to Discord. Choose your
          headset/speaker — or leave it muted if you'd rather not hear yourself.
        </p>
        <div className="space-y-1.5 max-h-[170px] overflow-auto pr-1">
          <SelectRow
            icon={<VolumeX className="h-4 w-4 flex-shrink-0" />}
            label="Don't hear it (muted)"
            selected={monitorDeviceId === null}
            onSelect={() => setMonitorDevice(null, null)}
          />
          <SelectRow
            icon={<Volume2 className="h-4 w-4 flex-shrink-0" />}
            label="System default"
            selected={monitorDeviceId === 'default'}
            onSelect={() => setMonitorDevice('default', 'System default')}
          />
          {otherDevices.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-1.5 px-1">Available outputs</p>
              {otherDevices
                .filter((device) => device.deviceId !== 'default')
                .map((device) => (
                  <SelectRow
                    key={device.deviceId}
                    icon={<Headphones className="h-4 w-4 flex-shrink-0" />}
                    label={device.label || 'Unnamed device'}
                    selected={device.deviceId === monitorDeviceId}
                    onSelect={() => setMonitorDevice(device.deviceId, device.label || null)}
                  />
                ))}
            </div>
          )}
        </div>
        {monitorDeviceId === null && (
          <p className="text-[11px]" style={{ color: 'var(--vl-state-warn-text)' }}>
            Monitor muted: Discord hears it, but you won't hear your own voice.
          </p>
        )}
        {monitorDeviceLabel && monitorDeviceId && monitorDeviceId !== 'default' && (
          <p className="text-[11px] text-ink-soft">
            Listening on: <span className="text-ink-strong font-medium">{monitorDeviceLabel}</span>
          </p>
        )}
      </section>

      {showTestButton && (
        <button
          onClick={() => void handleTest()}
          disabled={testing}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm"
          aria-label="Test audio (chime)"
        >
          <PlayCircle className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
          {testing ? 'Playing chime...' : 'Test audio (chime)'}
        </button>
      )}
    </div>
  )
}

function SelectRow({
  icon,
  label,
  badge,
  selected,
  highlight,
  onSelect,
}: {
  icon: ReactNode
  label: string
  badge?: string
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
              background: highlight ? 'var(--vl-state-live-bg)' : 'var(--vl-surface-raised)',
            }
      }
      aria-pressed={selected}
    >
      {icon}
      <span className="truncate">{label}</span>
      {badge && !selected && (
        <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-mute">{badge}</span>
      )}
    </button>
  )
}
