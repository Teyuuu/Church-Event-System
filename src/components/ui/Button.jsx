import React from 'react'

const VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  gold: 'btn-gold',
  danger: 'btn-danger',
  ghost: 'btn-ghost'
}

const SIZE_CLASS = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg'
}

/**
 * Reusable Button Component
 * @param {{
 *   variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost',
 *   size?: 'sm' | 'md' | 'lg',
 *   children: React.ReactNode,
 *   className?: string,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   loadingText?: string,
 *   block?: boolean,
 *   type?: 'button' | 'submit' | 'reset',
 *   onClick?: (e: React.MouseEvent) => void,
 * }} props
 */
export const Button = React.forwardRef(function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  loading = false,
  loadingText = 'Saving…',
  block = false,
  type = 'button',
  onClick,
  ...rest
}, ref) {
  const classes = [
    'btn',
    VARIANT_CLASS[variant] || 'btn-primary',
    SIZE_CLASS[size] || '',
    block ? 'btn-block' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : children}
    </button>
  )
})
