import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { attendeeService } from './attendeeService'
import { eventService } from '../events/eventService'
import { qrService } from '../qr/qrService'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { RegistrationForm } from './RegistrationForm'
import { FamilyRegistrationModal } from './FamilyRegistrationModal'
import { PaymentModal } from '../payments/PaymentModal'
import { formatDate } from '../../utils/date'
import {
  Users,
  UserPlus,
  Users2,
  Search,
  QrCode,
  Download,
  FileText,
  DollarSign,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink
} from 'lucide-react'

export function AttendeesPage() {
  const { eventId } = useParams()
  const { isRegistrar, isAdmin } = useAuth()

  const [event, setEvent] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

  // Modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false)
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false)
  const [selectedRegForPayment, setSelectedRegForPayment] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [evtData, regsData] = await Promise.all([
        eventService.getEventById(eventId),
        attendeeService.getEventRegistrations(eventId)
      ])
      setEvent(evtData)
      setRegistrations(regsData)
    } catch (err) {
      console.error('Failed to load attendees:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [eventId])

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/register/${eventId}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleDownloadQr = async (reg) => {
    const payload = reg.qr_credential?.payload || await qrService.getCredential(reg.id)
    const name = `${reg.attendee?.first_name}_${reg.attendee?.last_name}`
    qrService.downloadQrImage(payload, `${name}_Berean_QR`)
  }

  const handleDownloadPdf = async (reg) => {
    const payload = reg.qr_credential?.payload || await qrService.getCredential(reg.id)
    const name = `${reg.attendee?.first_name} ${reg.attendee?.last_name}`
    await qrService.downloadQrPdf({
      payload,
      attendeeName: name,
      classification: reg.attendee?.classification || 'attendee',
      eventName: event?.name || 'Berean Event',
      venue: event?.venue || 'Berean Bible Baptist Church',
      eventDates: event ? `${formatDate(event.start_date)} — ${formatDate(event.end_date)}` : '',
      filename: `${reg.attendee?.first_name}_${reg.attendee?.last_name}_Pass`
    })
  }

  // Filtering
  const filtered = registrations.filter(r => {
    const att = r.attendee
    if (!att) return false

    const matchesSearch =
      `${att.first_name} ${att.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (att.email && att.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (att.contact_number && att.contact_number.includes(searchQuery))

    const matchesClass = classFilter === 'all' || att.classification === classFilter
    const matchesPayment = paymentFilter === 'all' || r.payment_status === paymentFilter

    return matchesSearch && matchesClass && matchesPayment
  })

  if (loading) return <LoadingState message="Loading event attendees..." />
  if (!event) return <div>Event not found.</div>

  return (
    <div>
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-brand-navy-800)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h1>{event.name} — Registrations</h1>
            <p className="text-muted">
              {registrations.length} Total Registered Attendees
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={handleCopyPublicLink} title="Copy public self-registration URL">
              {copiedLink ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
              <span>{copiedLink ? 'Link Copied!' : 'Public Registration Link'}</span>
            </Button>

            {isRegistrar && (
              <>
                <Button variant="secondary" onClick={() => setIsFamilyModalOpen(true)}>
                  <Users2 size={16} />
                  <span>Family Batch</span>
                </Button>

                <Button variant="primary" onClick={() => setIsSingleModalOpen(true)}>
                  <UserPlus size={16} />
                  <span>Register Attendee</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, contact, or email..."
              style={{ paddingLeft: '2.5rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">All Classifications</option>
            <option value="member">Church Member</option>
            <option value="visitor">Visitor</option>
            <option value="youth">Youth</option>
            <option value="pastor">Pastor / Minister</option>
            <option value="guest">Guest</option>
          </select>

          {event.has_registration_fee && (
            <select
              className="form-select"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid in Full</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="waived">Waived</option>
            </select>
          )}
        </div>
      </div>

      {/* Attendees Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No registered attendees matching filters"
          description="Try modifying your search query or register new attendees."
          actionLabel={isRegistrar ? 'Register Attendee' : null}
          onAction={() => setIsSingleModalOpen(true)}
          icon={Users}
        />
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Attendee Name</th>
                  <th>Classification</th>
                  <th>Contact Info</th>
                  <th>Source</th>
                  {event.has_registration_fee && <th>Payment</th>}
                  <th>QR Code</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const att = r.attendee
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-brand-navy-900)' }}>
                          {att.last_name}, {att.first_name} {att.middle_name || ''}
                        </div>
                        {att.households?.family_name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-brand-gold-600)', fontWeight: 600 }}>
                            Family: {att.households.family_name}
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={att.classification} />
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{att.contact_number || '—'}</div>
                        {att.email && <div className="text-muted" style={{ fontSize: '0.775rem' }}>{att.email}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                          {r.registration_source.replace('_', ' ')}
                        </span>
                      </td>
                      {event.has_registration_fee && (
                        <td>
                          <StatusBadge status={r.payment_status} />
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleDownloadPdf(r)}
                            title="Download Official High-Resolution PDF Pass"
                            style={{ background: 'var(--color-brand-navy-900)', color: '#fff' }}
                          >
                            <FileText size={14} color="var(--color-brand-yellow-400)" />
                            <span>PDF Pass</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadQr(r)}
                            title="Download PNG Image"
                          >
                            <Download size={14} />
                            <span>PNG</span>
                          </Button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {event.has_registration_fee && isRegistrar && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedRegForPayment(r)}
                              title="Record or view payment"
                            >
                              <DollarSign size={14} color="var(--color-success)" />
                              <span>Pay</span>
                            </Button>
                          )}
                          <Link
                            to={`/events/${eventId}/print?regId=${r.id}`}
                            className="btn btn-secondary btn-sm"
                            title="Print Card"
                          >
                            <QrCode size={14} />
                            <span>Badge</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single / Paper Registration Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Register Attendee (Paper & Staff Entry)"
        maxWidth="650px"
      >
        <RegistrationForm
          eventId={eventId}
          eventDays={event.days || []}
          existingAttendees={registrations.map(r => r.attendee).filter(Boolean)}
          defaultSource="paper"
          onSuccess={() => {
            loadData()
          }}
          onCancel={() => setIsSingleModalOpen(false)}
        />
      </Modal>

      {/* Family Registration Modal */}
      <FamilyRegistrationModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        eventId={eventId}
        onRegistered={() => loadData()}
      />

      {/* Payment Modal */}
      {selectedRegForPayment && (
        <PaymentModal
          isOpen={Boolean(selectedRegForPayment)}
          onClose={() => setSelectedRegForPayment(null)}
          registration={selectedRegForPayment}
          event={event}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  )
}
