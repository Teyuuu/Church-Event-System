import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardService } from './dashboardService'
import { eventService } from '../events/eventService'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { StatCard } from '../../components/ui/StatCard'
import { usePolling, useNow } from '../../hooks/usePolling'
import { formatDate, formatClockTime, timeAgo, todayLocal } from '../../utils/date'
import {
  Users,
  CheckCircle2,
  QrCode,
  ScanLine,
  UtensilsCrossed,
  RefreshCw,
  ArrowRight
} from 'lucide-react'

const REFRESH_MS = 60000

export function AdminDashboard() {
  const { profile } = useAuth()
  const now = useNow(5000)
  const [metrics, setMetrics] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadData = useCallback(async (evtId, { silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [allEvents, m] = await Promise.all([
        eventService.getEvents(),
        dashboardService.getAdminMetrics(evtId || null)
      ])
      setEvents(allEvents)
      setMetrics(m)
      setLastUpdated(Date.now())
      return allEvents
    } catch (err) {
      if (!silent) setError(err)
      return null
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // First load: default to the event happening today (else most recent)
  useEffect(() => {
    (async () => {
      const allEvents = await loadData('')
      if (allEvents && allEvents.length > 0) {
        const today = todayLocal()
        const current = allEvents.find(e => e.start_date <= today && e.end_date >= today && e.status !== 'archived') || allEvents[0]
        setSelectedEventId(current.id)
        await loadData(current.id, { silent: true })
      }
      setInitialized(true)
    })()
  }, [loadData])

  usePolling(() => loadData(selectedEventId, { silent: true }), REFRESH_MS, initialized)

  const handleEventFilterChange = (id) => {
    setSelectedEventId(id)
    loadData(id, { silent: true })
  }

  if (loading && !metrics) return <LoadingState message="Loading church dashboard..." />
  if (error && !metrics) return <ErrorState message={getErrorMessage(error)} onRetry={() => loadData(selectedEventId)} />

  const selectedEvent = events.find(e => e.id === selectedEventId)
  const firstName = profile?.full_name?.split(' ')[0] || 'Staff Member'

  return (
    <div>
      {/* Welcome banner */}
      <div className="card on-dark" style={{
        background: 'linear-gradient(135deg, #0A2540 0%, #103B6E 100%)',
        color: '#FFFFFF',
        padding: '1.25rem 1.5rem',
        borderLeft: '5px solid var(--color-brand-yellow-500)',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/assets/church-logo.png" alt="" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ color: '#FFFFFF', fontSize: '1.4rem', marginBottom: '0.15rem' }}>
              Welcome, {firstName}
            </h1>
            <p style={{ color: 'var(--color-brand-yellow-500)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              Berean Bible Baptist Church — Event Portal
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar: event filter + refresh state */}
      <div className="card mb-15" style={{ padding: '0.85rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 260px' }}>
          <label htmlFor="dash-event" className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Showing</label>
          <select
            id="dash-event"
            className="form-select"
            value={selectedEventId}
            onChange={(e) => handleEventFilterChange(e.target.value)}
            style={{ maxWidth: '420px' }}
          >
            <option value="">All events combined</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="live-indicator is-online" title="Refreshes automatically every minute">
            <span className="live-dot" aria-hidden="true" />
            Updated {lastUpdated ? timeAgo(lastUpdated, now) : '—'}
          </span>
          <Button variant="secondary" size="sm" onClick={() => loadData(selectedEventId, { silent: true })} loading={refreshing} loadingText="Refreshing…">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard title="Check-Ins Today" value={metrics?.confirmedToday || 0} subtitle={todayLocal() ? `Arrivals on ${formatDate(todayLocal())}` : ''} />
        <StatCard title="Registrations" value={metrics?.totalRegistrations || 0} tone="gold" subtitle="Confirmed attendees registered" />
        <StatCard title="Collections" value={`₱${Number(metrics?.totalRevenue || 0).toFixed(2)}`} tone="success" subtitle="Verified registration fees" />
        <StatCard title="Events" value={metrics?.totalEvents || 0} subtitle="Conferences & camps" />
      </div>

      {/* Quick operations for the selected event */}
      <div className="card mb-15">
        <div className="card-header">
          <h2 style={{ fontSize: '1.15rem' }}>
            Quick Operations {selectedEvent && <span className="text-muted" style={{ fontWeight: 500, fontSize: '0.95rem' }}>· {selectedEvent.name}</span>}
          </h2>
        </div>
        {selectedEventId ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem' }}>
            <Link to={`/events/${selectedEventId}/scan`} className="btn btn-primary btn-tile">
              <ScanLine size={24} aria-hidden="true" />
              <span>Check-In Scanner</span>
            </Link>
            <Link to={`/events/${selectedEventId}/attendees`} className="btn btn-secondary btn-tile">
              <Users size={24} aria-hidden="true" />
              <span>Register Attendees</span>
            </Link>
            <Link to={`/events/${selectedEventId}/print`} className="btn btn-secondary btn-tile">
              <QrCode size={24} aria-hidden="true" />
              <span>Print QR Badges</span>
            </Link>
            <Link to={`/events/${selectedEventId}/kitchen`} className="btn btn-gold btn-tile">
              <UtensilsCrossed size={24} aria-hidden="true" />
              <span>Kitchen Board</span>
            </Link>
          </div>
        ) : (
          <p className="text-muted" style={{ padding: '0.5rem', textAlign: 'center' }}>
            Choose an event above to show its quick operations.
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
        <section className="card" aria-labelledby="recent-heading">
          <div className="card-header">
            <h2 id="recent-heading" style={{ fontSize: '1.15rem' }}>Recent Check-Ins</h2>
            <span className="cell-sub">Auto-refreshes every minute</span>
          </div>

          {!metrics?.recentCheckins?.length ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              No check-in activity yet.
            </p>
          ) : (
            <ul className="recent-list" style={{ listStyle: 'none' }}>
              {metrics.recentCheckins.map(c => (
                <li key={c.id} className="recent-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <CheckCircle2 size={18} color="var(--color-success)" aria-hidden="true" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="cell-title" style={{ fontSize: '0.9rem' }}>{c.name}</div>
                      <div className="cell-sub">
                        {c.event_name ? `${c.event_name} · ` : ''}Day {c.day_number}
                      </div>
                    </div>
                  </div>
                  <span className="cell-sub" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatClockTime(c.checked_in_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="events-heading">
          <div className="card-header">
            <h2 id="events-heading" style={{ fontSize: '1.15rem' }}>Events</h2>
            <Link to="/events" className="link" style={{ fontSize: '0.85rem' }}>View all</Link>
          </div>

          <ul className="recent-list" style={{ listStyle: 'none' }}>
            {events.slice(0, 4).map(e => (
              <li key={e.id} className="recent-item" style={{ background: '#FFFFFF' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-title" style={{ fontSize: '0.925rem' }}>{e.name}</div>
                  <div className="cell-sub">{formatDate(e.start_date)} — {formatDate(e.end_date)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <StatusBadge status={e.status} />
                  <Link to={`/events/${e.id}`} className="btn btn-secondary btn-sm" aria-label={`Open ${e.name}`}>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
