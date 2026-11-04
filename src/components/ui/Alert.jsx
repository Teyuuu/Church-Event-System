import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info
}

/**
 * Inline alert / notice box.
 * @param {{ variant?: 'error'|'warning'|'success'|'info', title?: string, children?: React.ReactNode, className?: string }} props
 */
export function Alert({ variant = 'info', title, children, className = '', style }) {
  const Icon = ICONS[variant] || Info
  return (
    <div
      className={`alert alert-${variant} ${className}`}
      role={variant === 'error' ? 'alert' : 'status'}
      style={style}
    >
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <span className="alert-title">{title}</span>}
        {children}
      </div>
    </div>
  )
}
