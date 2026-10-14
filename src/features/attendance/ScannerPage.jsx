import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { eventService } from '../events/eventService'
import { attendeeService } from '../attendees/attendeeService'
import { attendanceService } from './attendanceService'
import { ScanResult } from './ScanResult'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatDate } from '../../utils/date'
import {
  Camera,
  Search,
  UserCheck,
  ArrowLeft,
  Wifi,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  StopCircle
} from 'lucide-react'

export function ScannerPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState('')
  const [loading, setLoading] = useState(true)

  // Scanner state
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [activeTab, setActiveTab] = useState('camera') // 'camera' or 'manual'

  // Manual lookup state
  const [searchQuery, setSearchQuery] = useState('')
  const [registrations, setRegistrations] = useState([])
  const [manualLoadingId, setManualLoadingId] = useState(null)

  const html5QrCodeRef = useRef(null)
  const lastScannedTimeRef = useRef(0)
  const lastScannedCodeRef = useRef('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [evtData, regsData] = await Promise.all([
        eventService.getEventById(eventId),
        attendeeService.getEventRegistrations(eventId)
      ])
      setEvent(evtData)
      setRegistrations(regsData)

      // Default to currently open day or day 1
      const openDay = evtData.days?.find(d => d.status === 'open') || evtData.days?.[0]
      if (openDay) setSelectedDayId(openDay.id)
    } catch (err) {
      console.error('Failed to load scanner context:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    return () => {
      stopCamera()
    }
  }, [eventId])

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop()
      } catch (err) {
        console.warn('Error stopping camera:', err)
      }
      setIsScanning(false)
    }
  }

  const startCamera = async () => {
    setCameraError('')
    setScanResult(null)

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader')
      }

      const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        qrConfig,
        onScanSuccess,
        onScanFailure
      )

      setIsScanning(true)
    } catch (err) {
      console.error('Failed to start camera:', err)
      setCameraError('Camera access failed. Please ensure camera permissions are granted and you are using HTTPS.')
      setIsScanning(false)
    }
  }

  const onScanSuccess = async (decodedText) => {
    const now = Date.now()
    // Debounce duplicate scans within 2.5 seconds
    if (decodedText === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
      return
    }

    lastScannedCodeRef.current = decodedText
    lastScannedTimeRef.current = now

    // Play subtle audio beep if supported
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.1)
    } catch {
      // AudioContext not supported or muted
    }

    // Call atomic check-in
    try {
      const result = await attendanceService.verifyAndCheckin(decodedText, selectedDayId)
      setScanResult(result)
    } catch (err) {
      setScanResult({
        success: false,
        status: 'error',
        message: err.message || 'Check-in request failed.'
      })
    }
  }

  const onScanFailure = () => {
    // Silent frame failure
  }

  const handleManualCheckIn = async (regId) => {
    setManualLoadingId(regId)
    try {
      const result = await attendanceService.manualCheckin(regId, selectedDayId)
      setScanResult(result)
    } catch (err) {
      setScanResult({
        success: false,
        status: 'error',
        message: err.message || 'Manual check-in failed.'
      })
    } finally {
      setManualLoadingId(null)
    }
  }

  if (loading) return <LoadingState message="Configuring scanner station..." />
  if (!event) return <div>Event not found.</div>

  const currentDay = event.days?.find(d => d.id === selectedDayId)

  // Manual search filter
  const filteredRegistrations = registrations.filter(r => {
    if (!searchQuery.trim()) return false
    const att = r.attendee
    if (!att) return false
    const q = searchQuery.toLowerCase()
    return (
      `${att.first_name} ${att.last_name}`.toLowerCase().includes(q) ||
      (att.contact_number && att.contact_number.includes(q))
    )
  })

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Navigation & Header */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-brand-navy-800)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem' }}>Usher QR Scanner</h1>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{event.name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 700, background: 'var(--color-success-bg)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
            <Wifi size={14} />
            <span>Connected</span>
          </div>
        </div>
      </div>

      {/* Prominent Day Selector Banner */}
      <div className="card" style={{
        backgroundColor: 'var(--color-brand-navy-900)',
        color: '#FFFFFF',
        marginBottom: '1rem',
        padding: '1rem 1.25rem',
        border: '2px solid var(--color-brand-yellow-500)',
        boxShadow: '0 4px 6px -1px rgba(10, 37, 64, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-brand-yellow-500)', fontWeight: 800 }}>
              Active Check-In Session:
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              Day {currentDay?.day_number || 1} — {formatDate(currentDay?.event_date)}
            </div>
            <div style={{ fontSize: '0.8rem', color: currentDay?.status === 'open' ? '#A7F3D0' : '#FECACA', fontWeight: 600 }}>
              Status: {currentDay?.status?.toUpperCase()}
            </div>
          </div>

          {event.days?.length > 1 && (
            <select
              className="form-select"
              style={{
                width: 'auto',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontSize: '0.85rem',
                minHeight: '38px'
              }}
              value={selectedDayId}
              onChange={(e) => {
                setSelectedDayId(e.target.value)
                setScanResult(null)
              }}
            >
              {event.days.map(d => (
                <option key={d.id} value={d.id} style={{ color: '#000000' }}>
                  Day {d.day_number} ({formatDate(d.event_date)}) — {d.status}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('camera')
          }}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: activeTab === 'camera' ? 'var(--color-brand-navy-900)' : '#FFFFFF',
            color: activeTab === 'camera' ? '#FFFFFF' : 'var(--color-brand-navy-900)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Camera size={18} />
          <span>Camera Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => {
            stopCamera()
            setActiveTab('manual')
          }}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: activeTab === 'manual' ? 'var(--color-brand-navy-900)' : '#FFFFFF',
            color: activeTab === 'manual' ? '#FFFFFF' : 'var(--color-brand-navy-900)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Search size={18} />
          <span>Manual Lookup</span>
        </button>
      </div>

      {/* Camera View Mode */}
      {activeTab === 'camera' && (
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          {cameraError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              textAlign: 'left'
            }}>
              <AlertCircle size={20} />
              <span>{cameraError}</span>
            </div>
          )}

          {/* HTML5 QR Code Container */}
          <div
            id="qr-reader"
            style={{
              width: '100%',
              minHeight: isScanning ? '320px' : '0px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: isScanning ? '#000000' : 'transparent',
              marginBottom: '1rem'
            }}
          />

          {!isScanning ? (
            <Button
              variant="primary"
              size="lg"
              onClick={startCamera}
              style={{ width: '100%', padding: '1rem' }}
            >
              <Camera size={22} />
              <span>Activate Smartphone Camera</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={stopCamera}
              style={{ width: '100%' }}
            >
              <StopCircle size={18} />
              <span>Stop Camera</span>
            </Button>
          )}

          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
            Position the attendee's digital phone pass or printed QR card in the viewfinder.
          </p>
        </div>
      )}

      {/* Manual Search Mode */}
      {activeTab === 'manual' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search attendee by full name or phone number..."
              style={{ paddingLeft: '2.5rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {searchQuery.trim() && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
              {filteredRegistrations.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.875rem' }}>
                  No matching attendee records found.
                </p>
              ) : (
                filteredRegistrations.map(r => {
                  const att = r.attendee
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        background: '#FFFFFF'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-brand-navy-900)' }}>
                          {att.first_name} {att.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {att.classification?.toUpperCase()} • {att.contact_number || 'No contact'}
                        </div>
                      </div>

                      <Button
                        variant="gold"
                        size="sm"
                        loading={manualLoadingId === r.id}
                        onClick={() => handleManualCheckIn(r.id)}
                      >
                        <UserCheck size={14} />
                        <span>Check In</span>
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Scan Outcome Card */}
      <ScanResult
        result={scanResult}
        onDismiss={() => setScanResult(null)}
      />
    </div>
  )
}
