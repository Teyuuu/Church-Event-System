import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { eventService } from './eventService'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { Tabs } from '../../components/ui/Tabs'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { EventFormModal } from './EventFormModal'
import { invalidateEvent } from '../../hooks/useEvent'
import { can } from '../../utils/permissions'
import { formatDate, getDaysCount, todayLocal } from '../../utils/date'
import {
  Calendar,
  Plus,
  Users,
  QrCode,
  ScanLine,
  UtensilsCrossed,
  MapPin,
  Ticket,
  CalendarDays,
  Pencil,
  Archive
} from 'lucide-react'

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Drafts' },
  { value: 'completed', label: 'Past' },
  { value: 'all', label: 'All' }
]

function matchesFilter(e, filter) {
  if (filter === 'all') return true
  if (filter === 'active') return ['registration_open', 'registration_closed', 'in_progress'].includes(e.status)
  if (filter === 'draft') return e.status === 'draft'
  if (filter === 'completed') return e.status === 'completed' || e.status === 'archived'
  return true
}

export function EventsPage() {
  const { role } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalEvent, setModalEvent] = useState(undefined) // undefined = closed, null = create, object = edit
  const [filter, setFilter] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')

  const canManage = can(role, 'manageEvents')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await eventService.getEvents())
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const today = todayLocal()
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return events
      .filter(e => matchesFilter(e, filter))
      .filter(e => !q || `${e.name} ${e.venue || ''} ${e.description || ''}`.toLowerCase().includes(q))
  }, [events, filter, searchQuery])

  const handleArchive = async (evt) => {
    const ok = await confirm({
      title: 'Archive this event?',
      message: `“${evt.name}” will move to Past events and public registration will close. Records are kept.`,
      confirmLabel: 'Archive Event',
      variant: 'danger'
    })
    if (!ok) return
    try {
      await eventService.updateEvent(evt.id, { status: 'archived' })
      invalidateEvent(evt.id)
      toast.success('Event archived')
      loadEvents()
    } catch (err) {
      toast.error(err.message || 'Failed to archive event')
    }
  }

  const quickActions = (evt) => [
    { key: 'attendees', label: 'Attendees', icon: Users, permission: 'attendees', variant: 'secondary' },
    { key: 'print', label: 'Badges', icon: QrCode, permission: 'print', variant: 'secondary' },
    { key: 'scan', label: 'Scan', icon: ScanLine, permission: 'scan', variant: 'primary' },
    { key: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed, permission: 'kitchen', variant: 'gold' }
  ].filter(a => can(role, a.permission)).map(a => ({ ...a, to: `/events/${evt.id}/${a.key}` }))

  return (
    <div>
      <PageHeader
        title="Church Events"
        subtitle="Conferences, retreats, camps and their daily attendance"
        actions={canManage && (
          <Button variant="gold" onClick={() => setModalEvent(null)}>
            <Plus size={18} />
            <span>Create Event</span>
          </Button>
        )}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Tabs label="Filter events" options={FILTERS} value={filter} onChange={setFilter} />
        <div style={{ flex: '1 1 240px', maxWidth: '420px' }}>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search events…" label="Search events" />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching events..." />
      ) : error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={loadEvents} />
      ) : filteredEvents.length === 0 ? (
        events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description={canManage ? 'Create your first church event to start registrations and check-ins.' : 'An administrator has not created any events yet.'}
            actionLabel={canManage ? 'Create Event' : null}
            onAction={() => setModalEvent(null)}
            icon={Calendar}
          />
        ) : (
          <EmptyState
            title="No events match"
            description="Try another filter or search term."
            secondaryLabel="Show all events"
            onSecondary={() => { setFilter('all'); setSearchQuery('') }}
            icon={Calendar}
          />
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
          {filteredEvents.map(evt => {
            const daysCount = getDaysCount(evt.start_date, evt.end_date)
            const isHappeningToday = evt.start_date <= today && evt.end_date >= today && evt.status !== 'archived'
            const actions = quickActions(evt)
            return (
              <article key={evt.id} className="card" style={{ display: 'flex', flexDirection: 'column', borderTop: '3px solid var(--color-brand-yellow-500)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <StatusBadge status={evt.status} />
                    {isHappeningToday && <span className="badge badge-gold">Today</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span className="chip">{daysCount} {daysCount === 1 ? 'Day' : 'Days'}</span>
                    {canManage && (
                      <ActionMenu
                        label={`Manage ${evt.name}`}
                        items={[
                          { label: 'Edit event', icon: Pencil, onClick: () => setModalEvent(evt) },
                          { label: 'Archive', icon: Archive, onClick: () => handleArchive(evt), danger: true, hidden: evt.status === 'archived' }
                        ]}
                      />
                    )}
                  </div>
                </div>

                <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                  <Link to={`/events/${evt.id}`} className="link" style={{ color: 'var(--color-brand-navy-900)' }}>{evt.name}</Link>
                </h2>

                {evt.description && (
                  <p className="text-muted" style={{
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {evt.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={15} color="var(--color-brand-gold-600)" aria-hidden="true" />
                    <span>{formatDate(evt.start_date)} — {formatDate(evt.end_date)}</span>
                  </div>
                  {evt.venue && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={15} color="var(--color-brand-navy-700)" aria-hidden="true" />
                      <span>{evt.venue}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Ticket size={15} color="var(--color-text-muted)" aria-hidden="true" />
                    <span>
                      {evt.has_registration_fee
                        ? `Fee: ₱${Number(evt.registration_fee || 0).toFixed(2)}${evt.require_payment_before_checkin ? ' (pay before check-in)' : ''}`
                        : 'Free registration'}
                    </span>
                  </div>
                </div>

                {actions.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(actions.length, 4)}, 1fr)`, gap: '0.4rem', marginTop: '1.25rem' }}>
                    {actions.map(a => {
                      const Icon = a.icon
                      return (
                        <Link key={a.key} to={a.to} className={`btn btn-${a.variant} btn-sm`} style={{ padding: '0.4rem 0.25rem', fontSize: '0.8rem' }}>
                          <Icon size={14} aria-hidden="true" />
                          <span>{a.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                  <Link to={`/events/${evt.id}/days`} className="link" style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CalendarDays size={14} aria-hidden="true" />
                    <span>Daily schedule</span>
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <EventFormModal
        isOpen={modalEvent !== undefined}
        event={modalEvent || null}
        onClose={() => setModalEvent(undefined)}
        onCreated={(newEvent) => setEvents(prev => [newEvent, ...prev])}
        onSaved={() => loadEvents()}
      />
    </div>
  )
}
