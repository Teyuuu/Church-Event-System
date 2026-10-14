import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert } from 'lucide-react'
import { formatTime } from '../../utils/date'

export function ScanResult({ result, onDismiss }) {
  if (!result) return null

  const { success, status, message, attendee_name, classification, checked_in_at, total_confirmed_today } = result

  let bg = 'var(--color-success-bg)'
  let border = '#A7F3D0'
  let textColor = 'var(--color-success)'
  let Icon = CheckCircle2
  let title = 'Check-In Successful!'

  if (status === 'already_checked_in') {
    bg = 'var(--color-warning-bg)'
    border = '#FDE68A'
    textColor = 'var(--color-warning)'
    Icon = AlertTriangle
    title = 'Already Checked In Today!'
  } else if (status === 'payment_required') {
    bg = 'var(--color-danger-bg)'
    border = '#FECACA'
    textColor = 'var(--color-danger)'
    Icon = ShieldAlert
    title = 'Payment Required Before Entry'
  } else if (!success) {
    bg = 'var(--color-danger-bg)'
    border = '#FECACA'
    textColor = 'var(--color-danger)'
    Icon = XCircle
    title = 'Check-In Denied'
  }

  return (
    <div
      style={{
        backgroundColor: bg,
        border: `2px solid ${border}`,
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginTop: '1rem',
        animation: 'modalIn 200ms ease-out',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        textAlign: 'center'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Icon size={40} color={textColor} />
      </div>

      <h3 style={{ fontSize: '1.25rem', color: textColor, margin: 0 }}>
        {title}
      </h3>

      {attendee_name && (
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-brand-navy-900)' }}>
          {attendee_name}
        </div>
      )}

      {classification && (
        <div>
          <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>
            {classification}
          </span>
        </div>
      )}

      {message && (
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', margin: '0.25rem 0' }}>
          {message}
        </p>
      )}

      {checked_in_at && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
          <Clock size={14} />
          <span>Timestamp: {formatTime(new Date(checked_in_at).toTimeString().split(' ')[0])}</span>
        </div>
      )}

      {total_confirmed_today !== undefined && (
        <div style={{
          marginTop: '0.5rem',
          paddingTop: '0.5rem',
          borderTop: `1px solid ${border}`,
          fontWeight: 700,
          fontSize: '0.9rem',
          color: 'var(--color-brand-navy-900)'
        }}>
          Day Headcount: {total_confirmed_today} Confirmed Attendees
        </div>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.825rem',
            cursor: 'pointer'
          }}
        >
          Tap to Scan Next Attendee
        </button>
      )}
    </div>
  )
}
