import React from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from './Button'

/**
 * Shown when data fails to load, so users can tell a network/server error
 * apart from "no data", and retry without reloading the app.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this information. Please check your connection and try again.',
  onRetry
}) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-state-icon is-error" aria-hidden="true">
        <WifiOff size={28} />
      </div>
      <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>{title}</h3>
      <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '440px' }}>{message}</p>
      {onRetry && (
        <div className="empty-state-actions">
          <Button variant="primary" onClick={onRetry}>
            <RefreshCw size={16} />
            <span>Try again</span>
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Normalizes thrown errors into a user-facing message.
 */
export function getErrorMessage(err, fallback = 'An unexpected error occurred.') {
  if (!err) return fallback
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Reconnect to the internet and try again.'
  }
  return err.message || fallback
}
