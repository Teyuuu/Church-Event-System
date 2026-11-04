import React, { useRef } from 'react'

/**
 * Accessible segmented control / tab list.
 * Arrow keys move between options (roving tabindex).
 * @param {{
 *   options: Array<{ value: string, label: React.ReactNode, icon?: React.ComponentType<any> }>,
 *   value: string,
 *   onChange: (value: string) => void,
 *   label: string,
 *   fullWidth?: boolean
 * }} props
 */
export function Tabs({ options, value, onChange, label, fullWidth = false }) {
  const refs = useRef([])

  const handleKeyDown = (e, idx) => {
    let next = null
    if (e.key === 'ArrowRight') next = (idx + 1) % options.length
    if (e.key === 'ArrowLeft') next = (idx - 1 + options.length) % options.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = options.length - 1
    if (next !== null) {
      e.preventDefault()
      onChange(options[next].value)
      refs.current[next]?.focus()
    }
  }

  return (
    <div role="tablist" aria-label={label} className={`segmented ${fullWidth ? 'segmented-full' : ''}`}>
      {options.map((opt, idx) => {
        const selected = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            ref={el => { refs.current[idx] = el }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="segmented-btn"
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {Icon && <Icon size={17} aria-hidden="true" />}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
