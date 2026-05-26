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
    borderColor: 'rgba(255,107,125,0.5)',
    background: 'rgba(255,107,125,0.08)',
    iconColor: 'var(--vl-state-error)',
    titleColor: '#FFC1CB',
    Icon: AlertCircle,
  },
  warn: {
    borderColor: 'rgba(255,193,90,0.5)',
    background: 'rgba(255,193,90,0.08)',
    iconColor: 'var(--vl-state-warn)',
    titleColor: '#FFE2A8',
    Icon: AlertTriangle,
  },
  info: {
    borderColor: 'rgba(73,230,255,0.4)',
    background: 'rgba(73,230,255,0.07)',
    iconColor: 'var(--vl-state-live)',
    titleColor: '#A5F0FF',
    Icon: Info,
  },
  success: {
    borderColor: 'rgba(97,228,163,0.4)',
    background: 'rgba(97,228,163,0.08)',
    iconColor: 'var(--vl-state-success)',
    titleColor: '#A7F3D0',
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
