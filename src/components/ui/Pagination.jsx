import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

/**
 * Paginate an array client-side.
 */
export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    pageItems: items.slice(start, start + pageSize),
    totalPages,
    page: safePage,
    start: items.length === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, items.length)
  }
}

/**
 * Pagination footer: "Showing 1–25 of 312" + prev/next.
 */
export function Pagination({ page, totalPages, start, end, total, onPageChange, itemLabel = 'records' }) {
  if (total === 0) return null
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong> {itemLabel}
      </span>
      {totalPages > 1 && (
        <div className="pagination-controls">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </Button>
          <span style={{ padding: '0 0.5rem' }}>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </nav>
  )
}
