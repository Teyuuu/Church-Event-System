import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { eventService } from '../events/eventService'
import { attendeeService } from '../attendees/attendeeService'
import { qrService } from './qrService'
import { QRCard } from './QRCard'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatDate } from '../../utils/date'
import { Printer, ArrowLeft, Users, FileText } from 'lucide-react'

export function QRPrintPage() {
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const singleRegId = searchParams.get('regId')

  const [event, setEvent] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [familyFilter, setFamilyFilter] = useState('all')
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [evtData, regsData] = await Promise.all([
          eventService.getEventById(eventId),
          attendeeService.getEventRegistrations(eventId)
        ])
        setEvent(evtData)
        setRegistrations(regsData)
      } catch (err) {
        console.error('Failed to load print data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [eventId])

  if (loading) return <LoadingState message="Preparing printable badges..." />
  if (!event) return <div>Event not found.</div>

  // Determine which badges to show
  let targetRegistrations = registrations
  if (singleRegId) {
    targetRegistrations = registrations.filter(r => r.id === singleRegId)
  } else if (familyFilter !== 'all') {
    targetRegistrations = registrations.filter(r => r.attendee?.households?.family_name === familyFilter)
  }

  // Extract unique family names for filter
  const families = Array.from(new Set(
    registrations.map(r => r.attendee?.households?.family_name).filter(Boolean)
  ))

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPdf = async () => {
    if (!targetRegistrations.length) return
    setDownloadingPdf(true)
    try {
      const dates = event ? `${formatDate(event.start_date)} — ${formatDate(event.end_date)}` : ''
      if (targetRegistrations.length === 1) {
        const r = targetRegistrations[0]
        const payload = r.qr_credential?.payload || await qrService.getCredential(r.id)
        await qrService.downloadQrPdf({
          payload,
          attendeeName: `${r.attendee.first_name} ${r.attendee.last_name}`,
          classification: r.attendee.classification || 'attendee',
          eventName: event.name,
          venue: event.venue,
          eventDates: dates,
          filename: `${r.attendee.first_name}_${r.attendee.last_name}_Pass`
        })
      } else {
        const items = await Promise.all(
          targetRegistrations.map(async (r) => {
            const payload = r.qr_credential?.payload || await qrService.getCredential(r.id)
            return {
              payload,
              attendeeName: `${r.attendee.first_name} ${r.attendee.last_name}`,
              classification: r.attendee.classification || 'attendee'
            }
          })
        )
        const filterSuffix = familyFilter !== 'all' ? `_Family_${familyFilter}` : '_Bulk'
        await qrService.downloadBatchQrPdf({
          items,
          eventName: event.name,
          eventDates: dates,
          filename: `${event.name.replace(/\s+/g, '_')}${filterSuffix}_Passes`
        })
      }
    } catch (err) {
      console.error('Failed to generate PDF passes:', err)
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div>
      {/* Non-printable Control Header */}
      <div className="no-print" style={{ marginBottom: '1.5rem' }}>
        <Link to={`/events/${eventId}/attendees`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-brand-navy-800)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Attendee Directory</span>
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h1>Print QR Badges & Sheets</h1>
            <p className="text-muted">
              {targetRegistrations.length} Badges Ready for Printing or PDF Export
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {!singleRegId && families.length > 0 && (
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '180px' }}
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
              >
                <option value="all">All Attendees (Bulk)</option>
                {families.map(f => (
                  <option key={f} value={f}>Family: {f}</option>
                ))}
              </select>
            )}

            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || targetRegistrations.length === 0}
              className="btn-lg"
              title="Download high-resolution vector PDF"
            >
              <FileText size={18} color="var(--color-brand-blue-600)" />
              <span>{downloadingPdf ? 'Generating PDF...' : targetRegistrations.length === 1 ? 'Download PDF Pass' : `Download ${targetRegistrations.length} PDF Passes`}</span>
            </Button>

            <Button variant="primary" onClick={handlePrint} className="btn-lg">
              <Printer size={18} />
              <span>Print Badges Now</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Badges Grid (Print-optimised) */}
      <div className="print-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
        padding: '1rem 0'
      }}>
        {targetRegistrations.map((r) => {
          const att = r.attendee
          return (
            <div key={r.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <QRCard
                eventName={event.name}
                attendeeName={`${att.first_name} ${att.last_name}`}
                classification={att.classification}
                registrationId={r.id}
                qrPayload={r.qr_credential?.payload}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
