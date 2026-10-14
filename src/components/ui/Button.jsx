import React from 'react'

/**
 * Reusable Button Component
 * @param {{
 *   variant?: 'primary' | 'secondary' | 'gold' | 'danger',
 *   size?: 'sm' | 'md' | 'lg',
 *   children: React.ReactNode,
 *   className?: string,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   type?: 'button' | 'submit' | 'reset',
 *   onClick?: (e: React.MouseEvent) => void,
 * }} props
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  ...rest
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    gold: 'btn-gold',
    danger: 'btn-danger',
  }[variant] || 'btn-primary'

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  }[size] || ''

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <>
          <span className="spinner-border" style={{
            width: '1rem',
            height: '1rem',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.75s linear infinite'
          }} />
          <span>Processing...</span>
        </>
      ) : children}
    </button>
  )
}
