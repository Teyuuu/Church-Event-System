import React, { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

// Ref-counted body scroll lock so stacked modals don't unlock each other.
let scrollLocks = 0
function lockScroll() {
  scrollLocks += 1
  if (scrollLocks === 1) document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) document.body.style.overflow = ''
}

// Stack of open modals: only the top-most one reacts to Esc / Tab
const modalStack = []

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog.
 * - Focus is trapped inside and restored to the trigger on close
 * - aria-labelledby points at the title
 * - `isDirty`: closing via Esc / backdrop / X asks "Discard changes?" instead of losing data
 * - `closeOnBackdrop`: set false to ignore backdrop clicks entirely
 * - Renders as a full-screen sheet on phones (CSS)
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '600px',
  isDirty = false,
  closeOnBackdrop = true,
  role = 'dialog'
}) {
  const titleId = useId()
  const cardRef = useRef(null)
  const previouslyFocused = useRef(null)
  const onCloseRef = useRef(onClose)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  onCloseRef.current = onClose

  const requestClose = () => {
    if (isDirty) {
      setConfirmingDiscard(true)
      return
    }
    onCloseRef.current?.()
  }
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  useEffect(() => {
    if (!isOpen) return undefined
    setConfirmingDiscard(false)
    previouslyFocused.current = document.activeElement
    lockScroll()
    const stackToken = {}
    modalStack.push(stackToken)

    // Focus first field (or the dialog itself)
    const t = setTimeout(() => {
      const card = cardRef.current
      if (!card) return
      const preferred = card.querySelector('[autofocus], [data-autofocus]')
      const first = preferred || card.querySelector(`.modal-body ${FOCUSABLE}`) || card
      first.focus()
    }, 30)

    function handleKeyDown(e) {
      if (modalStack[modalStack.length - 1] !== stackToken) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        requestCloseRef.current()
        return
      }
      if (e.key === 'Tab' && cardRef.current) {
        const nodes = Array.from(cardRef.current.querySelectorAll(FOCUSABLE))
          .filter(el => el.offsetParent !== null)
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', handleKeyDown)
      const idx = modalStack.indexOf(stackToken)
      if (idx !== -1) modalStack.splice(idx, 1)
      unlockScroll()
      const prev = previouslyFocused.current
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop) requestClose()
      }}
    >
      <div
        ref={cardRef}
        className="modal-card"
        style={{ maxWidth }}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={requestClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {confirmingDiscard && (
          <div className="modal-discard-bar" role="alert">
            <span>Discard your unsaved changes?</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmingDiscard(false)}>
                Keep editing
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setConfirmingDiscard(false)
                  onCloseRef.current?.()
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
