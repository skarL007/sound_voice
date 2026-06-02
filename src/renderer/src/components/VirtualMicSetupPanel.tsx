import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Mic,
  RefreshCw,
} from 'lucide-react'
import type { VBCableDownloadProgress, VBCableInstallState } from '../utils/virtualMicSetup'

interface VirtualMicSetupPanelProps {
  detected: boolean
  installState: VBCableInstallState
  message?: string
  progress?: VBCableDownloadProgress | null
  installing?: boolean
  compact?: boolean
  onInstall: () => void
  onVerify: () => void
  onOpenSettings?: () => void
  onActivate?: () => void
}

export default function VirtualMicSetupPanel({
  detected,
  installState,
  message,
  progress,
  installing = false,
  compact = false,
  onInstall,
  onVerify,
  onOpenSettings,
  onActivate,
}: VirtualMicSetupPanelProps) {
  if (detected) {
    return (
      <div
        className={`hud-frame ${compact ? 'p-3' : 'p-4'} flex items-start gap-3`}
        style={{ background: 'var(--vl-state-success-bg)', border: '1px solid var(--vl-state-success-border)' }}
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: 'var(--vl-state-success)' }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--vl-state-success-text)' }}>
            VB-Cable detectado
          </p>
          <p className="mt-1 text-sm text-ink-body">
            No Discord, Zoom ou jogo, selecione <span className="font-mono">CABLE Output</span> como microfone.
          </p>
          {onActivate && (
            <button onClick={onActivate} className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
              <Mic className="h-4 w-4" />
              Ativar microfone virtual
            </button>
          )}
        </div>
      </div>
    )
  }

  const isDownloading = installState === 'downloading'
  const isLaunching = installState === 'launching'
  const isLaunched = installState === 'launched'
  const isManual = installState === 'manual'
  const isError = installState === 'error'
  const isBusy = installing || isDownloading || isLaunching

  const title = isDownloading
    ? 'Baixando o microfone virtual...'
    : isLaunching
      ? 'Abrindo o instalador...'
      : isLaunched
        ? 'Instalador aberto'
        : isManual
          ? 'Instalacao manual necessaria'
          : isError
            ? 'Falha ao instalar'
            : 'Microfone virtual nao instalado'

  const body =
    message ||
    (isDownloading
      ? 'Baixando o instalador oficial do VB-Cable. Isso leva alguns segundos.'
      : isLaunching
        ? 'Preparando o instalador do VB-Cable.'
        : isLaunched
          ? 'Siga o instalador: clique em "Install Driver" e, se pedir, reinicie o Windows. Depois clique em Verificar instalacao.'
          : isManual
            ? 'Nao foi possivel automatizar. Use o site oficial e volte para verificar.'
            : isError
              ? 'Algo deu errado. Tente de novo ou use o site oficial.'
              : 'Necessario para Discord, Zoom e jogos ouvirem a voz como microfone.')

  const pct = progress ? Math.max(0, Math.min(100, Math.round(progress.percent))) : 0

  return (
    <div
      className={`hud-frame ${compact ? 'p-3' : 'p-4'} flex items-start gap-3`}
      style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: 'var(--vl-state-warn)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--vl-state-warn-text)' }}>
          {title}
        </p>
        <p className="mt-1 text-sm text-ink-body">{body}</p>

        {isDownloading && progress && (
          <div className="mt-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--vl-state-live-bg)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: 'var(--vl-state-live)' }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              {pct}% · {progress.speed} · {progress.eta}
            </p>
          </div>
        )}

        <p className="mt-2 text-xs text-ink-soft">
          VB-Cable da VB-Audio (donationware) — vb-audio.com/Cable. O instalador oficial pode pedir permissao de
          administrador e reinicio.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {(installState === 'idle' || isError || isManual) && (
            <button
              onClick={onInstall}
              disabled={isBusy}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isError || isManual ? 'Tentar de novo' : 'Baixar e instalar microfone virtual'}
            </button>
          )}
          {(isDownloading || isLaunching) && (
            <button disabled className="btn-secondary inline-flex items-center gap-2 text-sm opacity-70">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isDownloading ? 'Baixando...' : 'Abrindo...'}
            </button>
          )}
          {(isLaunched || isManual || isError) && (
            <button onClick={onVerify} className="btn-secondary inline-flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4" />
              Verificar instalacao
            </button>
          )}
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="btn-secondary inline-flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4" />
              Abrir Ajustes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
