import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { eventService } from '../events/eventService'
import { attendeeService } from './attendeeService'
import { qrService } from '../qr/qrService'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { Tabs } from '../../components/ui/Tabs'
import { formatDate } from '../../utils/date'
import { isValidPhMobile, PH_MOBILE_HINT } from '../../utils/validation'
import { CheckCircle2, Download, FileText, ExternalLink, MapPin, Calendar, Ticket, Camera, Lock } from 'lucide-react'

const OPEN_STATUSES = ['registration_open', 'in_progress']

const PUBLIC_CLASSIFICATIONS = [
  { value: 'visitor', label: 'First-time Church Visitor' },
  { value: 'member', label: 'Berean Member' },
  { value: 'youth', label: 'Youth' },
  { value: 'guest', label: 'Invited Guest' },
  { value: 'pastor', label: 'Visiting Pastor / Minister' }
]

function PageShell({ children }) {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-base)', padding: '1.5rem 1rem 3rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/assets/church-logo.png"
            alt="Berean Bible Baptist Church logo"
            style={{ width: '80px', height: '80px', objectFit: 'contain', display: 'block', margin: '0 auto 0.75rem auto' }}
          />
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-brand-navy-900)', marginBottom: '0.25rem' }}>
            Berean Bible Baptist Church
          </p>
          <p style={{ color: 'var(--color-brand-gold-600)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Official Event Registration
          </p>
        </div>
        {children}
      </div>
    </main>
  )
}

