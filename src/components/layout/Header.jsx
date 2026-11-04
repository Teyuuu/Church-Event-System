import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { ActionMenu } from '../ui/ActionMenu'
import { Menu, LogOut } from 'lucide-react'
import { getHomeRoute } from '../../utils/permissions'

export function Header({ onToggleSidebar, sidebarOpen }) {
  const { profile, role, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initial = profile?.full_name?.trim()?.charAt(0)?.toUpperCase() || 'U'

  return (
    <header className="app-header no-print on-dark">
      <div className="app-header-inner">
        {/* Left: Hamburger & Logo Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <button
            type="button"
            className="header-icon-btn menu-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
          >
            <Menu size={24} />
          </button>

          <Link to={getHomeRoute(role)} className="header-brand">
            <img src="/assets/church-logo.png" alt="" />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span className="header-title">
                <span className="hide-sm">Berean Bible Baptist Church</span>
                <span className="show-sm-only">Berean Check-In</span>
              </span>
              <span className="header-subtitle hide-sm">Event Check-In System</span>
            </div>
          </Link>
        </div>

        {/* Right: User menu */}
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="header-user-btn hide-sm" aria-label={`Signed in as ${profile.full_name}, ${role}`} style={{ cursor: 'default' }}>
              <span className="avatar" aria-hidden="true">{initial}</span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ fontWeight: 700 }}>{profile.full_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-brand-yellow-500)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  {role}
                </span>
              </span>
            </div>

            <button
              type="button"
              className="header-user-btn hide-sm"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>

            {/* Mobile: avatar menu */}
            <div className="show-sm-only header-mobile-menu">
              <ActionMenu
                label={`Account menu for ${profile.full_name}`}
                items={[
                  { label: `${profile.full_name} (${role})`, onClick: () => {} },
                  { label: 'Sign Out', icon: LogOut, onClick: handleLogout, danger: true }
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
