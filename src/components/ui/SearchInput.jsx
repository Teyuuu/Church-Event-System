import React, { useId } from 'react'
import { Search, X } from 'lucide-react'

/**
 * Search box with icon, accessible label and a clear button.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
  autoFocus = false,
  inputRef,
  onKeyDown,
  style
}) {
  const id = useId()
  return (
    <div className="input-with-icon" style={style}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search size={18} aria-hidden="true" />
      <input
        id={id}
        ref={inputRef}
        type="search"
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        autoComplete="off"
        style={{ paddingRight: value ? '2.5rem' : undefined }}
      />
      {value && (
        <button
          type="button"
          className="input-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
