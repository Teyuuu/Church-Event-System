import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { eventService } from './eventService'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { EventFormModal } from './EventFormModal'
import { formatDate, getDaysCount } from '../../utils/date'
import {
  Calendar,
  Plus,
  Users,
  QrCode,
  ScanLine,
  UtensilsCrossed,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react'

export function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filter, setFilter] = useState('all')

  const { isAdmin, isRegistrar, isUsher, isKitchen } = useAuth()

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await eventService.getEvents()
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true
    if (filter === 'open') return e.status === 'registration_open' || e.status === 'in_progress'
    if (filter === 'completed') return e.status === 'completed' || e.status === 'archived'
    return true
  })

  return (
    <div>
      {/* Top Banner / Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h1>Church Events</h1>
          <p className="text-muted" style={{ fontSize: '0.925rem' }}>
            Manage conferences, retreats, camps, and daily attendance records
          </p>
        </div>

        {isAdmin && (
          <Button variant="gold" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Create New Event</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'all', label: 'All Events' },
          { key: 'open', label: 'Active / Open' },
          { key: 'completed', label: 'Completed' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              background: filter === tab.key ? 'var(--color-brand-navy-900)' : '#FFFFFF',
              color: filter === tab.key ? '#FFFFFF' : 'var(--color-brand-navy-900)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event Cards Grid */}
      {loading ? (
        <LoadingState message="Fetching events directory..." />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No events found"
          description="Create your first church event to begin managing registrations and check-ins."
          actionLabel={isAdmin ? 'Create Event' : null}
          onAction={() => setIsModalOpen(true)}
          icon={Calendar}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredEvents.map(evt => {
            const daysCount = getDaysCount(evt.start_date, evt.end_date)
            return (
              <div key={evt.id} className="card" style={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: '3px solid var(--color-brand-yellow-500)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <StatusBadge status={evt.status} />
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-brand-navy-900)',
                    background: 'var(--color-brand-yellow-100)',
                    border: '1px solid #FACC15',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                  {evt.name}
                </h3>

                {evt.description && (
                  <p style={{
                    color: 'var(--color-text-muted)',
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
                  fontSize: '0.825rem',
                  color: 'var(--color-text-main)',
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={15} color="var(--color-brand-gold-500)" />
                    <span>{formatDate(evt.start_date)} — {formatDate(evt.end_date)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={15} color="var(--color-brand-navy-700)" />
                    <span>{evt.venue}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={15} color="var(--color-text-muted)" />
                    <span>
                      {evt.has_registration_fee 
                        ? `Fee: ₱${evt.registration_fee?.toFixed(2)} ${evt.require_payment_before_checkin ? '(Payment Required)' : ''}`
                        : 'Free Registration'}
                    </span>
                  </div>
                </div>

                {/* Quick Action Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: '0.35rem',
                  marginTop: '1.25rem'
                }}>
                  {(isAdmin || isRegistrar) && (
                    <Link to={`/events/${evt.id}/attendees`} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.2rem', fontSize: '0.75rem' }}>
                      <Users size={14} />
                      <span>Register</span>
                    </Link>
                  )}

                  {(isAdmin || isRegistrar) && (
                    <Link to={`/events/${evt.id}/print`} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.2rem', fontSize: '0.75rem' }}>
                      <QrCode size={14} />
                      <span>Print</span>
                    </Link>
                  )}

                  {(isAdmin || isUsher) && (
                    <Link to={`/events/${evt.id}/scan`} className="btn btn-primary btn-sm" style={{ padding: '0.4rem 0.2rem', fontSize: '0.75rem' }}>
                      <ScanLine size={14} />
                      <span>Scan</span>
                    </Link>
                  )}

                  {(isAdmin || isKitchen) && (
                    <Link to={`/kitchen/${evt.id}`} className="btn btn-gold btn-sm" style={{ padding: '0.4rem 0.2rem', fontSize: '0.75rem' }}>
                      <UtensilsCrossed size={14} />
                      <span>Kitchen</span>
                    </Link>
                  )}
                </div>

                <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                  <Link
                    to={`/events/${evt.id}/days`}
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-brand-navy-800)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>Manage Daily Schedule & Eligibility</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(newEvent) => {
          setEvents(prev => [newEvent, ...prev])
        }}
      />
    </div>
  )
}
