import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { getHomeRoute } from '../../utils/permissions'

export function NotFoundPage() {
  const { role } = useAuth()
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <p style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-brand-navy-900)' }}>404</p>
      <h1 style={{ fontSize: '1.5rem' }}>Page Not Found</h1>
      <p className="text-muted" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        The requested page does not exist or has been moved.
      </p>
      <Link to={getHomeRoute(role)} className="btn btn-primary">
        Go to my home page
      </Link>
    </div>
  )
}
