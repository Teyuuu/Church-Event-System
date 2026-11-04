import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { attendeeService } from '../attendees/attendeeService'
import { reportService } from '../reports/reportService'
import { paymentService } from './paymentService'
import { PaymentModal } from './PaymentModal'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { SectionHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination, paginate } from '../../components/ui/Pagination'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { formatDate, formatDateTime } from '../../utils/date'
import { DollarSign, RefreshCw, Eye, Users } from 'lucide-react'

const PAGE_SIZE = 25
const peso = (n) => `₱${Number(n || 0).toFixed(2)}`

export function PaymentsPage() {
  const { event } = useOutletContext()
  const isMobile = useIsMobile()
  const [report, setReport] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [paidTotals, setPaidTotals] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReg, setSelectedReg] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  const fee = event.registration_fee || 0

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [rep, regs] = await Promise.all([
        reportService.getFinancialReport(event.id),
        attendeeService.getEventRegistrations(event.id)
      ])
      const totals = await paymentService.getPaidTotalsByRegistration(regs.map(r => r.id))
      setReport(rep)
      setRegistrations(regs)
      setPaidTotals(totals)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => { setPage(1) }, [searchQuery, statusFilter])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return registrations.filter(r => {
      const name = `${r.attendee?.first_name || ''} ${r.attendee?.last_name || ''}`.toLowerCase()
      const matchesSearch = !q || name.includes(q) || (r.attendee?.contact_number || '').includes(q)
      const matchesStatus = statusFilter === 'all' || r.payment_status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [registrations, searchQuery, statusFilter])

  const { pageItems, totalPages, page: safePage, start, end } = paginate(filtered, page, PAGE_SIZE)

  if (!event.has_registration_fee) {
    return (
      <EmptyState
        icon={DollarSign}
        title="This is a free event"
        description="Payments are only tracked for events with a registration fee. An administrator can enable a fee by editing the event."
      />
    )
  }

  if (loading) return <LoadingState message="Loading treasury collections..." />
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={() => loadData()} />

  const waivedCount = report?.statusCounts?.waived || 0
  const totalExpected = (registrations.length - waivedCount) * fee
  const outstanding = Math.max(0, totalExpected - (report?.totalCollected || 0))

  const rowInfo = (r) => {
    const paid = paidTotals[r.id] || 0
    const balance = r.payment_status === 'waived' ? 0 : Math.max(0, fee - paid)
    const settled = r.payment_status === 'waived' || (r.payment_status === 'paid' && balance <= 0)
    return { paid, balance, settled }
  }

  return (
    <div>
      <SectionHeader
        title="Registration Fees & Payments"
        subtitle={`Fee: ${peso(fee)} per attendee`}
        actions={
          <Button variant="secondary" onClick={() => loadData()}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </Button>
        }
      />

      <div className="stat-grid">
        <StatCard title="Collected" value={peso(report?.totalCollected)} tone="success" subtitle="Cash, GCash & transfers" />
        <StatCard title="Outstanding" value={peso(outstanding)} tone="danger" subtitle={`Expected ${peso(totalExpected)} (excl. waivers)`} />
        <StatCard title="Status Breakdown">
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-success">{report?.statusCounts?.paid || 0} Paid</span>
            <span className="badge badge-warning">{report?.statusCounts?.partially_paid || 0} Partial</span>
            <span className="badge badge-danger">{report?.statusCounts?.unpaid || 0} Unpaid</span>
            <span className="badge badge-info">{waivedCount} Waived</span>
          </div>
        </StatCard>
      </div>

      <div className="card mb-15">
        <div className="card-header">
          <h3>Attendee Payments</h3>
        </div>

        <div className="filter-bar" style={{ marginBottom: '1rem' }}>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search name or phone…" label="Search payments" />
          <div>
            <label htmlFor="pay-status" className="sr-only">Payment status</label>
            <select id="pay-status" className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Payment Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid in Full</option>
              <option value="waived">Waived</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={registrations.length === 0 ? 'No registrations yet' : 'No matches'}
            description={registrations.length === 0 ? 'Payments appear here once attendees register.' : 'Try a different search or status filter.'}
            secondaryLabel={registrations.length > 0 ? 'Clear filters' : undefined}
            onSecondary={() => { setSearchQuery(''); setStatusFilter('all') }}
          />
        ) : isMobile ? (
          <div className="card-list">
            {pageItems.map(r => {
              const { paid, balance, settled } = rowInfo(r)
              return (
                <div key={r.id} className="list-card">
                  <div className="list-card-row">
                    <div>
                      <div className="cell-title">{r.attendee?.first_name} {r.attendee?.last_name}</div>
                      <div className="cell-sub">Paid {peso(paid)} · Balance {peso(balance)}</div>
                    </div>
                    <StatusBadge status={r.payment_status} />
                  </div>
                  <div className="list-card-meta">
                    <Button variant={settled ? 'secondary' : 'gold'} size="sm" onClick={() => setSelectedReg(r)} style={{ marginLeft: 'auto' }}>
                      {settled ? <Eye size={14} /> : <DollarSign size={14} />}
                      <span>{settled ? 'View' : 'Record Payment'}</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Attendee</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Paid</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Balance</th>
                  <th scope="col">Registered</th>
                  <th scope="col"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(r => {
                  const { paid, balance, settled } = rowInfo(r)
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="cell-title">{r.attendee?.first_name} {r.attendee?.last_name}</div>
                        <div className="cell-sub">{r.attendee?.contact_number || '—'}</div>
                      </td>
                      <td><StatusBadge status={r.payment_status} /></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{peso(paid)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: balance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {peso(balance)}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(r.registered_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Button variant={settled ? 'secondary' : 'gold'} size="sm" onClick={() => setSelectedReg(r)}>
                          {settled ? <Eye size={14} /> : <DollarSign size={14} />}
                          <span>{settled ? 'View' : 'Record Payment'}</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
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
          itemLabel="registrations"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Transactions</h3>
        </div>
        {!report?.recentPayments?.length ? (
          <p className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>
            No payment transactions recorded yet.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Attendee</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Method</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Time</th>
                </tr>
              </thead>
              <tbody>
                {report.recentPayments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.attendee_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{peso(p.amount)}</td>
                    <td><span className="badge badge-neutral">{(p.method || '').replace('_', ' ')}</span></td>
                    <td>{p.reference}</td>
                    <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatDateTime(p.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReg && (
        <PaymentModal
          isOpen={Boolean(selectedReg)}
          onClose={() => setSelectedReg(null)}
          registration={selectedReg}
          event={event}
          onSuccess={() => loadData({ silent: true })}
        />
      )}
    </div>
  )
}
