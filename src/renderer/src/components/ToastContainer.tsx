import { useToastStore } from '../stores/toastStore'
import { useAppStore } from '../stores/appStore'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

const iconMap: Record<ToastType, JSX.Element> = {
  success: <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--vl-state-success)' }} />,
  error: <AlertCircle className="w-5 h-5" style={{ color: 'var(--vl-state-error)' }} />,
  info: <Info className="w-5 h-5" style={{ color: 'var(--vl-state-live)' }} />,
  warning: <AlertTriangle className="w-5 h-5" style={{ color: 'var(--vl-state-warn)' }} />,
}

const styleByType: Record<ToastType, { borderColor: string; background: string }> = {
  success: { borderColor: 'rgba(97,228,163,0.32)', background: 'rgba(97,228,163,0.10)' },
  error: { borderColor: 'rgba(255,107,125,0.32)', background: 'rgba(255,107,125,0.10)' },
  info: { borderColor: 'rgba(73,230,255,0.30)', background: 'rgba(73,230,255,0.08)' },
  warning: { borderColor: 'rgba(255,193,90,0.32)', background: 'rgba(255,193,90,0.10)' },
}

export default function ToastContainer() {
  const { toasts, removeToast, pauseToast, resumeToast } = useToastStore()
  const compactMode = useAppStore((state) => state.compactMode)

  if (toasts.length === 0) return null

  const visibleToasts = compactMode ? toasts.slice(-1) : toasts

  const containerClass = compactMode
    ? 'fixed top-2 left-2 right-2 z-50 flex flex-col gap-2 pointer-events-none'
    : 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none'

  return (
    <div className={containerClass}>
      {visibleToasts.map((toast) => {
        const tone = styleByType[toast.type]
        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-md shadow-lg ${
              compactMode ? 'min-w-0 w-full' : 'min-w-[280px] max-w-md'
            }`}
            style={tone}
            onMouseEnter={() => pauseToast(toast.id)}
            onMouseLeave={() => resumeToast(toast.id)}
            onFocus={() => pauseToast(toast.id)}
            onBlur={() => resumeToast(toast.id)}
          >
            <div className="flex items-start gap-3">
              {iconMap[toast.type]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-strong">{toast.title}</p>
                <p className="text-xs text-ink-body mt-0.5 break-words">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-md text-ink-soft hover:bg-brand-500/15 hover:text-ink-strong transition-colors"
                aria-label="Fechar notificacao"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
