import React from 'react'
import { FolderOpen } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({
  title = 'No records found',
  description = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  icon: Icon = FolderOpen
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3.5rem 1.5rem',
      textAlign: 'center',
      background: 'var(--color-bg-surface)',
      border: '1px dashed var(--color-border)',
      borderRadius: 'var(--radius-md)',
      margin: '1rem 0'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'var(--color-brand-gold-50)',
        color: 'var(--color-brand-gold-600)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', color: 'var(--color-brand-navy-900)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '400px', marginBottom: actionLabel ? '1.25rem' : 0 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="gold" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
