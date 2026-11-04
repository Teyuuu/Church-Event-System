import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams, Link } from 'react-router-dom'
import { attendeeService } from '../attendees/attendeeService'
import { qrService } from './qrService'
import { QRCard } from './QRCard'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { SectionHeader } from '../../components/ui/PageHeader'
import { Pagination, paginate } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'
import { formatDate } from '../../utils/date'
import { Printer, FileText, QrCode } from 'lucide-react'

const SHEET_SIZE = 48

const LAYOUTS = [
  { value: '2x3', label: '2 × 3 per page (large)', cols: 2, minHeight: '3.2in' },
  { value: '2x4', label: '2 × 4 per page', cols: 2, minHeight: '2.45in' },
  { value: '3x3', label: '3 × 3 per page (compact)', cols: 3, minHeight: '3.2in' }
]

// Remember which badges were already printed (per browser, per event)
const printedKey = (eventId) => `berean_printed_badges_${eventId}`
function loadPrinted(eventId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(printedKey(eventId)) || '[]'))
  } catch {
    return new Set()
  }
}
function savePrinted(eventId, set) {
  try { localStorage.setItem(printedKey(eventId), JSON.stringify([...set])) } catch { /* ignore */ }
}

export function QRPrintPage() {
  const { event } = useOutletContext()
  const eventId = event.id
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const singleRegId = searchParams.get('regId')

  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [familyFilter, setFamilyFilter] = useState('all')
  const [printFilter, setPrintFilter] = useState('all') // all | new
  const [layout, setLayout] = useState('2x3')
  const [page, setPage] = useState(1)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [ready, setReady] = useState(new Set())
  const [printed, setPrinted] = useState(() => loadPrinted(eventId))

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRegistrations(await attendeeService.getEventRegistrations(eventId))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const families = useMemo(() => Array.from(new Set(
    registrations.map(r => r.attendee?.households?.family_name).filter(Boolean)
  )).sort(), [registrations])

  const target = useMemo(() => {
    let list = registrations.filter(r => r.attendee)
    if (singleRegId) return list.filter(r => r.id === singleRegId)
    if (familyFilter !== 'all') list = list.filter(r => r.attendee?.households?.family_name === familyFilter)
    if (printFilter === 'new') list = list.filter(r => !printed.has(r.id))
    return list.sort((a, b) => (a.attendee.last_name || '').localeCompare(b.attendee.last_name || ''))
  }, [registrations, singleRegId, familyFilter, printFilter, printed])

  useEffect(() => { setPage(1) }, [familyFilter, printFilter])

  const { pageItems, totalPages, page: safePage, start, end } = paginate(target, page, SHEET_SIZE)

  const handleReady = useCallback((regId, ok) => {
    if (!ok) return
    setReady(prev => {
      if (prev.has(regId)) return prev
      const next = new Set(prev)
      next.add(regId)
      return next
    })
  }, [])

  const readyOnSheet = pageItems.filter(r => ready.has(r.id)).length
  const sheetReady = readyOnSheet === pageItems.length
  const layoutDef = LAYOUTS.find(l => l.value === layout) || LAYOUTS[0]

  const handlePrint = () => {
    const next = new Set(printed)
    pageItems.forEach(r => next.add(r.id))
    setPrinted(next)
    savePrinted(eventId, next)
    window.print()
  }

  const handleDownloadPdf = async () => {
    if (!target.length) return
    setDownloadingPdf(true)
    try {
      const dates = `${formatDate(event.start_date)} — ${formatDate(event.end_date)}`
      if (target.length === 1) {
        const r = target[0]
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
          target.map(async (r) => ({
            payload: r.qr_credential?.payload || await qrService.getCredential(r.id),
            attendeeName: `${r.attendee.first_name} ${r.attendee.last_name}`,
            classification: r.attendee.classification || 'attendee'
          }))
        )
        const filterSuffix = familyFilter !== 'all' ? `_Family_${familyFilter}` : '_Bulk'
        await qrService.downloadBatchQrPdf({
          items,
          eventName: event.name,
          eventDates: dates,
          filename: `${event.name.replace(/\s+/g, '_')}${filterSuffix}_Passes`
        })
      }
      toast.success(`PDF ready: ${target.length} pass${target.length === 1 ? '' : 'es'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to generate PDF passes')
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (loading) return <LoadingState message="Preparing printable badges..." />
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={loadData} />

  return (
    <div>
      <div className="no-print">
        <SectionHeader
          title={singleRegId ? 'Print Single Badge' : 'Print QR Badges'}
          subtitle={singleRegId
            ? <Link to={`/events/${eventId}/print`} className="link">Show all badges</Link>
            : `${target.length} badge${target.length === 1 ? '' : 's'} selected · ${printed.size} printed on this device`}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={handleDownloadPdf}
                loading={downloadingPdf}
                loadingText="Generating PDF…"
                disabled={target.length === 0}
              >
                <FileText size={18} />
                <span>{target.length === 1 ? 'Download PDF' : `PDF (${target.length})`}</span>
              </Button>
              <Button
                variant="primary"
                onClick={handlePrint}
                disabled={!sheetReady || pageItems.length === 0}
                title={sheetReady ? 'Print this sheet' : 'Waiting for QR codes to finish generating'}
              >
                <Printer size={18} />
                <span>{sheetReady ? `Print ${pageItems.length} Badge${pageItems.length === 1 ? '' : 's'}` : 'Preparing…'}</span>
              </Button>
            </>
          }
        />

        {!singleRegId && (
          <div className="card mb-1" style={{ padding: '1rem' }}>
            <div className="filter-bar">
              <div>
                <label htmlFor="print-layout" className="form-label" style={{ fontSize: '0.8rem' }}>Sheet layout</label>
                <select id="print-layout" className="form-select" value={layout} onChange={(e) => setLayout(e.target.value)}>
                  {LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="print-filter" className="form-label" style={{ fontSize: '0.8rem' }}>Which badges</label>
                <select id="print-filter" className="form-select" value={printFilter} onChange={(e) => setPrintFilter(e.target.value)}>
                  <option value="all">All attendees</option>
                  <option value="new">Not yet printed (this device)</option>
                </select>
              </div>
              {families.length > 0 && (
                <div>
                  <label htmlFor="print-family" className="form-label" style={{ fontSize: '0.8rem' }}>Family / group</label>
                  <select id="print-family" className="form-select" value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
                    <option value="all">All families</option>
                    {families.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {pageItems.length > 0 && !sheetReady && (
          <div className="card mb-1" style={{ padding: '0.75rem 1rem' }} role="status" aria-live="polite">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <span>Generating QR codes…</span>
              <span>{readyOnSheet} / {pageItems.length}</span>
            </div>
            <div className="progress"><span style={{ width: `${(readyOnSheet / pageItems.length) * 100}%` }} /></div>
          </div>
        )}

        {totalPages > 1 && (
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            Badges are split into sheets of {SHEET_SIZE}. Print each sheet separately.
          </p>
        )}
      </div>

      {target.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title={printFilter === 'new' ? 'All badges have been printed' : 'No badges to print'}
          description={printFilter === 'new' ? 'Every attendee in this selection was printed on this device.' : 'Register attendees first, then return here to print their badges.'}
          secondaryLabel={printFilter === 'new' ? 'Show all attendees' : undefined}
          onSecondary={() => setPrintFilter('all')}
        />
      ) : (
        <>
          <div
            className="print-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
              gap: '1.25rem',
              padding: '1rem 0',
              '--print-cols': layoutDef.cols,
              '--badge-min-height': layoutDef.minHeight
            }}
          >
            {pageItems.map((r) => {
              const att = r.attendee
              return (
                <div key={r.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <QRCard
                    eventName={event.name}
                    attendeeName={`${att.first_name} ${att.last_name}`}
                    classification={att.classification}
                    registrationId={r.id}
                    qrPayload={r.qr_credential?.payload}
                    onReady={handleReady}
                  />
                </div>
              )
            })}
          </div>
          <div className="no-print">
            <Pagination
              page={safePage}
              totalPages={totalPages}
              start={start}
              end={end}
              total={target.length}
              onPageChange={setPage}
              itemLabel="badges"
            />
          </div>
        </>
      )}
    </div>
  )
}
