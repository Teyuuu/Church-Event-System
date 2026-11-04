import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'

/**
 * Accessible "⋮" row action menu.
 * - role="menu" with arrow-key navigation, Esc closes and returns focus
 * - Positioned with `position: fixed` and flipped upward based on available viewport space
 *
 * @param {{
 *   label?: string,
 *   items: Array<{ label: string, icon?: React.ComponentType<any>, onClick?: () => void, to?: string, danger?: boolean, hidden?: boolean }>
 * }} props
 */
export function ActionMenu({ label = 'Actions', items = [] }) {
  const visibleItems = items.filter(i => !i.hidden)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) btnRef.current?.focus()
  }

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !menuRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow < menuRect.height + 12
      ? Math.max(8, rect.top - menuRect.height - 4)
      : rect.bottom + 4
    const left = Math.max(8, Math.min(rect.right - menuRect.width, window.innerWidth - menuRect.width - 8))
    setPos({ top, left })
    menuRef.current.querySelector('[role="menuitem"]')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) close(false)
    }
    const onScroll = () => close(false)
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const onMenuKeyDown = (e) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])
    const idx = nodes.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      nodes[(idx + 1) % nodes.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nodes[(idx - 1 + nodes.length) % nodes.length]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  if (visibleItems.length === 0) return null

  return (
    <div className="action-dropdown">
      <button
        ref={btnRef}
        type="button"
        className={`action-dropdown-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className="action-dropdown-menu"
          style={{ top: pos.top, left: pos.left }}
          onKeyDown={onMenuKeyDown}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon
            const content = (
              <>
                {Icon && <Icon size={16} aria-hidden="true" />}
                <span>{item.label}</span>
              </>
            )
            const className = `action-dropdown-item ${item.danger ? 'danger' : ''}`
            if (item.to) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => close(false)}
                >
                  {content}
                </Link>
              )
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={className}
                onClick={() => {
                  close(false)
                  item.onClick?.()
                }}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
