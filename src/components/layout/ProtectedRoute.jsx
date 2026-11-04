import React from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { LoadingState } from '../ui/LoadingState'
import { ShieldAlert } from 'lucide-react'
import { getHomeRoute } from '../../utils/permissions'

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
      <div className="card" style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem', textAlign: 'center' }} role="alert">
        <div className="empty-state-icon is-error" style={{ margin: '0 auto 1rem' }} aria-hidden="true">
          <ShieldAlert size={30} />
        </div>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Access Restricted</h1>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Your account role (<strong>{role}</strong>) does not have permission to view this section.
          Contact a church administrator if you need access.
        </p>
        <Link to={getHomeRoute(role)} className="btn btn-primary">
          Go to my home page
        </Link>
      </div>
    )
  }

  return children
}
