import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

export type AlertSeverity = 'error' | 'warn' | 'info' | 'success'

export interface AlertSeverityConfig {
  borderColor: string
  background: string
  iconColor: string
  titleColor: string
  Icon: typeof AlertCircle
}

export const alertConfig: Record<AlertSeverity, AlertSeverityConfig> = {
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
