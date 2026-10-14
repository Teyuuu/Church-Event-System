import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { eventService } from '../events/eventService'
import { attendanceService } from './attendanceService'
import { reportService } from '../reports/reportService'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDate, formatTime } from '../../utils/date'
import { Users, Download, ArrowLeft, CheckCircle2, QrCode, Search } from 'lucide-react'

export function DailyAttendancePage() {
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const queryDayId = searchParams.get('dayId')

  const [event, setEvent] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadEvent() {
      try {
        const evt = await eventService.getEventById(eventId)
        setEvent(evt)
        const initialDayId = queryDayId || evt.days?.find(d => d.status === 'open')?.id || evt.days?.[0]?.id
        if (initialDayId) setSelectedDayId(initialDayId)
      } catch (err) {
        console.error('Failed to load event:', err)
      }
    }
    loadEvent()
  }, [eventId, queryDayId])

  useEffect(() => {
    async function loadAttendance() {
      if (!selectedDayId) return
      setLoading(true)
      try {
        const data = await attendanceService.getDailyAttendance(selectedDayId)
        setRecords(data)
      } catch (err) {
        console.error('Failed to load daily attendance:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAttendance()
  }, [selectedDayId])

  const handleExportCsv = () => {
    if (selectedDayId) {
      reportService.exportAttendanceCsv(selectedDayId)
    }
  }

  const currentDay = event?.days?.find(d => d.id === selectedDayId)

  const filteredRecords = records.filter(r =>
    r.attendee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.contact && r.contact.includes(searchQuery))
  )

  if (!event) return <LoadingState message="Loading event records..." />

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to={`/events/${eventId}/days`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-brand-navy-800)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Event Days</span>
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h1>Daily Attendance Log</h1>
            <p className="text-muted">
              {event.name} — Day {currentDay?.day_number || 1} ({formatDate(currentDay?.event_date)})
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {event.days?.length > 1 && (
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={selectedDayId}
                onChange={(e) => setSelectedDayId(e.target.value)}
              >
                {event.days.map(d => (
                  <option key={d.id} value={d.id}>
                    Day {d.day_number} ({formatDate(d.event_date)})
                  </option>
                ))}
              </select>
            )}

            <Button variant="secondary" onClick={handleExportCsv} disabled={records.length === 0}>
              <Download size={16} />
              <span>Export Day CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-title">Confirmed Check-Ins</span>
          <span className="stat-value">{records.length}</span>
          <span className="stat-subtitle">Attendees arrived today</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Day Status</span>
          <div style={{ marginTop: '0.25rem' }}>
            <StatusBadge status={currentDay?.status || 'scheduled'} />
          </div>
          <span className="stat-subtitle">Check-in access state</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search checked-in attendees..."
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Records Table */}
      {loading ? (
        <LoadingState message="Fetching check-in timestamps..." />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="No check-ins recorded for this day yet"
          description="Attendees who scan their QR credential or are manually checked in will appear here immediately."
          icon={Users}
        />
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Classification</th>
                  <th>Method</th>
                  <th>Checked-In Time</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-brand-navy-900)' }}>
                        {r.attendee_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {r.contact || 'No phone'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={r.classification} />
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                        {r.check_in_method}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {formatTime(new Date(r.checked_in_at).toTimeString().split(' ')[0])}
                    </td>
                    <td>
                      <StatusBadge status={r.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
