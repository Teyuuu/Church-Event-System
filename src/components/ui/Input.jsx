import React from 'react'

/**
 * Reusable Form Input Component
 */
export function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  className = '',
  ...rest
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="form-control"
        style={error ? { borderColor: 'var(--color-danger)' } : {}}
        {...rest}
      />
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{error}</p>}
      {helperText && !error && <p className="form-text">{helperText}</p>}
    </div>
  )
}
