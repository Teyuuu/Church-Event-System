import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'

const ConfirmContext = createContext(null)

/**
 * Promise-based confirmation dialog replacing window.confirm().
 *
 * const confirm = useConfirm()
 * const ok = await confirm({ title, message, confirmLabel, variant: 'danger' })
 *
 * With an input (e.g. a waiver reason):
 * const reason = await confirm({ title, message, input: { label: 'Reason', required: true } })
 * // -> string when confirmed, null when cancelled
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setInputValue(options?.input?.defaultValue || '')
      setState({
        title: 'Are you sure?',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        variant: 'primary',
        ...options
      })
    })
  }, [])

  const close = (result) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setState(null)
  }

  const handleConfirm = (e) => {
    e?.preventDefault()
    if (state?.input) {
      if (state.input.required && !inputValue.trim()) return
      close(inputValue.trim())
    } else {
      close(true)
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={Boolean(state)}
        onClose={() => close(state?.input ? null : false)}
        title={state?.title}
        maxWidth="460px"
        role="alertdialog"
      >
        {state && (
          <form onSubmit={handleConfirm}>
            {state.message && (
              <p style={{ color: 'var(--color-text-main)', fontSize: '0.95rem', marginBottom: state.input ? '1rem' : 0 }}>
                {state.message}
              </p>
            )}
            {state.input && (
              <Input
                label={state.input.label}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={state.input.placeholder}
                required={state.input.required}
                data-autofocus
              />
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => close(state.input ? null : false)}>
                {state.cancelLabel}
              </Button>
              <Button
                type="submit"
                variant={state.variant}
                disabled={Boolean(state.input?.required && !inputValue.trim())}
                data-autofocus={state.input ? undefined : true}
              >
                {state.confirmLabel}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
