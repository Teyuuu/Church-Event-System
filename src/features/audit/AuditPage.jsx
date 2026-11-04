import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { auditService } from './auditService'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination, paginate } from '../../components/ui/Pagination'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { formatDateTime, APP_TIMEZONE } from '../../utils/date'
import {
  History,
  Download,
  RefreshCw,
  Shield,
  QrCode,
  DollarSign,
  UserCheck,
  LogIn,
  LogOut,
  Clock,
  CalendarDays
} from 'lucide-react'

const LOAD_LIMIT = 1000
const PAGE_SIZE = 25

function getActionBadge(action = '') {
  if (action.startsWith('ACCOUNT_')) return { label: action.replace('ACCOUNT_', ''), color: '#4338CA', bg: '#EEF2FF', icon: Shield }
  if (action.startsWith('ATTENDEE_') || action.startsWith('FAMILY_')) return { label: action.replace('ATTENDEE_', ''), color: '#0369A1', bg: '#F0F9FF', icon: UserCheck }
  if (action.startsWith('CHECKIN_')) return { label: action.replace('CHECKIN_', ''), color: '#047857', bg: '#ECFDF5', icon: QrCode }
  if (action.startsWith('PAYMENT_')) return { label: action.replace('PAYMENT_', ''), color: '#92400E', bg: '#FFFBEB', icon: DollarSign }
  if (action.startsWith('EVENT_') || action.startsWith('DAY_')) return { label: action, color: '#103B6E', bg: '#E0E7FF', icon: CalendarDays }
  if (action.startsWith('USER_LOGIN')) return { label: 'SIGN IN', color: '#103B6E', bg: '#E0E7FF', icon: LogIn }
  if (action.startsWith('USER_LOGOUT')) return { label: 'SIGN OUT', color: '#475569', bg: '#F1F5F9', icon: LogOut }
  return { label: action, color: '#334155', bg: '#F8FAFC', icon: Clock }
}

function ActionBadge({ action }) {
  const badge = getActionBadge(action)
  const Icon = badge.icon
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.6rem',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem',
      fontWeight: 700,
      backgroundColor: badge.bg,
      color: badge.color,
      border: `1px solid ${badge.color}33`,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap'
    }}>
      <Icon size={12} aria-hidden="true" />
      <span>{badge.label.replace(/_/g, ' ')}</span>
    </span>
  )
}

/** YYYY-MM-DD of a timestamp in the church timezone */
const localDate = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(new Date(iso))

export function AuditPage() {
  const isMobile = useIsMobile()
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Debounce typing so the list doesn't reload on every keystroke (or on blur)
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadAuditLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await auditService.getAuditLogs({ category: categoryFilter, limit: LOAD_LIMIT })
      setAllLogs(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    loadAuditLogs()
  }, [loadAuditLogs])

  const logs = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return allLogs.filter(log => {
      if (q) {
        const hay = `${log.actor_name || ''} ${log.action || ''} ${log.details || ''} ${log.entity_type || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (dateFrom || dateTo) {
        const d = localDate(log.created_at)
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
      }
      return true
    })
  }, [allLogs, searchQuery, dateFrom, dateTo])

  useEffect(() => { setPage(1) }, [searchQuery, categoryFilter, dateFrom, dateTo])

  const { pageItems, totalPages, page: safePage, start, end } = paginate(logs, page, PAGE_SIZE)

  const count = (prefixes) => logs.filter(l => prefixes.some(p => l.action?.startsWith(p))).length
  const hasFilters = Boolean(searchInput || dateFrom || dateTo || categoryFilter !== 'all')
  const clearFilters = () => {
    setSearchInput('')
    setDateFrom('')
    setDateTo('')
    setCategoryFilter('all')
  }

  return (
    <div>
      <PageHeader
        title="Audit Activity Log"
        subtitle="Who did what, and when — registrations, payments, check-ins and account changes"
        actions={
          <>
            <Button variant="secondary" onClick={loadAuditLogs} disabled={loading}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </Button>
            <Button variant="primary" onClick={() => auditService.exportAuditLogsCsv(logs)} disabled={logs.length === 0}>
              <Download size={16} />
              <span>Export CSV ({logs.length})</span>
            </Button>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard title="Matching Activities" value={logs.length} subtitle={allLogs.length >= LOAD_LIMIT ? `Showing the latest ${LOAD_LIMIT} records` : 'In the current filter'} />
        <StatCard title="Check-Ins" value={count(['CHECKIN_'])} tone="success" subtitle="QR & manual" />
        <StatCard title="Attendee Updates" value={count(['ATTENDEE_', 'FAMILY_'])} subtitle="Registrations & edits" />
        <StatCard title="Payments & Accounts" value={count(['PAYMENT_', 'ACCOUNT_'])} tone="gold" subtitle={`${count(['PAYMENT_'])} payments · ${count(['ACCOUNT_'])} account edits`} />
      </div>

      <div className="card mb-15" style={{ padding: '1rem' }}>
        <div className="filter-bar">
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search actor, action or details…" label="Search audit log" />
          <div>
            <label htmlFor="audit-cat" className="sr-only">Category</label>
            <select id="audit-cat" className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              <option value="accounts">Staff accounts</option>
              <option value="attendees">Attendee registrations & edits</option>
              <option value="checkins">Check-ins</option>
              <option value="payments">Payments</option>
              <option value="events">Events & schedule</option>
              <option value="sessions">Sign in / out</option>
            </select>
          </div>
          <div className="date-range">
            <label htmlFor="audit-from" className="sr-only">From date</label>
            <input id="audit-from" type="date" className="form-control" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
            <span className="text-muted" aria-hidden="true">–</span>
            <label htmlFor="audit-to" className="sr-only">To date</label>
            <input id="audit-to" type="date" className="form-control" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching audit trail..." />
      ) : error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={loadAuditLogs} />
      ) : logs.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No activity matches your filters' : 'No activity recorded yet'}
          description={hasFilters ? 'Try widening the date range or clearing the search.' : 'Account edits, registrations, check-ins and payments will appear here.'}
          secondaryLabel={hasFilters ? 'Clear filters' : undefined}
          onSecondary={clearFilters}
          icon={History}
        />
      ) : (
        <div className="card">
          {isMobile ? (
            <div className="card-list">
              {pageItems.map(log => (
                <div key={log.id} className="list-card">
                  <div className="list-card-row">
                    <div className="cell-title" style={{ fontSize: '0.9rem' }}>{log.actor_name}</div>
                    <span className="cell-sub" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', margin: '0.35rem 0' }}>{log.details}</p>
                  <div className="list-card-meta">
                    <ActionBadge action={log.action} />
                    <StatusBadge status={log.actor_role} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '180px' }}>Time</th>
                    <th scope="col">Performed By</th>
                    <th scope="col">Action</th>
                    <th scope="col">Details</th>
                    <th scope="col">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.created_at)}
                      </td>
                      <td>
                        <div className="cell-title" style={{ fontSize: '0.875rem' }}>{log.actor_name}</div>
                        <StatusBadge status={log.actor_role} />
                      </td>
                      <td><ActionBadge action={log.action} /></td>
                      <td style={{ fontSize: '0.875rem' }}>{log.details}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{log.entity_type}</span>
                      </td>
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
            total={logs.length}
            onPageChange={setPage}
            itemLabel="activities"
          />
        </div>
      )}
    </div>
  )
}
