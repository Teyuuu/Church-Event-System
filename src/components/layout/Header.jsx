import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { StatusBadge } from '../ui/StatusBadge'
import { Menu, LogOut, User } from 'lucide-react'

export function Header({ onToggleSidebar }) {
  const { profile, role, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="app-header no-print" style={{
      backgroundColor: 'var(--color-brand-navy-900)',
      color: '#FFFFFF',
      borderBottom: '3px solid var(--color-brand-yellow-500)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 4px 12px rgba(10, 37, 64, 0.25)'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left: Hamburger & Logo Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px'
            }}
          >
            <Menu size={24} />
          </button>

          <Link to="/dashboard" style={{
            textDecoration: 'none',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <img
              src="/assets/church-logo.png"
              alt="Berean Bible Baptist Church Logo"
              style={{
                height: '42px',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontWeight: 800,
                fontSize: '1.05rem',
                letterSpacing: '-0.01em',
                lineHeight: 1.15
              }}>
                Berean Bible Baptist Church
              </span>
              <span style={{
                fontSize: '0.725rem',
                color: 'var(--color-brand-yellow-500)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                Event Check-In System
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Logged-in User Profile & Logout */}
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 222, 0, 0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.85rem'
            }}>
              <User size={15} color="var(--color-brand-yellow-500)" />
              <span style={{ fontWeight: 600 }}>{profile.full_name}</span>
              <StatusBadge status={role} />
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.65rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-danger)'
                e.currentTarget.style.borderColor = 'var(--color-danger)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
