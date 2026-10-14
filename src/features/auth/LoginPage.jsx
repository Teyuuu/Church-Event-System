import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { DEMO_ACCOUNTS } from './authService'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ShieldCheck, UserCheck, Utensils, QrCode } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('admin@berean.org')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login, switchDemoRole } = useAuth()
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

  const handleQuickRole = (role) => {
    switchDemoRole(role)
    navigate(from, { replace: true })
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
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '1px solid #FECACA',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Staff Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. volunteer@berean.org"
              required
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
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Sign In to Staff Portal
            </Button>
          </form>

          {/* Quick volunteer role switcher for testing */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--color-border)' }}>
            <p style={{
              fontSize: '0.775rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}>
              Instant Role Demo Login
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickRole('admin')}
                style={{ justifyContent: 'flex-start', fontSize: '0.8rem' }}
              >
                <ShieldCheck size={16} color="var(--color-brand-navy-900)" />
                Admin
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickRole('registrar')}
                style={{ justifyContent: 'flex-start', fontSize: '0.8rem' }}
              >
                <UserCheck size={16} color="var(--color-brand-gold-500)" />
                Registrar
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickRole('usher')}
                style={{ justifyContent: 'flex-start', fontSize: '0.8rem' }}
              >
                <QrCode size={16} color="var(--color-info)" />
                Usher / Scanner
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickRole('kitchen')}
                style={{ justifyContent: 'flex-start', fontSize: '0.8rem' }}
              >
                <Utensils size={16} color="var(--color-success)" />
                Kitchen Team
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
