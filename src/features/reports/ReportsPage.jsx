import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { eventService } from '../events/eventService'
import { reportService } from './reportService'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatDate } from '../../utils/date'
import {
  FileSpreadsheet,
  Download,
  ArrowLeft,
  Users,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  RefreshCw
} from 'lucide-react'

export function ReportsPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [multiDayReport, setMultiDayReport] = useState(null)
  const [financialReport, setFinancialReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadReports = async () => {
    setLoading(true)
    try {
      const [evt, multi, fin] = await Promise.all([
        eventService.getEventById(eventId),
        reportService.getMultiDayReport(eventId),
        reportService.getFinancialReport(eventId)
      ])
      setEvent(evt)
      setMultiDayReport(multi)
      setFinancialReport(fin)
    } catch (err) {
      console.error('Failed to load event reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [eventId])

  if (loading) return <LoadingState message="Compiling church event analytics..." />
  if (!event) return <div>Event not found.</div>

  const handleExportAttendees = () => {
    reportService.exportRegistrationsCsv(eventId)
  }

  return (
    <div>
      {/* Header and Controls */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-brand-navy-800)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Attendance & Financial Reports</h1>
            <p className="text-muted">
              {event.name} — Comprehensive Event Analytics & CSV Exports
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={handleExportAttendees}>
              <Download size={16} />
              <span>Export Attendees CSV</span>
            </Button>
            <Button variant="secondary" onClick={loadReports}>
              <RefreshCw size={16} />
              <span>Refresh Reports</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Critical Multi-Day Attendance Metrics Grid */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-title">Unique Attendees Arrived</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-navy-900)' }}>
            {multiDayReport?.totalUniqueAttendees || 0}
          </span>
          <span className="stat-subtitle">Distinct individuals who attended ≥1 day</span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Total Daily Check-Ins</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-gold-600)' }}>
            {multiDayReport?.totalDailyCheckins || 0}
          </span>
          <span className="stat-subtitle">Cumulative scans across all event days</span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Total Registered</span>
          <span className="stat-value">
            {multiDayReport?.totalRegistrations || 0}
          </span>
          <span className="stat-subtitle">Confirmed event registrants</span>
        </div>

        {event.has_registration_fee && (
          <div className="stat-card">
            <span className="stat-title">Total Verified Collected</span>
            <span className="stat-value" style={{ color: 'var(--color-success)' }}>
              ₱{financialReport?.totalCollected?.toFixed(2) || '0.00'}
            </span>
            <span className="stat-subtitle">Standard fee: ₱{financialReport?.fee?.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Daily Breakdown Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>Daily Attendance Trends Breakdown</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Day #</th>
                <th>Event Date</th>
                <th>Status</th>
                <th>Scheduled Expected</th>
                <th>Confirmed Check-Ins</th>
                <th>Remaining</th>
                <th>Daily Attendance %</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {multiDayReport?.dayBreakdown?.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700 }}>Day {d.day_number}</td>
                  <td>{formatDate(d.date)}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>{d.expected} attendees</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-brand-navy-900)' }}>
                    {d.confirmed}
                  </td>
                  <td>{d.remaining}</td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{d.attendance_percentage}%</span>
                  </td>
                  <td>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => reportService.exportAttendanceCsv(d.id)}
                      disabled={d.confirmed === 0}
                    >
                      <Download size={13} />
                      <span>Export CSV</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Breakdown (If Paid Event) */}
      {event.has_registration_fee && financialReport && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3>Treasury & Collections Breakdown</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{ background: 'var(--color-bg-base)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>CASH AT DESK</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-brand-navy-900)' }}>
                ₱{financialReport.byMethod.cash?.toFixed(2) || '0.00'}
              </div>
            </div>

            <div style={{ background: 'var(--color-bg-base)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>GCASH</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-brand-navy-900)' }}>
                ₱{financialReport.byMethod.gcash?.toFixed(2) || '0.00'}
              </div>
            </div>

            <div style={{ background: 'var(--color-bg-base)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>BANK TRANSFER</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-brand-navy-900)' }}>
                ₱{financialReport.byMethod.bank_transfer?.toFixed(2) || '0.00'}
              </div>
            </div>

            <div style={{ background: 'var(--color-bg-base)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>PASTORAL WAIVERS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-brand-gold-600)' }}>
                {financialReport.statusCounts.waived} Registrants
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
