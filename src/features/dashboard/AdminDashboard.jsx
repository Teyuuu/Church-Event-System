import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardService } from './dashboardService'
import { eventService } from '../events/eventService'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatDate, formatTime } from '../../utils/date'
import {
  Calendar,
  Users,
  CheckCircle2,
  DollarSign,
  QrCode,
  ScanLine,
  UtensilsCrossed,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ArrowRight
} from 'lucide-react'

export function AdminDashboard() {
  const { profile } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async (evtId = selectedEventId) => {
    setLoading(true)
    try {
      const [allEvents, m] = await Promise.all([
        eventService.getEvents(),
        dashboardService.getAdminMetrics(evtId || null)
      ])
      setEvents(allEvents)
      setMetrics(m)
      if (!selectedEventId && allEvents.length > 0) {
        setSelectedEventId(allEvents[0].id)
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEventFilterChange = (id) => {
    setSelectedEventId(id)
    loadData(id)
  }

  if (loading && !metrics) return <LoadingState message="Loading church dashboard..." />

  return (
    <div>
      {/* Welcome Banner with Church Logo */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #0A2540 0%, #103B6E 100%)',
        color: '#FFFFFF',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        borderLeft: '5px solid var(--color-brand-yellow-500)',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img
            src="/assets/church-logo.png"
            alt="Berean Bible Baptist Church Logo"
            style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' }}
          />
          <div>
            <h1 style={{ color: '#FFFFFF', fontSize: '1.45rem', marginBottom: '0.15rem' }}>
              Welcome, {profile?.full_name || 'Staff Member'}
            </h1>
            <p style={{ color: 'var(--color-brand-yellow-500)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              Berean Bible Baptist Church — Event Portal
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {events.length > 0 && (
            <select
              className="form-select"
              style={{
                width: 'auto',
                minWidth: '220px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 222, 0, 0.4)',
                fontWeight: 600
              }}
              value={selectedEventId}
              onChange={(e) => handleEventFilterChange(e.target.value)}
            >
              <option value="" style={{ color: '#000000' }}>All Events Combined</option>
              {events.map(e => (
                <option key={e.id} value={e.id} style={{ color: '#000000' }}>{e.name}</option>
              ))}
            </select>
          )}

          <Button variant="gold" size="sm" onClick={() => loadData(selectedEventId)}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-title">Confirmed Check-Ins Today</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-navy-900)' }}>
            {metrics?.confirmedToday || 0}
          </span>
          <span className="stat-subtitle">Attendees arrived on active event days</span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Total Registrations</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-gold-600)' }}>
            {metrics?.totalRegistrations || 0}
          </span>
          <span className="stat-subtitle">Confirmed attendees registered</span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Verified Collections</span>
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
            ₱{metrics?.totalRevenue?.toFixed(2) || '0.00'}
          </span>
          <span className="stat-subtitle">Registration fees received</span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Managed Events</span>
          <span className="stat-value">{metrics?.totalEvents || 0}</span>
          <span className="stat-subtitle">Conferences & camps</span>
        </div>
      </div>

      {/* Quick Action Station */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#FFFFFF' }}>
        <div className="card-header">
          <h3>Quick Volunteer Operations</h3>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {selectedEventId ? (
            <>
              <Link
                to={`/events/${selectedEventId}/scan`}
                className="btn btn-primary"
                style={{ padding: '1rem', flexDirection: 'column', gap: '0.4rem', height: 'auto' }}
              >
                <ScanLine size={24} />
                <span>Camera Check-In Scanner</span>
              </Link>

              <Link
                to={`/events/${selectedEventId}/attendees`}
                className="btn btn-secondary"
                style={{ padding: '1rem', flexDirection: 'column', gap: '0.4rem', height: 'auto' }}
              >
                <Users size={24} color="var(--color-brand-navy-900)" />
                <span>Register Attendee / Paper</span>
              </Link>

              <Link
                to={`/events/${selectedEventId}/print`}
                className="btn btn-secondary"
                style={{ padding: '1rem', flexDirection: 'column', gap: '0.4rem', height: 'auto' }}
              >
                <QrCode size={24} color="var(--color-brand-gold-500)" />
                <span>Print QR Badges & Sheets</span>
              </Link>

              <Link
                to={`/kitchen/${selectedEventId}`}
                className="btn btn-gold"
                style={{ padding: '1rem', flexDirection: 'column', gap: '0.4rem', height: 'auto' }}
              >
                <UtensilsCrossed size={24} />
                <span>Kitchen Headcount Board</span>
              </Link>
            </>
          ) : (
            <p className="text-muted" style={{ padding: '1rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              Select an event above to launch quick operations.
            </p>
          )}
        </div>
      </div>

      {/* Two Column Layout: Recent Check-Ins & Active Events */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Check-Ins Card */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Check-Ins</h3>
            <span className="badge badge-success">Live Activity</span>
          </div>

          {metrics?.recentCheckins?.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              No check-in activity recorded today yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {metrics?.recentCheckins?.map(c => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--color-bg-base)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="var(--color-success)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-brand-navy-900)' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Day {c.day_number}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    {formatTime(new Date(c.checked_in_at).toTimeString().split(' ')[0])}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Church Events Overview */}
        <div className="card">
          <div className="card-header">
            <h3>Church Events Directory</h3>
            <Link to="/events" style={{ fontSize: '0.85rem', color: 'var(--color-brand-navy-800)', fontWeight: 600, textDecoration: 'none' }}>
              View All
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {events.slice(0, 4).map(e => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: '#FFFFFF'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>{e.name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {formatDate(e.start_date)} — {formatDate(e.end_date)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <StatusBadge status={e.status} />
                  <Link to={`/events/${e.id}/attendees`} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.6rem' }}>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
