import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { reportService } from './reportService'
import { attendeeService } from '../attendees/attendeeService'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { SectionHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { CLASSIFICATION_OPTIONS } from '../attendees/classifications'
import { formatDate, formatDateTime } from '../../utils/date'
import { Download, RefreshCw, Printer } from 'lucide-react'

const peso = (n) => `₱${Number(n || 0).toFixed(2)}`

function DayChart({ days }) {
  const max = Math.max(1, ...days.map(d => Math.max(d.expected, d.confirmed)))
  return (
    <div>
      <div className="chart-legend" aria-hidden="true">
        <span><span className="legend-swatch" style={{ background: 'var(--color-brand-navy-800)' }} />Checked in</span>
        <span><span className="legend-swatch" style={{ background: 'var(--color-brand-yellow-100)', border: '2px solid var(--color-brand-gold-500)' }} />Expected</span>
      </div>
      <div className="bar-chart" role="list" aria-label="Expected vs checked-in attendees per day">
        {days.map(d => (
          <div key={d.id} role="listitem" aria-label={`Day ${d.day_number}: ${d.confirmed} of ${d.expected} checked in (${d.attendance_percentage}%)`}>
            <div className="bar-row-label">
              <span>Day {d.day_number} · {formatDate(d.date)}</span>
              <span>{d.confirmed} / {d.expected} ({d.attendance_percentage}%)</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill bar-expected" style={{ width: `${(d.expected / max) * 100}%` }} />
              <div className="bar-fill" style={{ width: `${(d.confirmed / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportsPage() {
  const { event } = useOutletContext()
  const eventId = event.id
  const [multiDayReport, setMultiDayReport] = useState(null)
  const [financialReport, setFinancialReport] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [multi, fin, regs] = await Promise.all([
        reportService.getMultiDayReport(eventId),
        reportService.getFinancialReport(eventId),
        attendeeService.getEventRegistrations(eventId).catch(() => [])
      ])
      setMultiDayReport(multi)
      setFinancialReport(fin)
      setRegistrations(regs)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const byClassification = useMemo(() => {
    const counts = {}
    registrations.forEach(r => {
      const c = r.attendee?.classification || 'other'
      counts[c] = (counts[c] || 0) + 1
    })
    const labelOf = (v) => CLASSIFICATION_OPTIONS.find(o => o.value === v)?.label || v
    return Object.entries(counts)
      .map(([key, count]) => ({ key, label: labelOf(key), count }))
      .sort((a, b) => b.count - a.count)
  }, [registrations])

  if (loading) return <LoadingState message="Compiling event reports..." />
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={loadReports} />

  const days = multiDayReport?.dayBreakdown || []
  const total = registrations.length || multiDayReport?.totalRegistrations || 0
  const maxClass = Math.max(1, ...byClassification.map(c => c.count))

  return (
    <div className="report-page">
      <SectionHeader
        title="Attendance & Financial Reports"
        subtitle={`Generated ${formatDateTime(new Date())}`}
        actions={
          <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => reportService.exportRegistrationsCsv(eventId)}>
              <Download size={16} />
              <span>Attendees CSV</span>
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} />
              <span>Print Report</span>
            </Button>
            <Button variant="secondary" onClick={loadReports} aria-label="Refresh reports">
              <RefreshCw size={16} />
            </Button>
          </div>
        }
      />

      <h2 className="print-only" style={{ marginBottom: '1rem' }}>{event.name}</h2>

      <div className="stat-grid">
        <StatCard title="Unique Attendees" value={multiDayReport?.totalUniqueAttendees || 0} subtitle="Attended at least one day" />
        <StatCard title="Total Check-Ins" value={multiDayReport?.totalDailyCheckins || 0} tone="gold" subtitle="All days combined" />
        <StatCard title="Registered" value={multiDayReport?.totalRegistrations || 0} subtitle="Confirmed registrants" />
        {event.has_registration_fee && (
          <StatCard title="Collected" value={peso(financialReport?.totalCollected)} tone="success" subtitle={`Fee: ${peso(financialReport?.fee)}`} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <section className="card" aria-labelledby="chart-heading">
          <div className="card-header">
            <h3 id="chart-heading">Daily Attendance</h3>
          </div>
          {days.length ? <DayChart days={days} /> : <p className="text-muted">No event days.</p>}
        </section>

        <section className="card" aria-labelledby="class-heading">
          <div className="card-header">
            <h3 id="class-heading">Registrations by Classification</h3>
          </div>
          {byClassification.length === 0 ? (
            <p className="text-muted">No registrations yet.</p>
          ) : (
            <div className="bar-chart" role="list">
              {byClassification.map(c => (
                <div key={c.key} role="listitem" aria-label={`${c.label}: ${c.count}`}>
                  <div className="bar-row-label">
                    <span>{c.label}</span>
                    <span>{c.count} ({total ? Math.round((c.count / total) * 100) : 0}%)</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(c.count / maxClass) * 100}%`, background: 'var(--color-brand-gold-500)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card mb-15" aria-labelledby="table-heading">
        <div className="card-header">
          <h3 id="table-heading">Daily Breakdown</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                <th scope="col">Expected</th>
                <th scope="col">Checked In</th>
                <th scope="col">Remaining</th>
                <th scope="col">Rate</th>
                <th scope="col" className="no-print"><span className="sr-only">Export</span></th>
              </tr>
            </thead>
            <tbody>
              {days.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700 }}>Day {d.day_number}</td>
                  <td>{formatDate(d.date)}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>{d.expected}</td>
                  <td style={{ fontWeight: 700 }}>{d.confirmed}</td>
                  <td>{d.remaining}</td>
                  <td style={{ fontWeight: 700 }}>{d.attendance_percentage}%</td>
                  <td className="no-print">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => reportService.exportAttendanceCsv(d.id)}
                      disabled={d.confirmed === 0}
                      aria-label={`Export Day ${d.day_number} attendance CSV`}
                    >
                      <Download size={13} />
                      <span>CSV</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {event.has_registration_fee && financialReport && (
        <section className="card" aria-labelledby="fin-heading">
          <div className="card-header">
            <h3 id="fin-heading">Collections by Method</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '1rem' }}>
            {[
              ['Cash at desk', peso(financialReport.byMethod.cash)],
              ['GCash', peso(financialReport.byMethod.gcash)],
              ['Bank transfer', peso(financialReport.byMethod.bank_transfer)],
              ['Other', peso(financialReport.byMethod.other)],
              ['Fee waivers', `${financialReport.statusCounts.waived} registrants`]
            ].map(([label, value]) => (
              <div key={label} className="fieldset-box" style={{ marginBottom: 0 }}>
                <div className="stat-title">{label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-brand-navy-900)' }}>{value}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
