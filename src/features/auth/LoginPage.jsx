import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Lock, Mail, ShieldAlert } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: 'var(--color-bg-base)'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Church Brand Header */}
        <div style={{
          backgroundColor: 'var(--color-brand-navy-900)',
          color: '#FFFFFF',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          borderBottom: '3px solid var(--color-brand-yellow-500)'
        }}>
          <img
            src="/assets/church-logo.png"
            alt="Berean Bible Baptist Church Logo"
            style={{
              width: '88px',
              height: '88px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto 0.75rem auto',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
            }}
          />
          <h1 style={{ color: '#FFFFFF', fontSize: '1.35rem', marginBottom: '0.25rem' }}>
            Berean Bible Baptist Church
          </h1>
          <p style={{ color: 'var(--color-brand-yellow-500)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Event Registration & Check-In Portal
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.75rem', marginTop: '0.35rem', fontStyle: 'italic' }}>
            “Called out of darkness into His marvelous light” • I Peter 2:9
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.75rem 1.5rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '1px solid #FECACA',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem'
            }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Staff Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. staff@berean.org"
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              className="btn-lg"
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              Sign In to Staff Portal
            </Button>
          </form>

          <div style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)'
          }}>
            <p>
              Authorized personnel only. Contact the church administrator if you need your account credentials or role updated.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
