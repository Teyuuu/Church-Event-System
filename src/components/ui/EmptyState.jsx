import React from 'react'
import { FolderOpen } from 'lucide-react'
import { Button } from './Button'

/**
 * Empty-state panel with optional primary + secondary actions.
 */
export function EmptyState({
  title = 'No records found',
  description = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  icon: Icon = FolderOpen
}) {
  const hasPrimary = actionLabel && onAction
  const hasSecondary = secondaryLabel && onSecondary
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>{title}</h3>
      <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '420px' }}>
        {description}
      </p>
      {(hasPrimary || hasSecondary) && (
        <div className="empty-state-actions">
          {hasSecondary && (
            <Button variant="secondary" onClick={onSecondary}>{secondaryLabel}</Button>
          )}
          {hasPrimary && (
            <Button variant="gold" onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
    </div>
  )
}
