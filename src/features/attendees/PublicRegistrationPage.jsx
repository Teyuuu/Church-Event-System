import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { eventService } from '../events/eventService'
import { attendeeService } from './attendeeService'
import { qrService } from '../qr/qrService'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatDate } from '../../utils/date'
import { CheckCircle2, Download, FileText, ExternalLink, ShieldCheck, MapPin, Calendar, Clock, DollarSign, Camera } from 'lucide-react'

export function PublicRegistrationPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittedPass, setSubmittedPass] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    classification: 'visitor'
  })

  useEffect(() => {
    async function loadEvent() {
      setLoading(true)
      try {
        const data = await eventService.getEventById(eventId)
        setEvent(data)
      } catch (err) {
        console.error('Failed to load event:', err)
      } finally {
        setLoading(false)
      }
    }
    loadEvent()
  }, [eventId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await attendeeService.registerAttendee({
        eventId,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        email: formData.email,
        classification: formData.classification,
        source: 'online'
      })

      const dataUrl = await qrService.generateQrDataUrl(result.qrPayload)
      setQrDataUrl(dataUrl)
      setSubmittedPass({
        attendeeName: `${formData.firstName} ${formData.lastName}`,
        classification: formData.classification,
        qrPayload: result.qrPayload,
        registrationId: result.registrationId
      })
    } catch (err) {
      setError(err.message || 'Failed to submit registration. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = () => {
    if (submittedPass && submittedPass.qrPayload) {
      qrService.downloadQrImage(submittedPass.qrPayload, `${submittedPass.attendeeName}_QR_Pass`)
    }
  }

  const handleDownloadPdf = async () => {
    if (submittedPass && submittedPass.qrPayload) {
      await qrService.downloadQrPdf({
        payload: submittedPass.qrPayload,
        attendeeName: submittedPass.attendeeName,
        classification: submittedPass.classification,
        eventName: event?.name || 'Berean Event',
        venue: event?.venue || 'Berean Bible Baptist Church',
        eventDates: event ? `${formatDate(event.start_date)} — ${formatDate(event.end_date)}` : '',
        filename: `${submittedPass.attendeeName}_Berean_Pass`
      })
    }
  }

  const handleOpenPdfTab = async () => {
    if (submittedPass && submittedPass.qrPayload) {
      await qrService.openQrPdfInNewTab({
        payload: submittedPass.qrPayload,
        attendeeName: submittedPass.attendeeName,
        classification: submittedPass.classification,
        eventName: event?.name || 'Berean Event',
        venue: event?.venue || 'Berean Bible Baptist Church',
        eventDates: event ? `${formatDate(event.start_date)} — ${formatDate(event.end_date)}` : ''
      })
    }
  }

  if (loading) return <LoadingState message="Loading event details..." />
  if (!event) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Event Not Found</h2>
        <p className="text-muted">The requested church event could not be found or has closed.</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg-base)',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Church Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/assets/church-logo.png"
            alt="Berean Bible Baptist Church Logo"
            style={{
              width: '88px',
              height: '88px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto 0.75rem auto',
              filter: 'drop-shadow(0 4px 8px rgba(10,37,64,0.15))'
            }}
          />
          <h1 style={{ fontSize: '1.6rem', color: 'var(--color-brand-navy-900)', marginBottom: '0.25rem' }}>
            Berean Bible Baptist Church
          </h1>
          <p style={{ color: 'var(--color-brand-yellow-600)', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Official Event Registration
          </p>
        </div>

        {/* Confirmation Screen */}
        {submittedPass ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', borderTop: '4px solid var(--color-brand-yellow-500)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Registration Confirmed!</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              We look forward to seeing you at <strong>{event.name}</strong>.
            </p>

            {/* Scannable Pass Box */}
            <div style={{
              background: '#FFFFFF',
              border: '2px solid var(--color-brand-navy-900)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              display: 'inline-block',
              maxWidth: '340px',
              width: '100%',
              boxShadow: 'var(--shadow-md)',
              marginBottom: '1.5rem',
              position: 'relative'
            }}>
              <img
                src="/assets/church-logo.png"
                alt="Berean Logo"
                style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0 auto 0.4rem auto', display: 'block' }}
              />
              <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-brand-navy-900)', marginBottom: '0.5rem' }}>
                Berean Bible Baptist Church
              </p>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                {submittedPass.attendeeName}
              </h3>
              <span className="badge badge-info" style={{ marginBottom: '1rem' }}>
                {submittedPass.classification}
              </span>

              {/* QR Code */}
              {qrDataUrl && (
                <div style={{ margin: '0.75rem auto' }}>
                  <img
                    src={qrDataUrl}
                    alt="Attendee Check-In QR Code"
                    style={{
                      width: '200px',
                      height: '200px',
                      display: 'block',
                      margin: '0 auto',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)'
                    }}
                  />
                </div>
              )}

              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Present this QR code to the Church Usher upon arrival.
              </p>
            </div>

            {/* Helpful Notice & Download Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxWidth: '340px',
              margin: '0 auto'
            }}>
              <Button variant="gold" onClick={handleDownloadPdf} className="btn-lg">
                <FileText size={18} />
                <span>Download Official Pass (PDF)</span>
              </Button>

              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <Button variant="secondary" onClick={handleOpenPdfTab} size="sm" style={{ flex: 1 }}>
                  <ExternalLink size={14} />
                  <span>View / Print</span>
                </Button>

                <Button variant="secondary" onClick={handleDownload} size="sm" style={{ flex: 1 }}>
                  <Download size={14} />
                  <span>Image (PNG)</span>
                </Button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                justifyContent: 'center',
                marginTop: '0.25rem'
              }}>
                <Camera size={16} />
                <span>You can also take a screenshot of this screen!</span>
              </div>
            </div>

            {event.has_registration_fee && (
              <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'var(--color-warning-bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #FDE68A',
                textAlign: 'left',
                fontSize: '0.85rem'
              }}>
                <strong style={{ color: 'var(--color-brand-gold-600)' }}>Registration Fee Notice:</strong>
                <p style={{ marginTop: '0.25rem', color: 'var(--color-text-main)' }}>
                  Event Fee: <strong>₱{event.registration_fee?.toFixed(2)}</strong>.
                </p>
                {event.payment_instructions && (
                  <p style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)' }}>
                    {event.payment_instructions}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Registration Form */
          <div className="card" style={{ padding: '2rem 1.5rem' }}>
            {/* Event Summary Card */}
            <div style={{
              background: 'var(--color-bg-muted)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--color-border)'
            }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{event.name}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={15} color="var(--color-brand-gold-500)" />
                  <span>{formatDate(event.start_date)} — {formatDate(event.end_date)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={15} color="var(--color-brand-navy-700)" />
                  <span>{event.venue}</span>
                </div>
                {event.has_registration_fee && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={15} color="var(--color-success)" />
                    <span style={{ fontWeight: 600, color: 'var(--color-brand-navy-900)' }}>
                      Fee: ₱{event.registration_fee?.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="e.g. John"
                  required
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="e.g. Dela Cruz"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Mobile Contact #"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="e.g. 0917-123-4567"
                  required
                />
                <Input
                  label="Email (Optional)"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Classification / Role</label>
                <select
                  name="classification"
                  className="form-select"
                  value={formData.classification}
                  onChange={handleChange}
                >
                  <option value="visitor">First-time Church Visitor</option>
                  <option value="member">Berean Member</option>
                  <option value="youth">Youth</option>
                  <option value="guest">Invited Guest</option>
                  <option value="pastor">Visiting Pastor / Minister</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="btn-lg"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Register & Get QR Pass
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
