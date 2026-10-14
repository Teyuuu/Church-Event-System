import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import {
  LayoutDashboard,
  Calendar,
  Users,
  QrCode,
  ScanLine,
  CheckCircle2,
  UtensilsCrossed,
  FileSpreadsheet,
  DollarSign,
  X
} from 'lucide-react'

export function Sidebar({ isOpen, onClose }) {
  const { role, isAdmin, isRegistrar, isUsher, isKitchen } = useAuth()
  const location = useLocation()

  // Extract active eventId from URL if currently on an event page
  const match = location.pathname.match(/\/events\/([^/]+)/) || location.pathname.match(/\/kitchen\/([^/]+)/)
  const activeEventId = match ? match[1] : null

  // Navigation Items with role filters
  const navItems = [
    {
      label: 'Overview Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin']
    },
    {
      label: 'Event Directory',
      path: '/events',
      icon: Calendar,
      roles: ['admin', 'registrar', 'usher', 'kitchen']
    },
    ...(activeEventId ? [
      {
        label: 'Attendee Registration',
        path: `/events/${activeEventId}/attendees`,
        icon: Users,
        roles: ['admin', 'registrar']
      },
      {
        label: 'Print QR Cards',
        path: `/events/${activeEventId}/print`,
        icon: QrCode,
        roles: ['admin', 'registrar']
      },
      {
        label: 'Camera Check-In',
        path: `/events/${activeEventId}/scan`,
        icon: ScanLine,
        roles: ['admin', 'usher']
      },
      {
        label: 'Daily Attendance',
        path: `/events/${activeEventId}/attendance`,
        icon: CheckCircle2,
        roles: ['admin', 'registrar', 'usher']
      },
      {
        label: 'Payments & Fees',
        path: `/events/${activeEventId}/payments`,
        icon: DollarSign,
        roles: ['admin', 'registrar']
      },
      {
        label: 'Kitchen Headcount',
        path: `/kitchen/${activeEventId}`,
        icon: UtensilsCrossed,
        roles: ['admin', 'kitchen']
      },
      {
        label: 'Reports & Export',
        path: `/events/${activeEventId}/reports`,
        icon: FileSpreadsheet,
        roles: ['admin']
      }
    ] : [])
  ]

  const visibleItems = navItems.filter(item => item.roles.includes(role || 'usher'))

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 90
          }}
          className="md:hidden"
        />
      )}

      <aside
        className={`app-sidebar no-print ${isOpen ? 'sidebar-open' : ''}`}
        style={{
          width: '260px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: '57px',
          bottom: 0,
          left: 0,
          zIndex: 95,
          transition: 'transform var(--transition-fast)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          overflowY: 'auto'
        }}
      >
        <div style={{
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Navigation
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <nav style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {visibleItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? 'var(--color-brand-navy-900)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--color-brand-navy-900)',
                  borderLeft: isActive ? '4px solid var(--color-brand-yellow-500)' : '4px solid transparent',
                  boxShadow: isActive ? '0 2px 4px rgba(10, 37, 64, 0.15)' : 'none',
                  transition: 'all var(--transition-fast)'
                })}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
