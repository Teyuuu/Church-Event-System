import React from 'react'

export function LoadingState({ message = 'Loading records...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p style={{ fontSize: '0.925rem', fontWeight: 500 }}>{message}</p>
    </div>
  )
}
