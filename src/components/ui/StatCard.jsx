import React from 'react'

const TONE_COLOR = {
  navy: 'var(--color-brand-navy-900)',
  gold: 'var(--color-brand-gold-600)',
  success: 'var(--color-success)',
  info: 'var(--color-info)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-text-muted)'
}

/**
 * Metric tile.
 * @param {{ title: string, value: React.ReactNode, subtitle?: React.ReactNode, tone?: keyof TONE_COLOR, accent?: string, children?: React.ReactNode }} props
 */
export function StatCard({ title, value, subtitle, tone = 'navy', accent, children }) {
  return (
    <div className="stat-card" style={accent ? { borderLeft: `4px solid ${accent}` } : undefined}>
      <span className="stat-title">{title}</span>
      {value !== undefined && (
        <span className="stat-value" style={{ color: TONE_COLOR[tone] || TONE_COLOR.navy }}>
          {value}
        </span>
      )}
      {children}
      {subtitle && <span className="stat-subtitle">{subtitle}</span>}
    </div>
  )
}
