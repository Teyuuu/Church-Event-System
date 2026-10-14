import React from 'react'

/**
 * Visual Status Badge with standardized brand styling
 * @param {{ status: string, label?: string }} props
 */
export function StatusBadge({ status, label }) {
  const normalized = (status || '').toLowerCase()
  const displayLabel = label || status || 'Unknown'

  let variantClass = 'badge-neutral'

  switch (normalized) {
    case 'open':
    case 'registration_open':
    case 'confirmed':
    case 'completed':
    case 'paid':
    case 'active':
    case 'success':
      variantClass = 'badge-success'
      break

    case 'scheduled':
    case 'partially_paid':
    case 'warning':
    case 'in_progress':
      variantClass = 'badge-warning'
      break

    case 'closed':
    case 'cancelled':
    case 'registration_closed':
    case 'unpaid':
    case 'revoked':
    case 'danger':
    case 'voided':
      variantClass = 'badge-danger'
      break

    case 'draft':
    case 'waived':
    case 'info':
    case 'waitlisted':
      variantClass = 'badge-info'
      break

    default:
      variantClass = 'badge-neutral'
  }

  const formattedLabel = displayLabel.replace(/_/g, ' ')

  return (
    <span className={`badge ${variantClass}`}>
      {formattedLabel}
    </span>
  )
}
