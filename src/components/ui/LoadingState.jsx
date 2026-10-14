import React from 'react'

export function LoadingState({ message = 'Loading records...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem',
      color: 'var(--color-text-muted)'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-brand-navy-900)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '1rem'
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ fontSize: '0.925rem', fontWeight: 500 }}>{message}</p>
    </div>
  )
}
