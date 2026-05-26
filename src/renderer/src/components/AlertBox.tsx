import type { ReactNode } from 'react'
import { alertConfig } from './alertConfig'
import type { AlertSeverity } from './alertConfig'

interface AlertBoxProps {
  severity?: AlertSeverity
  title?: string
  children: ReactNode
  className?: string
}

export default function AlertBox({ severity = 'warn', title, children, className = '' }: AlertBoxProps) {
  const { borderColor, background, iconColor, titleColor, Icon } = alertConfig[severity]
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
