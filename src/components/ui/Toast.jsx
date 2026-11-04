import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

/**
 * Global toast notifications. Replaces window.alert() for non-blocking feedback.
 * Usage: const toast = useToast(); toast.success('Saved')
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message, variant = 'info', duration = 4000) => {
    const id = ++idRef.current
    setToasts(prev => [...prev.slice(-3), { id, message, variant }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const api = useMemo(() => ({
    show,
    dismiss,
    success: (msg, d) => show(msg, 'success', d),
    error: (msg, d) => show(msg, 'error', d ?? 6000),
    warning: (msg, d) => show(msg, 'warning', d),
    info: (msg, d) => show(msg, 'info', d)
  }), [show, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region no-print" aria-live="polite" aria-atomic="false">
        {toasts.map(t => {
          const Icon = ICONS[t.variant] || Info
          return (
            <div key={t.id} className={`toast toast-${t.variant}`} role={t.variant === 'error' ? 'alert' : 'status'}>
              <Icon size={18} aria-hidden="true" />
              <span>{t.message}</span>
              <button type="button" className="toast-dismiss" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
