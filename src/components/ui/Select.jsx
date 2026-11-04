import React, { useId } from 'react'

/**
 * Labelled select with proper htmlFor/id association.
 * @param {{ label?: string, options: Array<{value:string,label:string}>, helperText?: string }} props
 */
export function Select({
  label,
  id,
  options = [],
  helperText,
  required = false,
  className = '',
  children,
  ...rest
}) {
  const autoId = useId()
  const selectId = id || `select-${autoId}`
  const descId = helperText ? `${selectId}-desc` : undefined

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {required && <span className="required-mark" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className="form-select"
        required={required}
        aria-describedby={descId}
        {...rest}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {children}
      </select>
      {helperText && <p id={descId} className="form-text">{helperText}</p>}
    </div>
  )
}
