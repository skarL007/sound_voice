import { useEffect, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('components', { keyPrefix: 'audioOutput' })
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
        t('toast.sent'),
        cableDeviceId
          ? heard
            ? t('toast.sentCableHeard')
            : t('toast.sentCableMuted')
          : heard
            ? t('toast.playedHeadset')
            : t('toast.nothing'),
        'success',
      )
    } catch (error) {
      toast(t('toast.failed'), String(error), 'error')
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
          <h3 className="text-sm font-semibold text-ink-strong">{t('title')}</h3>
        </div>
        <button
          onClick={() => void refresh()}
          className="btn-ghost text-xs"
          aria-label={t('refreshAria')}
          title={t('refreshTitle')}
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
          <Trans
            t={t}
            i18nKey="intro"
            components={{
              strong: <strong />,
              cable: (
                <span
                  className="font-mono px-1 rounded"
                  style={{ background: 'var(--vl-surface-overlay)', color: 'var(--vl-state-live-text)' }}
                />
              ),
            }}
          />
        </p>
      </div>

      {needsPermission && (
        <div
          className="rounded-2xl p-3 text-xs flex items-start gap-2"
          style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }}
        >
          <Volume2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--vl-state-warn)' }} />
          <div className="flex-1 text-ink-body">
            {t('permission')}
            <button onClick={handleRequestPermission} className="btn-ghost text-xs ml-2">
              {t('grant')}
            </button>
          </div>
        </div>
      )}

      {/* 1. Entrada do audio para o microfone (o Discord ouve) */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4" style={{ color: 'var(--vl-state-live)' }} />
          <h4 className="text-sm font-semibold text-ink-strong">{t('cableTitle')}</h4>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          <Trans t={t} i18nKey="cableHint" components={{ strong: <strong /> }} />
        </p>
        <div className="space-y-1.5 max-h-[170px] overflow-auto pr-1">
          <SelectRow
            icon={<VolumeX className="h-4 w-4 flex-shrink-0" />}
            label={t('noCable')}
            selected={cableDeviceId === null}
            onSelect={() => setCableDevice(null, null)}
          />
          {cableDevices.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-1.5 px-1">{t('cableDetected')}</p>
              {cableDevices.map((device) => (
                <SelectRow
                  key={device.deviceId}
                  icon={<Mic className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--vl-state-live)' }} />}
                  label={device.label || t('unnamed')}
                  badge={device.deviceId === cableDeviceId ? undefined : t('recommended')}
                  selected={device.deviceId === cableDeviceId}
                  highlight
                  onSelect={() => setCableDevice(device.deviceId, device.label || null)}
                />
              ))}
            </div>
          )}
          {otherDevices.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-1.5 px-1">{t('otherOutputs')}</p>
              {otherDevices.map((device) => (
                <SelectRow
                  key={device.deviceId}
                  icon={<Headphones className="h-4 w-4 flex-shrink-0" />}
                  label={device.label || t('unnamed')}
                  selected={device.deviceId === cableDeviceId}
                  onSelect={() => setCableDevice(device.deviceId, device.label || null)}
                />
              ))}
            </div>
          )}
          {devices.length === 0 && !loading && (
            <p className="text-xs text-ink-mute">{t('noDevice')}</p>
          )}
        </div>
      </section>

      {/* 2. Saida para o usuario ouvir a propria voz (monitor) */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4" style={{ color: 'var(--vl-state-ready)' }} />
          <h4 className="text-sm font-semibold text-ink-strong">{t('monitorTitle')}</h4>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          <Trans t={t} i18nKey="monitorHint" components={{ strong: <strong /> }} />
        </p>
        <div className="space-y-1.5 max-h-[170px] overflow-auto pr-1">
          <SelectRow
            icon={<VolumeX className="h-4 w-4 flex-shrink-0" />}
            label={t('monitorMuted')}
            selected={monitorDeviceId === null}
            onSelect={() => setMonitorDevice(null, null)}
          />
          <SelectRow
            icon={<Volume2 className="h-4 w-4 flex-shrink-0" />}
            label={t('systemDefault')}
            selected={monitorDeviceId === 'default'}
            onSelect={() => setMonitorDevice('default', 'System default')}
          />
          {otherDevices.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-1.5 px-1">{t('availableOutputs')}</p>
              {otherDevices
                .filter((device) => device.deviceId !== 'default')
                .map((device) => (
                  <SelectRow
                    key={device.deviceId}
                    icon={<Headphones className="h-4 w-4 flex-shrink-0" />}
                    label={device.label || t('unnamed')}
                    selected={device.deviceId === monitorDeviceId}
                    onSelect={() => setMonitorDevice(device.deviceId, device.label || null)}
                  />
                ))}
            </div>
          )}
        </div>
        {monitorDeviceId === null && (
          <p className="text-[11px]" style={{ color: 'var(--vl-state-warn-text)' }}>
            {t('monitorMutedWarning')}
          </p>
        )}
        {monitorDeviceLabel && monitorDeviceId && monitorDeviceId !== 'default' && (
          <p className="text-[11px] text-ink-soft">
            <Trans
              t={t}
              i18nKey="listeningOn"
              values={{ name: monitorDeviceLabel }}
              components={{ name: <span className="text-ink-strong font-medium" /> }}
            />
          </p>
        )}
      </section>

      {showTestButton && (
        <button
          onClick={() => void handleTest()}
          disabled={testing}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm"
          aria-label={t('test')}
        >
          <PlayCircle className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
          {testing ? t('testing') : t('test')}
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
