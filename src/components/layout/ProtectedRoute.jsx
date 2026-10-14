import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { LoadingState } from '../ui/LoadingState'
import { ShieldAlert } from 'lucide-react'
import { Button } from '../ui/Button'

export function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState message="Authenticating session..." />
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div style={{
        maxWidth: '500px',
        margin: '4rem auto',
        padding: '2rem',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        textAlign: 'center',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Access Restricted</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Your current account role (<strong>{role}</strong>) does not have permission to view this section.
        </p>
        <Button variant="primary" onClick={() => window.history.back()}>
          Return to Previous Page
        </Button>
      </div>
    )
  }

  return children
}
