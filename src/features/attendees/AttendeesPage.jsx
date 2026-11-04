import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { attendeeService } from './attendeeService'
import { attendanceService } from '../attendance/attendanceService'
import { qrService } from '../qr/qrService'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { SectionHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { Pagination, paginate } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'
import { RegistrationForm } from './RegistrationForm'
import { FamilyRegistrationModal } from './FamilyRegistrationModal'
import { EditAttendeeModal } from './EditAttendeeModal'
import { PaymentModal } from '../payments/PaymentModal'
import { CLASSIFICATION_OPTIONS } from './classifications'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { can } from '../../utils/permissions'
import { formatDate, formatClockTime, todayLocal } from '../../utils/date'
import {
  Users,
  UserPlus,
  Users2,
  QrCode,
  Download,
  FileText,
  DollarSign,
  Copy,
  Check,
  Pencil,
  CheckCircle2
} from 'lucide-react'

const PAGE_SIZE = 25

export function AttendeesPage() {
  const { event } = useOutletContext()
  const eventId = event.id
  const { role } = useAuth()
  const toast = useToast()
  const isMobile = useIsMobile()

  const canRegister = can(role, 'register')
  const canPrint = can(role, 'print')
  const canPay = can(role, 'payments') && event.has_registration_fee

  const todayDay = (event.days || []).find(d => d.event_date === todayLocal())

  const [registrations, setRegistrations] = useState([])
  const [checkedInToday, setCheckedInToday] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [arrivalFilter, setArrivalFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false)
  const [singleFormDirty, setSingleFormDirty] = useState(false)
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false)
  const [selectedRegForEdit, setSelectedRegForEdit] = useState(null)
  const [selectedRegForPayment, setSelectedRegForPayment] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [linkFallbackOpen, setLinkFallbackOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  const publicUrl = `${window.location.origin}/register/${eventId}`

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [regsData, todayRecords] = await Promise.all([
        attendeeService.getEventRegistrations(eventId),
        todayDay ? attendanceService.getDailyAttendance(todayDay.id).catch(() => []) : Promise.resolve([])
      ])
      setRegistrations(regsData)
      const map = new Map()
      todayRecords.forEach(r => { if (r.registration_id) map.set(r.registration_id, r.checked_in_at) })
      setCheckedInToday(map)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [eventId, todayDay?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => { setPage(1) }, [searchQuery, classFilter, paymentFilter, arrivalFilter])

  const handleCopyPublicLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(publicUrl)
      setCopiedLink(true)
      toast.success('Public registration link copied')
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      setLinkFallbackOpen(true)
    }
  }

  const handleDownloadQr = async (reg) => {
    try {
      const payload = reg.qr_credential?.payload || await qrService.getCredential(reg.id)
      const name = `${reg.attendee?.first_name}_${reg.attendee?.last_name}`
      await qrService.downloadQrImage(payload, `${name}_Berean_QR`)
    } catch (err) {
      toast.error(err.message || 'Could not download QR image')
    }
  }

  const handleDownloadPdf = async (reg) => {
    setDownloadingId(reg.id)
    try {
      const payload = reg.qr_credential?.payload || await qrService.getCredential(reg.id)
      await qrService.downloadQrPdf({
        payload,
        attendeeName: `${reg.attendee?.first_name} ${reg.attendee?.last_name}`,
        classification: reg.attendee?.classification || 'attendee',
        eventName: event.name,
        venue: event.venue || 'Berean Bible Baptist Church',
        eventDates: `${formatDate(event.start_date)} — ${formatDate(event.end_date)}`,
        filename: `${reg.attendee?.first_name}_${reg.attendee?.last_name}_Pass`
      })
    } catch (err) {
      toast.error(err.message || 'Could not generate PDF pass')
    } finally {
      setDownloadingId(null)
    }
  }

  const hasActiveFilters = Boolean(searchQuery) || classFilter !== 'all' || paymentFilter !== 'all' || arrivalFilter !== 'all'
  const clearFilters = () => {
    setSearchQuery('')
    setClassFilter('all')
    setPaymentFilter('all')
    setArrivalFilter('all')
  }

  const filtered = useMemo(() => {
    const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
    return registrations.filter(r => {
      const att = r.attendee
      if (!att) return false
      const haystack = `${att.first_name} ${att.middle_name || ''} ${att.last_name} ${att.email || ''} ${att.contact_number || ''} ${att.households?.family_name || ''}`.toLowerCase()
      const matchesSearch = tokens.every(t => haystack.includes(t))
      const matchesClass = classFilter === 'all' || att.classification === classFilter
      const matchesPayment = paymentFilter === 'all' || r.payment_status === paymentFilter
      const arrived = checkedInToday.has(r.id)
      const matchesArrival = arrivalFilter === 'all' || (arrivalFilter === 'arrived' ? arrived : !arrived)
      return matchesSearch && matchesClass && matchesPayment && matchesArrival
    })
  }, [registrations, searchQuery, classFilter, paymentFilter, arrivalFilter, checkedInToday])

  const { pageItems, totalPages, page: safePage, start, end } = paginate(filtered, page, PAGE_SIZE)

  const menuItemsFor = (r) => [
    { label: 'Edit details', icon: Pencil, onClick: () => setSelectedRegForEdit(r), hidden: !canRegister },
    { label: 'Record payment', icon: DollarSign, onClick: () => setSelectedRegForPayment(r), hidden: !canPay },
    { label: 'Download PNG', icon: Download, onClick: () => handleDownloadQr(r) },
    { label: 'Print badge', icon: QrCode, to: `/events/${eventId}/print?regId=${r.id}`, hidden: !canPrint }
  ]

  const renderArrival = (r) => {
    if (!todayDay) return null
    const at = checkedInToday.get(r.id)
    return at
      ? <span className="badge badge-success"><CheckCircle2 size={12} aria-hidden="true" /> {formatClockTime(at)}</span>
      : <span className="badge badge-neutral">Not yet</span>
  }

  return (
    <div>
      <SectionHeader
        title="Registrations"
        subtitle={`${registrations.length} registered attendee${registrations.length === 1 ? '' : 's'}${todayDay ? ` · ${checkedInToday.size} checked in today` : ''}`}
        actions={
          <>
            <Button variant="secondary" onClick={handleCopyPublicLink} title="Copy public self-registration link">
              {copiedLink ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
              <span>{copiedLink ? 'Link Copied!' : 'Public Link'}</span>
            </Button>
            {canRegister && (
              <>
                <Button variant="secondary" onClick={() => setIsFamilyModalOpen(true)}>
                  <Users2 size={16} />
                  <span>Family</span>
                </Button>
                <Button variant="primary" onClick={() => setIsSingleModalOpen(true)}>
                  <UserPlus size={16} />
                  <span>Register Attendee</span>
                </Button>
              </>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="card mb-15" style={{ padding: '1rem' }}>
        <div className="filter-bar">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            label="Search attendees"
            placeholder="Search name, family, phone or email…"
          />
          <div>
            <label htmlFor="flt-class" className="sr-only">Classification</label>
            <select id="flt-class" className="form-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="all">All Classifications</option>
              {CLASSIFICATION_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {event.has_registration_fee && (
            <div>
              <label htmlFor="flt-pay" className="sr-only">Payment status</label>
              <select id="flt-pay" className="form-select" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid in Full</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="waived">Waived</option>
              </select>
            </div>
          )}
          {todayDay && (
            <div>
              <label htmlFor="flt-arrival" className="sr-only">Arrival today</label>
              <select id="flt-arrival" className="form-select" value={arrivalFilter} onChange={(e) => setArrivalFilter(e.target.value)}>
                <option value="all">Arrival today: All</option>
                <option value="arrived">Checked in today</option>
                <option value="pending">Not yet arrived</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading event attendees..." />
      ) : error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => loadData()} />
      ) : registrations.length === 0 ? (
        <EmptyState
          title="No attendees registered yet"
          description="Register attendees at the desk, or share the public link so people can sign up on their phones."
          actionLabel={canRegister ? 'Register Attendee' : null}
          onAction={() => setIsSingleModalOpen(true)}
          secondaryLabel="Copy Public Link"
          onSecondary={handleCopyPublicLink}
          icon={Users}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No attendees match your filters"
          description="Try a different search or clear the filters."
          secondaryLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onSecondary={clearFilters}
          icon={Users}
        />
      ) : (
        <div className="card">
          {isMobile ? (
            <div className="card-list">
              {pageItems.map(r => {
                const att = r.attendee
                return (
                  <div key={r.id} className="list-card">
                    <div className="list-card-row">
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-title">{att.last_name}, {att.first_name} {att.middle_name || ''}</div>
                        {att.households?.family_name && (
                          <div className="cell-sub" style={{ color: 'var(--color-brand-gold-600)', fontWeight: 600 }}>
                            {att.households.family_name}
                          </div>
                        )}
                        <div className="cell-sub">{att.contact_number || 'No phone'}</div>
                      </div>
                      <ActionMenu label={`Actions for ${att.first_name} ${att.last_name}`} items={menuItemsFor(r)} />
                    </div>
                    <div className="list-card-meta">
                      <StatusBadge status={att.classification} />
                      {event.has_registration_fee && <StatusBadge status={r.payment_status} />}
                      {renderArrival(r)}
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ marginLeft: 'auto' }}
                        loading={downloadingId === r.id}
                        loadingText="PDF…"
                        onClick={() => handleDownloadPdf(r)}
                      >
                        <FileText size={14} />
                        <span>Pass</span>
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
                    <th scope="col">Attendee Name</th>
                    <th scope="col">Classification</th>
                    <th scope="col">Contact</th>
                    {event.has_registration_fee && <th scope="col">Payment</th>}
                    {todayDay && <th scope="col">Today</th>}
                    <th scope="col">Pass</th>
                    <th scope="col" style={{ width: '56px' }}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(r => {
                    const att = r.attendee
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="cell-title">{att.last_name}, {att.first_name} {att.middle_name || ''}</div>
                          <div className="cell-sub">
                            {att.households?.family_name && (
                              <span style={{ color: 'var(--color-brand-gold-600)', fontWeight: 600 }}>{att.households.family_name} · </span>
                            )}
                            <span style={{ textTransform: 'capitalize' }}>{(r.registration_source || '').replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td><StatusBadge status={att.classification} /></td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <div>{att.contact_number || '—'}</div>
                          {att.email && <div className="cell-sub">{att.email}</div>}
                        </td>
                        {event.has_registration_fee && <td><StatusBadge status={r.payment_status} /></td>}
                        {todayDay && <td>{renderArrival(r)}</td>}
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={downloadingId === r.id}
                            loadingText="PDF…"
                            onClick={() => handleDownloadPdf(r)}
                            title="Download PDF pass"
                          >
                            <FileText size={14} />
                            <span>PDF</span>
                          </Button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <ActionMenu label={`Actions for ${att.first_name} ${att.last_name}`} items={menuItemsFor(r)} />
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
            itemLabel="attendees"
          />
        </div>
      )}

      {/* Single / Paper Registration Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => { setIsSingleModalOpen(false); setSingleFormDirty(false) }}
        title="Register Attendee"
        maxWidth="650px"
        isDirty={singleFormDirty}
      >
        <RegistrationForm
          eventId={eventId}
          eventDays={event.days || []}
          existingAttendees={registrations.map(r => r.attendee).filter(Boolean)}
          defaultSource="paper"
          onDirtyChange={setSingleFormDirty}
          onSuccess={(_, { keepOpen }) => {
            loadData({ silent: true })
            if (!keepOpen) {
              setSingleFormDirty(false)
              setIsSingleModalOpen(false)
            }
          }}
          onCancel={() => { setIsSingleModalOpen(false); setSingleFormDirty(false) }}
        />
      </Modal>

      <FamilyRegistrationModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        eventId={eventId}
        onRegistered={() => loadData({ silent: true })}
      />

      {selectedRegForEdit && (
        <EditAttendeeModal
          isOpen={Boolean(selectedRegForEdit)}
          onClose={() => setSelectedRegForEdit(null)}
          registration={selectedRegForEdit}
          eventDays={event.days || []}
          onSaved={() => loadData({ silent: true })}
        />
      )}

      {selectedRegForPayment && (
        <PaymentModal
          isOpen={Boolean(selectedRegForPayment)}
          onClose={() => setSelectedRegForPayment(null)}
          registration={selectedRegForPayment}
          event={event}
          onSuccess={() => loadData({ silent: true })}
        />
      )}

      {/* Clipboard fallback (non-HTTPS or blocked clipboard) */}
      <Modal isOpen={linkFallbackOpen} onClose={() => setLinkFallbackOpen(false)} title="Public Registration Link" maxWidth="520px">
        <p className="text-muted" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          Your browser blocked automatic copying. Select the link below and copy it manually.
        </p>
        <label htmlFor="public-link" className="sr-only">Public registration link</label>
        <input
          id="public-link"
          className="form-control"
          readOnly
          value={publicUrl}
          onFocus={(e) => e.target.select()}
          data-autofocus
        />
        <div className="form-actions">
          <Button variant="primary" onClick={() => setLinkFallbackOpen(false)}>Done</Button>
        </div>
      </Modal>
    </div>
  )
}
