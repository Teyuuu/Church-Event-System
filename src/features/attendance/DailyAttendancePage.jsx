import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { attendanceService } from './attendanceService'
import { attendeeService } from '../attendees/attendeeService'
import { reportService } from '../reports/reportService'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { SectionHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { SearchInput } from '../../components/ui/SearchInput'
import { Tabs } from '../../components/ui/Tabs'
import { Pagination, paginate } from '../../components/ui/Pagination'
import { usePolling, useNow } from '../../hooks/usePolling'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { formatDate, formatClockTime, pickDefaultDay, timeAgo } from '../../utils/date'
import { Users, Download, RefreshCw, CalendarX } from 'lucide-react'

const PAGE_SIZE = 50

export function DailyAttendancePage() {
  const { event } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useIsMobile()
  const now = useNow(5000)

  const days = event.days || []
  const queryDayId = searchParams.get('dayId')
  const selectedDayId = (queryDayId && days.some(d => d.id === queryDayId))
    ? queryDayId
    : pickDefaultDay(days)?.id || ''

  const [records, setRecords] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState('arrived') // arrived | pending
  const [page, setPage] = useState(1)

  const loadAttendance = useCallback(async ({ silent = false } = {}) => {
    if (!selectedDayId) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [data, regs] = await Promise.all([
        attendanceService.getDailyAttendance(selectedDayId),
        attendeeService.getEventRegistrations(event.id)
      ])
      setRecords(data)
      setRegistrations(regs)
      setLastUpdated(Date.now())
    } catch (err) {
      if (!silent) setError(err)
    } finally {
      setLoading(false)
    }
  }, [selectedDayId, event.id])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  usePolling(() => loadAttendance({ silent: true }), 30000, Boolean(selectedDayId))

  useEffect(() => { setPage(1) }, [searchQuery, view, selectedDayId])

  const currentDay = days.find(d => d.id === selectedDayId)

  // Expected-but-not-arrived list for the selected day
  const pending = useMemo(() => {
    const arrived = new Set(records.map(r => r.registration_id).filter(Boolean))
    return registrations
      .filter(r => {
        const expected = r.selected_day_ids?.length ? r.selected_day_ids.includes(selectedDayId) : true
        return expected && !arrived.has(r.id)
      })
      .map(r => ({
        id: r.id,
        attendee_name: `${r.attendee?.first_name || ''} ${r.attendee?.last_name || ''}`.trim(),
        classification: r.attendee?.classification,
        contact: r.attendee?.contact_number,
        payment_status: r.payment_status
      }))
  }, [registrations, records, selectedDayId])

  const source = view === 'arrived' ? records : pending
  const q = searchQuery.toLowerCase().trim()
  const filtered = source.filter(r =>
    !q ||
    r.attendee_name.toLowerCase().includes(q) ||
    (r.contact && r.contact.includes(q))
  )
  const { pageItems, totalPages, page: safePage, start, end } = paginate(filtered, page, PAGE_SIZE)

  if (days.length === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="This event has no scheduled days"
        description="Event days are generated when an event is created. Ask an administrator to check the event dates."
      />
    )
  }

  const expectedCount = records.length + pending.length
  const pct = expectedCount > 0 ? Math.round((records.length / expectedCount) * 100) : 0

  return (
    <div>
      <SectionHeader
        title="Daily Attendance Log"
        subtitle={currentDay ? `Day ${currentDay.day_number} — ${formatDate(currentDay.event_date)}` : ''}
        actions={
          <>
            {days.length > 1 && (
              <>
                <label htmlFor="attendance-day" className="sr-only">Event day</label>
                <select
                  id="attendance-day"
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={selectedDayId}
                  onChange={(e) => setSearchParams({ dayId: e.target.value }, { replace: true })}
                >
                  {days.map(d => (
                    <option key={d.id} value={d.id}>
                      Day {d.day_number} ({formatDate(d.event_date)})
                    </option>
                  ))}
                </select>
              </>
            )}
            <Button variant="secondary" onClick={() => loadAttendance()} aria-label="Refresh attendance">
              <RefreshCw size={16} />
              <span className="hide-sm">Refresh</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => reportService.exportAttendanceCsv(selectedDayId)}
              disabled={records.length === 0}
            >
              <Download size={16} />
              <span>Export CSV</span>
            </Button>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard title="Arrived" value={records.length} tone="success" subtitle={`${pct}% of expected attendees`} />
        <StatCard title="Not Yet Arrived" value={pending.length} tone="gold" subtitle="Expected for this day" />
        <StatCard title="Day Status">
          <div style={{ marginTop: '0.35rem' }}>
            <StatusBadge status={currentDay?.status || 'scheduled'} />
          </div>
          <span className="stat-subtitle">
            Auto-refreshes every 30s · updated {lastUpdated ? timeAgo(lastUpdated, now) : '—'}
          </span>
        </StatCard>
      </div>

      <div className="card mb-1" style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <Tabs
          label="Attendance view"
          value={view}
          onChange={setView}
          options={[
            { value: 'arrived', label: `Arrived (${records.length})` },
            { value: 'pending', label: `Not yet arrived (${pending.length})` }
          ]}
        />
        <div style={{ flex: '1 1 240px' }}>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name or phone…" label="Search attendance" />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching check-in records..." />
      ) : error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => loadAttendance()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={q ? 'No matches' : view === 'arrived' ? 'No check-ins recorded for this day yet' : 'Everyone expected has arrived'}
          description={q
            ? 'Try a different name or phone number.'
            : view === 'arrived'
              ? 'Attendees who scan their QR pass or are checked in manually will appear here automatically.'
              : 'All attendees expected for this day have checked in.'}
          secondaryLabel={q ? 'Clear search' : undefined}
          onSecondary={q ? () => setSearchQuery('') : undefined}
          icon={Users}
        />
      ) : (
        <div className="card">
          {isMobile ? (
            <div className="card-list">
              {pageItems.map(r => (
                <div key={r.id} className="list-card">
                  <div className="list-card-row">
                    <div>
                      <div className="cell-title">{r.attendee_name}</div>
                      <div className="cell-sub">{r.contact || 'No phone'}</div>
                    </div>
                    {view === 'arrived' && <strong>{formatClockTime(r.checked_in_at)}</strong>}
                  </div>
                  <div className="list-card-meta">
                    <StatusBadge status={r.classification} />
                    {view === 'arrived' && <span className="badge badge-info">{r.check_in_method}</span>}
                    {event.has_registration_fee && <StatusBadge status={r.payment_status} />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Attendee</th>
                    <th scope="col">Classification</th>
                    {view === 'arrived' && <th scope="col">Method</th>}
                    {view === 'arrived' && <th scope="col">Checked-In Time</th>}
                    {event.has_registration_fee && <th scope="col">Payment</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="cell-title">{r.attendee_name}</div>
                        <div className="cell-sub">{r.contact || 'No phone'}</div>
                      </td>
                      <td><StatusBadge status={r.classification} /></td>
                      {view === 'arrived' && (
                        <td><span className="badge badge-info">{r.check_in_method}</span></td>
                      )}
                      {view === 'arrived' && (
                        <td style={{ fontWeight: 600 }}>{formatClockTime(r.checked_in_at)}</td>
                      )}
                      {event.has_registration_fee && <td><StatusBadge status={r.payment_status} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={safePage}
            totalPages={totalPages}
            start={start}
            end={end}
            total={filtered.length}
            onPageChange={setPage}
            itemLabel="attendees"
          />
        </div>
      )}
    </div>
  )
}
