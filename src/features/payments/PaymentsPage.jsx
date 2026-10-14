import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { eventService } from '../events/eventService'
import { attendeeService } from '../attendees/attendeeService'
import { reportService } from '../reports/reportService'
import { PaymentModal } from './PaymentModal'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatDate, formatDateTime } from '../../utils/date'
import { DollarSign, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export function PaymentsPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [report, setReport] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReg, setSelectedReg] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [evt, rep, regs] = await Promise.all([
        eventService.getEventById(eventId),
        reportService.getFinancialReport(eventId),
        attendeeService.getEventRegistrations(eventId)
      ])
      setEvent(evt)
      setReport(rep)
      setRegistrations(regs)
    } catch (err) {
      console.error('Failed to load financial data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [eventId])

  if (loading) return <LoadingState message="Loading treasury collections..." />
  if (!event) return <div>Event not found.</div>

  const fee = event.registration_fee || 0
  const totalExpected = registrations.length * fee

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-brand-navy-800)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Registration Fees & Payments</h1>
            <p className="text-muted">
              {event.name} — Fee: ₱{fee.toFixed(2)} / attendee
            </p>
          </div>
          <Button variant="secondary" onClick={loadData}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Financial Stats Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-title">Total Verified Collected</span>
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
            ₱{report?.totalCollected?.toFixed(2) || '0.00'}
          </span>
          <span className="stat-subtitle">Confirmed cash, GCash & transfers</span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Potential Total Expected</span>
          <span className="stat-value">₱{totalExpected.toFixed(2)}</span>
          <span className="stat-subtitle">{registrations.length} registrations × ₱{fee.toFixed(2)}</span>
        </div>

        <div className="stat-card">
          <span className="stat-title">Paid Status Breakdown</span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-success">{report?.statusCounts?.paid || 0} Paid</span>
            <span className="badge badge-warning">{report?.statusCounts?.partially_paid || 0} Partial</span>
            <span className="badge badge-danger">{report?.statusCounts?.unpaid || 0} Unpaid</span>
            <span className="badge badge-info">{report?.statusCounts?.waived || 0} Waived</span>
          </div>
        </div>
      </div>

      {/* Payment Collections Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>Attendee Payment Directory</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Classification</th>
                <th>Payment Status</th>
                <th>Registration Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-brand-navy-900)' }}>
                    {r.attendee?.first_name} {r.attendee?.last_name}
                  </td>
                  <td>
                    <StatusBadge status={r.attendee?.classification} />
                  </td>
                  <td>
                    <StatusBadge status={r.payment_status} />
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {formatDate(r.registered_at)}
                  </td>
                  <td>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => setSelectedReg(r)}
                    >
                      <DollarSign size={14} />
                      <span>Record Payment</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Transactions History</h3>
        </div>
        {report?.recentPayments?.length === 0 ? (
          <p className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>
            No payment transactions recorded yet.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference / Receipt</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {report?.recentPayments?.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.attendee_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                      ₱{parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>
                        {p.method}
                      </span>
                    </td>
                    <td>{p.reference}</td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDateTime(p.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedReg && (
        <PaymentModal
          isOpen={Boolean(selectedReg)}
          onClose={() => setSelectedReg(null)}
          registration={selectedReg}
          event={event}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  )
}
