import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react'
import { formatClockTime } from '../../utils/date'

/**
 * Maps a check-in result to its visual tone.
 * @returns {'success'|'warning'|'danger'}
 */
export function getResultTone(result) {
  if (!result) return 'danger'
  if (result.status === 'already_checked_in') return 'warning'
  if (result.success) return 'success'
  return 'danger'
}

function describe(result) {
  const tone = getResultTone(result)
  if (tone === 'success') return { Icon: CheckCircle2, title: 'Checked In' }
  if (tone === 'warning') return { Icon: AlertTriangle, title: 'Already Checked In Today' }
  if (result.status === 'payment_required') return { Icon: ShieldAlert, title: 'Payment Required' }
  return { Icon: XCircle, title: 'Check-In Denied' }
}

/**
 * Large, high-contrast scan outcome.
 * - variant="overlay": covers the camera viewfinder (phones)
 * - variant="card": standalone card (manual / barcode-device modes)
 * Announced to screen readers via aria-live.
 */
export function ScanResult({ result, onDismiss, variant = 'card' }) {
  if (!result) return null

  const tone = getResultTone(result)
  const { Icon, title } = describe(result)
  const { attendee_name, classification, message, checked_in_at, total_confirmed_today } = result
  const className = variant === 'overlay' ? `scan-overlay is-${tone}` : `scan-result-card is-${tone}`

  return (
    <div
      className={className}
      role="status"
      aria-live="assertive"
      onClick={onDismiss}
    >
      <Icon size={variant === 'overlay' ? 64 : 44} aria-hidden="true" style={{ margin: '0 auto' }} />
      <div className="scan-overlay-title">{title}</div>
      {attendee_name && <div className="scan-overlay-name">{attendee_name}</div>}
      {classification && (
        <div style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.05em', opacity: 0.9 }}>
          {classification}
        </div>
      )}
      {message && tone !== 'success' && <div className="scan-overlay-msg">{message}</div>}
      {checked_in_at && (
        <div className="scan-overlay-msg">
          {tone === 'warning' ? 'First checked in at ' : 'Time: '}{formatClockTime(checked_in_at)}
        </div>
      )}
      {total_confirmed_today !== undefined && (
        <div className="scan-overlay-msg" style={{ fontWeight: 700 }}>
          Day headcount: {total_confirmed_today}
        </div>
      )}
      {onDismiss && <div className="scan-overlay-hint">Tap to continue scanning</div>}
    </div>
  )
}
