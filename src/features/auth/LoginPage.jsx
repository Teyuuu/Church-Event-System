import React, { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [capsLock, setCapsLock] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login, currentUser, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Without a specific "from" page, go to "/" so HomeRedirect picks the right page for the role
  const from = location.state?.from?.pathname || '/'

  if (!loading && currentUser && !isSubmitting) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.')
      setIsSubmitting(false)
    }
  }

  const handleKey = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'))
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem 1rem',
      backgroundColor: 'var(--color-bg-base)'
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        {/* Church Brand Header */}
        <div className="on-dark" style={{
          backgroundColor: 'var(--color-brand-navy-900)',
          color: '#FFFFFF',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          borderBottom: '3px solid var(--color-brand-yellow-500)'
        }}>
          <img
            src="/assets/church-logo.png"
            alt="Berean Bible Baptist Church logo"
            style={{ width: '88px', height: '88px', objectFit: 'contain', display: 'block', margin: '0 auto 0.75rem auto', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
          />
          <h1 style={{ color: '#FFFFFF', fontSize: '1.35rem', marginBottom: '0.25rem' }}>
            Berean Bible Baptist Church
          </h1>
          <p style={{ color: 'var(--color-brand-yellow-500)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Event Registration & Check-In Portal
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.78rem', marginTop: '0.35rem', fontStyle: 'italic' }}>
            “Called out of darkness into His marvelous light” • I Peter 2:9
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.75rem 1.5rem' }}>
          {error && <Alert variant="error">{error}</Alert>}

          <form onSubmit={handleSubmit} noValidate={false}>
            <Input
              label="Staff Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. staff@berean.org"
              autoComplete="username"
              inputMode="email"
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={handleKey}
              onKeyDown={handleKey}
              autoComplete="current-password"
              required
              helperText={capsLock ? '⚠ Caps Lock is on' : undefined}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={isSubmitting}
              loadingText="Signing in…"
              style={{ marginTop: '0.5rem' }}
            >
              Sign In to Staff Portal
            </Button>
          </form>

          <p className="text-muted" style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
            fontSize: '0.8rem'
          }}>
            Authorized personnel only. Contact the church administrator if you need your account credentials or role updated.
          </p>
        </div>
      </div>
    </main>
  )
}
