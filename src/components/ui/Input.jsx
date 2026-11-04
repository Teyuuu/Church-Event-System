import React, { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Reusable Form Input Component
 * - Unique, stable ids via useId (no duplicate ids across modals)
 * - Error/helper text linked with aria-describedby
 * - type="password" gets a show/hide toggle
 */
export const Input = React.forwardRef(function Input({
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
}, ref) {
  const autoId = useId()
  const inputId = id || `input-${autoId}`
  const describedById = error || helperText ? `${inputId}-desc` : undefined
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  const input = (
    <input
      ref={ref}
      id={inputId}
      type={isPassword && showPassword ? 'text' : type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="form-control"
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedById}
      {...rest}
    />
  )

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span className="required-mark" aria-hidden="true">*</span>}
        </label>
      )}
      {isPassword ? (
        <div className="password-field">
          {input}
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      ) : input}
      {error && <p id={describedById} className="form-error">{error}</p>}
      {helperText && !error && <p id={describedById} className="form-text">{helperText}</p>}
    </div>
  )
})
