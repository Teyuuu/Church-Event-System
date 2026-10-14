import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { StatusBadge } from '../ui/StatusBadge'
import { Menu, X, LogOut, Shield, ChevronDown } from 'lucide-react'

export function Header({ onToggleSidebar }) {
  const { profile, role, logout, switchDemoRole } = useAuth()
  const navigate = useNavigate()
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleRoleChange = (newRole) => {
    switchDemoRole(newRole)
    setShowRoleMenu(false)
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

        {/* Right: User Profile & Role Switcher */}
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Role dropdown button */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 222, 0, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.35rem 0.65rem',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem'
                }}
              >
                <span style={{ fontWeight: 600 }}>{profile.full_name}</span>
                <StatusBadge status={role} />
                <ChevronDown size={14} color="var(--color-brand-yellow-500)" />
              </button>
              {/* Role switch dropdown */}
              {showRoleMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--color-border)',
                  width: '180px',
                  zIndex: 100,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    background: 'var(--color-bg-muted)'
                  }}>
                    Switch Role Demo
                  </div>
                  {['admin', 'registrar', 'usher', 'kitchen'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.6rem 0.75rem',
                        border: 'none',
                        background: role === r ? 'var(--color-brand-gold-50)' : 'transparent',
                        color: 'var(--color-brand-navy-900)',
                        fontWeight: role === r ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ textTransform: 'capitalize' }}>{r}</span>
                      {role === r && <span style={{ color: 'var(--color-brand-gold-600)' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.35rem'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
