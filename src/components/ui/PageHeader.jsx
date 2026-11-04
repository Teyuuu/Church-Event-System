import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

/**
 * Breadcrumb trail. The last item is rendered as the current page.
 * @param {{ items: Array<{ label: string, to?: string }> }} props
 */
export function Breadcrumbs({ items = [] }) {
  if (!items.length) return null
  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumbs">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li key={`${item.label}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              {isLast || !item.to ? (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
              {!isLast && <ChevronRight size={14} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Standard page header: breadcrumbs, title, subtitle and action buttons.
 */
export function PageHeader({ title, subtitle, breadcrumbs, actions, as: TitleTag = 'h1' }) {
  return (
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <TitleTag>{title}</TitleTag>
        {subtitle && <p className="text-muted" style={{ fontSize: '0.925rem', marginTop: '0.2rem' }}>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

/**
 * Section heading used inside event pages (below the event header).
 */
export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="section-title">
      <div style={{ minWidth: 0 }}>
        <h2>{title}</h2>
        {subtitle && <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}
