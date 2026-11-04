import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { useEvent } from '../../hooks/useEvent'
import { can } from '../../utils/permissions'
import { getEventNavItems } from '../../features/events/eventNav'
import {
  LayoutDashboard,
  Calendar,
  UserCog,
  History,
  X
} from 'lucide-react'

const GLOBAL_ITEMS = [
  { label: 'Overview Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { label: 'Event Directory', path: '/events', icon: Calendar, permission: 'events', end: true },
  { label: 'Staff Accounts', path: '/admin/accounts', icon: UserCog, permission: 'accounts' },
  { label: 'Audit Activity Log', path: '/admin/audit', icon: History, permission: 'audit' }
]

export function Sidebar({ isOpen, onClose }) {
  const { role } = useAuth()
  const location = useLocation()

  const match = location.pathname.match(/^\/events\/([^/]+)/)
  const activeEventId = match ? match[1] : null
  const { event } = useEvent(activeEventId)

  const globalItems = GLOBAL_ITEMS.filter(item => can(role, item.permission))
  const eventItems = activeEventId ? getEventNavItems(activeEventId, role, event) : []

  const renderLink = (item) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.end}
        onClick={onClose}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}

      <aside
        id="app-sidebar"
        className={`app-sidebar no-print ${isOpen ? 'sidebar-open' : ''}`}
        aria-label="Main navigation"
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.25rem 0.5rem 0' }}>
          <button
            type="button"
            className="modal-close sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Primary" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingBottom: '0.5rem' }}>
          <div className="sidebar-section-label">Navigation</div>
          {globalItems.map(renderLink)}
        </nav>

        {eventItems.length > 0 && (
          <nav aria-label="Current event" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingBottom: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <div className="sidebar-section-label">Current Event</div>
            <div className="sidebar-event-name">{event?.name || 'Loading event…'}</div>
            {eventItems.map(renderLink)}
          </nav>
        )}
      </aside>
    </>
  )
}