export function PublicRegistrationPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [mode, setMode] = useState('register') // register | retrieve
  const [submitting, setSubmitting] = useState(false)
  const [submittedPass, setSubmittedPass] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [consent, setConsent] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    classification: 'visitor',
    selectedDays: []
  })

  const loadEvent = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await eventService.getEventById(eventId)
      setEvent(data)
      if (data?.days) setFormData(prev => ({ ...prev, selectedDays: data.days.map(d => d.id) }))
    } catch (err) {
      setLoadError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvent()
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setFieldErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const toggleDay = (dayId) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayId)
        ? prev.selectedDays.filter(id => id !== dayId)
        : [...prev.selectedDays, dayId]
    }))
  }

  const showPass = async ({ attendeeName, classification, qrPayload, registrationId, existing = false }) => {
    const dataUrl = await qrService.generateQrDataUrl(qrPayload)
    setQrDataUrl(dataUrl)
    setSubmittedPass({ attendeeName, classification, qrPayload, registrationId, existing })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validate = () => {
    const errs = {}
    if (!formData.firstName.trim()) errs.firstName = 'Please enter your first name.'
    if (!formData.lastName.trim()) errs.lastName = 'Please enter your last name.'
    if (!formData.contactNumber.trim()) errs.contactNumber = 'Please enter your mobile number.'
    else if (!isValidPhMobile(formData.contactNumber)) errs.contactNumber = PH_MOBILE_HINT
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const effectiveMode = OPEN_STATUSES.includes(event?.status) ? mode : 'retrieve'
    if (!validate()) return
    if (effectiveMode === 'register') {
      if (!consent) {
        setError('Please agree to the privacy notice to continue.')
        return
      }
      if ((event.days?.length || 0) > 1 && formData.selectedDays.length === 0) {
        setError('Please choose at least one day you will attend.')
        return
      }
    }

    setSubmitting(true)
    try {
      // Duplicate detection / pass retrieval by name + mobile
      const existing = await attendeeService.findRegistrationByContact({
        eventId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber
      })

      if (existing) {
        const payload = existing.qr_credential?.payload || await qrService.getCredential(existing.id)
        await showPass({
          attendeeName: `${existing.attendee.first_name} ${existing.attendee.last_name}`,
          classification: existing.attendee.classification,
          qrPayload: payload,
          registrationId: existing.id,
          existing: true
        })
        return
      }

      if (effectiveMode === 'retrieve') {
        setError('We could not find a registration with that name and mobile number. Check the spelling, or register below.')
        return
      }

      const result = await attendeeService.registerAttendee({
        eventId,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        email: formData.email,
        classification: formData.classification,
        source: 'online',
        selectedDayIds: formData.selectedDays.length ? formData.selectedDays : null
      })

      await showPass({
        attendeeName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        classification: formData.classification,
        qrPayload: result.qrPayload,
        registrationId: result.registrationId
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit registration. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const passDetails = () => ({
    payload: submittedPass.qrPayload,
    attendeeName: submittedPass.attendeeName,
    classification: submittedPass.classification,
    eventName: event?.name || 'Berean Event',
    venue: event?.venue || 'Berean Bible Baptist Church',
    eventDates: event ? `${formatDate(event.start_date)} — ${formatDate(event.end_date)}` : ''
  })

  if (loading) return <PageShell><LoadingState message="Loading event details..." /></PageShell>
  if (loadError) {
    return (
      <PageShell>
        <ErrorState title="Could not load this event" message={getErrorMessage(loadError)} onRetry={loadEvent} />
      </PageShell>
    )
  }
  if (!event) {
    return (
      <PageShell>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem' }}>Event Not Found</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>This registration link is not valid. Please check with the church office.</p>
        </div>
      </PageShell>
    )
  }

  const isOpen = OPEN_STATUSES.includes(event.status)
  const multiDay = (event.days?.length || 0) > 1

  /* ---------- Confirmation / pass screen ---------- */
  if (submittedPass) {
    return (
      <PageShell>
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.25rem', borderTop: '4px solid var(--color-brand-yellow-500)' }}>
          <div className="empty-state-icon" style={{ margin: '0 auto 1rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', width: 64, height: 64 }}>
            <CheckCircle2 size={36} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            {submittedPass.existing ? 'Here is your pass' : 'Registration Confirmed!'}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.95rem', marginBottom: '1.25rem' }}>
            {submittedPass.existing
              ? <>You are already registered for <strong>{event.name}</strong>.</>
              : <>We look forward to seeing you at <strong>{event.name}</strong>.</>}
          </p>

          <Alert variant="warning" style={{ textAlign: 'left' }}>
            <strong>Save your pass now.</strong> Download the PDF or take a screenshot. You can also come back to this link and use “Find my pass” with your name and mobile number.
          </Alert>

          <div style={{
            background: '#FFFFFF',
            border: '2px solid var(--color-brand-navy-900)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            display: 'inline-block',
            maxWidth: '340px',
            width: '100%',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '1.5rem'
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-brand-navy-900)', marginBottom: '0.5rem' }}>
              {event.name}
            </p>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>{submittedPass.attendeeName}</h2>
            <span className="badge badge-info">{submittedPass.classification}</span>
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt={`Check-in QR code for ${submittedPass.attendeeName}`}
                style={{ width: '220px', height: '220px', display: 'block', margin: '1rem auto 0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
            )}
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
              Show this QR code to the usher when you arrive.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '340px', margin: '0 auto' }}>
            <Button variant="gold" size="lg" block onClick={() => qrService.downloadQrPdf({ ...passDetails(), filename: `${submittedPass.attendeeName}_Berean_Pass` })}>
              <FileText size={18} />
              <span>Download Pass (PDF)</span>
            </Button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => qrService.openQrPdfInNewTab(passDetails())}>
                <ExternalLink size={14} />
                <span>View / Print</span>
              </Button>
              <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => qrService.downloadQrImage(submittedPass.qrPayload, `${submittedPass.attendeeName}_QR_Pass`)}>
                <Download size={14} />
                <span>Image (PNG)</span>
              </Button>
            </div>
            <p className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', fontSize: '0.85rem' }}>
              <Camera size={16} aria-hidden="true" /> A screenshot of this screen works too.
            </p>
          </div>

          {event.has_registration_fee && (
            <Alert variant="info" style={{ marginTop: '1.5rem', textAlign: 'left' }} title={`Registration fee: ₱${Number(event.registration_fee || 0).toFixed(2)}`}>
              {event.payment_instructions || 'Please settle the fee at the registration desk.'}
              {event.require_payment_before_checkin && ' Payment is required before check-in.'}
            </Alert>
          )}
        </div>
      </PageShell>
    )
  }

  /* ---------- Form screen ---------- */
  return (
    <PageShell>
      <div className="card" style={{ padding: '1.5rem 1.25rem' }}>
        <div className="fieldset-box">
          <h1 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{event.name}</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={15} aria-hidden="true" /> {formatDate(event.start_date)} — {formatDate(event.end_date)}
            </span>
            {event.venue && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={15} aria-hidden="true" /> {event.venue}
              </span>
            )}
            {event.has_registration_fee && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-brand-navy-900)' }}>
                <Ticket size={15} aria-hidden="true" /> Fee: ₱{Number(event.registration_fee || 0).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {!isOpen && (
          <Alert variant="info" title="Registration is closed">
            Online registration for this event is not open right now. If you already registered, you can still find your pass below.
          </Alert>
        )}

        <div style={{ marginBottom: '1.25rem' }}>
          <Tabs
            label="Registration options"
            fullWidth
            value={isOpen ? mode : 'retrieve'}
            onChange={(v) => { setMode(v); setError('') }}
            options={isOpen
              ? [{ value: 'register', label: 'Register' }, { value: 'retrieve', label: 'Find my pass' }]
              : [{ value: 'retrieve', label: 'Find my pass' }]}
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <Input
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              error={fieldErrors.firstName}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              error={fieldErrors.lastName}
              required
            />
          </div>

          <Input
            label="Mobile Number"
            name="contactNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={formData.contactNumber}
            onChange={handleChange}
            placeholder="e.g. 0917-123-4567"
            error={fieldErrors.contactNumber}
            required
          />

          {mode === 'register' && isOpen && (
            <>
              <Input
                label="Email (Optional)"
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. juan@example.com"
              />

              <Select
                label="I am a…"
                name="classification"
                value={formData.classification}
                onChange={handleChange}
                options={PUBLIC_CLASSIFICATIONS}
              />

              {multiDay && (
                <fieldset className="fieldset-box">
                  <legend className="form-label" style={{ float: 'left', width: '100%' }}>Which days will you attend?</legend>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', clear: 'both' }}>
                    {event.days.map(d => (
                      <label key={d.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.selectedDays.includes(d.id)}
                          onChange={() => toggleDay(d.id)}
                        />
                        <span>Day {d.day_number} — {formatDate(d.event_date)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="fieldset-box" style={{ fontSize: '0.85rem' }}>
                <p style={{ display: 'flex', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-brand-navy-900)' }}>
                  <Lock size={15} aria-hidden="true" style={{ marginTop: '2px' }} /> Privacy Notice
                </p>
                <p className="text-muted" style={{ marginBottom: '0.6rem', lineHeight: 1.55 }}>
                  Berean Bible Baptist Church collects your name, mobile number and email only to manage your registration,
                  check-in and meal planning for this event, in line with the Data Privacy Act of 2012 (RA 10173).
                  Your information is accessible only to authorized church staff and is not shared with third parties.
                  You may ask the church office to correct or delete your information.
                </p>
                <label className="checkbox-label" style={{ alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    style={{ marginTop: '2px' }}
                  />
                  <span>I agree to the collection and use of my information for this event.</span>
                </label>
              </div>
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={submitting}
            loadingText={mode === 'retrieve' || !isOpen ? 'Searching…' : 'Registering…'}
            disabled={mode === 'register' && isOpen && !consent}
          >
            {mode === 'retrieve' || !isOpen ? 'Find My Pass' : 'Register & Get QR Pass'}
          </Button>
        </form>
      </div>
    </PageShell>
  )
}
