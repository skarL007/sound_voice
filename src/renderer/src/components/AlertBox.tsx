import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

type AlertSeverity = 'error' | 'warn' | 'info' | 'success'

interface AlertBoxProps {
  severity?: AlertSeverity
  title?: string
  children: ReactNode
  className?: string
}

const config: Record<AlertSeverity, {
  borderColor: string
  background: string
  iconColor: string
  titleColor: string
  Icon: typeof AlertCircle
}> = {
  error: {
    borderColor: 'var(--vl-state-error-accent)',
    background: 'var(--vl-state-error-bg)',
    iconColor: 'var(--vl-state-error)',
    titleColor: 'var(--vl-state-error-text)',
    Icon: AlertCircle,
  },
  warn: {
    borderColor: 'var(--vl-state-warn-accent)',
    background: 'var(--vl-state-warn-bg)',
    iconColor: 'var(--vl-state-warn)',
    titleColor: 'var(--vl-state-warn-text)',
    Icon: AlertTriangle,
  },
  info: {
    borderColor: 'var(--vl-state-live-accent)',
    background: 'var(--vl-state-live-bg)',
    iconColor: 'var(--vl-state-live)',
    titleColor: 'var(--vl-state-live-text)',
    Icon: Info,
  },
  success: {
    borderColor: 'var(--vl-state-success-accent)',
    background: 'var(--vl-state-success-bg)',
    iconColor: 'var(--vl-state-success)',
    titleColor: 'var(--vl-state-success-text)',
    Icon: CheckCircle2,
  },
}

export default function AlertBox({ severity = 'warn', title, children, className = '' }: AlertBoxProps) {
  const { borderColor, background, iconColor, titleColor, Icon } = config[severity]
  return (
    <div
      className={`hud-frame flex items-start gap-3 p-4 ${className}`}
      style={{ borderLeft: `4px solid ${borderColor}`, background }}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: iconColor }} aria-hidden="true" />
      <div className="space-y-1">
        {title && (
          <p className="text-sm font-medium" style={{ color: titleColor }}>{title}</p>
        )}
        <div className="text-sm text-ink-body">{children}</div>
      </div>
    </div>
  )
}
