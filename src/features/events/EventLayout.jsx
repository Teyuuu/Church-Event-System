import React from 'react'
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useEvent } from '../../hooks/useEvent'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Breadcrumbs } from '../../components/ui/PageHeader'
import { formatDate } from '../../utils/date'
import { getEventNavItems, EVENT_SECTION_LABELS } from './eventNav'
import { Calendar, MapPin, CalendarX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Shared shell for every /events/:eventId/* page:
 * breadcrumbs, event summary header and role-filtered section tabs.
 * Child pages receive { event, reloadEvent } via useOutletContext().
 */
export function EventLayout() {
  const { eventId } = useParams()
  const { role } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { event, loading, error, reload } = useEvent(eventId)

  if (loading && !event) return <LoadingState message="Loading event…" />
  if (error && !event) {
    return <ErrorState title="Could not load this event" message={getErrorMessage(error)} onRetry={reload} />
  }
  if (!event) {
    return (
      <EmptyState
        icon={CalendarX}
        title="Event not found"
        description="This event may have been removed, or the link is incorrect."
        actionLabel="Back to Events"
        onAction={() => navigate('/events')}
      />
    )
  }

  const section = location.pathname.split('/')[3] || ''
  const sectionLabel = EVENT_SECTION_LABELS[section]
  const tabs = getEventNavItems(eventId, role, event)

  return (
    <div>
      <div className="event-chrome no-print">
        <Breadcrumbs
          items={[
            { label: 'Events', to: '/events' },
            { label: event.name, to: sectionLabel ? `/events/${eventId}` : undefined },
            ...(sectionLabel ? [{ label: sectionLabel }] : [])
          ]}
        />

        <div className="event-header">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 0.75rem' }}>
            <h1 style={{ fontSize: '1.4rem' }}>{event.name}</h1>
            <StatusBadge status={event.status} />
          </div>
          <div className="event-header-meta">
            <span><Calendar size={15} aria-hidden="true" /> {formatDate(event.start_date)} — {formatDate(event.end_date)}</span>
            {event.venue && <span><MapPin size={15} aria-hidden="true" /> {event.venue}</span>}
            {event.has_registration_fee && <span>Fee: ₱{Number(event.registration_fee || 0).toFixed(2)}</span>}
          </div>

          {tabs.length > 0 && (
            <nav className="event-tabs" aria-label="Event sections">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <NavLink
                    key={tab.key}
                    to={tab.path}
                    className={({ isActive }) => `event-tab ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{tab.tabLabel}</span>
                  </NavLink>
                )
              })}
            </nav>
          )}
        </div>
      </div>

      <Outlet context={{ event, reloadEvent: reload }} />
    </div>
  )
}
