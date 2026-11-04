import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { attendeeService } from '../attendees/attendeeService'
import { attendanceService } from './attendanceService'
import { ScanResult, getResultTone } from './ScanResult'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Tabs } from '../../components/ui/Tabs'
import { SearchInput } from '../../components/ui/SearchInput'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { formatDate, formatClockTime, pickDefaultDay, todayLocal } from '../../utils/date'
import {
  Camera,
  Search,
  UserCheck,
  StopCircle,
  Keyboard,
  Wifi,
  WifiOff,
  CheckCircle2,
  SwitchCamera
} from 'lucide-react'

const CAMERA_PREF_KEY = 'berean_scanner_camera_id'
const AUTO_DISMISS_MS = { success: 2500, warning: 4000, danger: 4500 }

/* ---------- Audio + haptic feedback (one shared AudioContext) ---------- */
let sharedAudioCtx = null
function getAudioCtx() {
  try {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      sharedAudioCtx = new Ctx()
    }
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume()
    return sharedAudioCtx
  } catch {
    return null
  }
}

function playTone(tone) {
  const ctx = getAudioCtx()
  const pattern = tone === 'success'
    ? [{ f: 880, d: 0.12 }]
    : tone === 'warning'
      ? [{ f: 520, d: 0.12 }, { f: 520, d: 0.12 }]
      : [{ f: 260, d: 0.18 }, { f: 220, d: 0.25 }]

  if (ctx) {
    let t = ctx.currentTime
    pattern.forEach(({ f, d }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = tone === 'success' ? 'sine' : 'square'
      osc.frequency.setValueAtTime(f, t)
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + d)
      t += d + 0.06
    })
  }

  if (navigator.vibrate) {
    navigator.vibrate(tone === 'success' ? 80 : tone === 'warning' ? [80, 60, 80] : [200, 80, 200])
  }
}

function readPref(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function writePref(key, value) {
  try { localStorage.setItem(key, value) } catch { /* ignore */ }
}

export function ScannerPage() {
  const { event } = useOutletContext()
  const eventId = event.id
  const online = useOnlineStatus()

  const defaultDay = useMemo(() => pickDefaultDay(event.days || []), [event.days])
  const [selectedDayId, setSelectedDayId] = useState(defaultDay?.id || '')
  const [activeTab, setActiveTab] = useState('camera') // camera | manual | device

  // Camera
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameras, setCameras] = useState([])
  const [cameraId, setCameraId] = useState(() => readPref(CAMERA_PREF_KEY) || '')

  // Results
  const [scanResult, setScanResult] = useState(null)
  const [lastRequestFailed, setLastRequestFailed] = useState(false)

  // Manual lookup
  const [searchQuery, setSearchQuery] = useState('')
  const [registrations, setRegistrations] = useState([])
  const [checkedIn, setCheckedIn] = useState(new Map()) // registration_id -> checked_in_at
  const [manualLoadingId, setManualLoadingId] = useState(null)

  // Barcode device mode
  const [deviceInput, setDeviceInput] = useState('')
  const deviceInputRef = useRef(null)

  // Refs read by long-lived camera callbacks (avoid stale closures)
  const html5QrCodeRef = useRef(null)
  const selectedDayIdRef = useRef(selectedDayId)
  const processingRef = useRef(false)
  const lastScanRef = useRef({ code: '', at: 0 })
  const dismissTimerRef = useRef(null)

  selectedDayIdRef.current = selectedDayId
  const currentDay = event.days?.find(d => d.id === selectedDayId)
  const isToday = currentDay?.event_date === todayLocal()
  const isOpen = currentDay?.status === 'open'

  /* ---------- Data ---------- */
  const loadCheckedIn = useCallback(async (dayId) => {
    if (!dayId) return
    try {
      const records = await attendanceService.getDailyAttendance(dayId)
      const map = new Map()
      records.forEach(r => { if (r.registration_id) map.set(r.registration_id, r.checked_in_at) })
      setCheckedIn(map)
    } catch {
      // Non-critical: lookup still works without status badges
    }
  }, [])

  useEffect(() => {
    attendeeService.getEventRegistrations(eventId)
      .then(setRegistrations)
      .catch(() => setRegistrations([]))
  }, [eventId])

  useEffect(() => {
    loadCheckedIn(selectedDayId)
  }, [selectedDayId, loadCheckedIn])

  /* ---------- Result display ---------- */
  const showResult = useCallback((result) => {
    setScanResult(result)
    const tone = getResultTone(result)
    playTone(tone)
    clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = setTimeout(() => setScanResult(null), AUTO_DISMISS_MS[tone])
    if (result?.success || result?.status === 'already_checked_in') {
      loadCheckedIn(selectedDayIdRef.current)
    }
  }, [loadCheckedIn])

  const dismissResult = () => {
    clearTimeout(dismissTimerRef.current)
    setScanResult(null)
    if (activeTab === 'device') deviceInputRef.current?.focus()
  }

  useEffect(() => () => clearTimeout(dismissTimerRef.current), [])

  // In lookup / device modes the result card renders below the list: bring it into view
  useEffect(() => {
    if (!scanResult || (activeTab === 'camera' && isScanning)) return
    document.querySelector('.scan-result-card')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [scanResult, activeTab, isScanning])

  /* ---------- Core check-in (always uses the CURRENT selected day) ---------- */
  const processPayload = useCallback(async (decodedText) => {
    const text = (decodedText || '').trim()
    if (!text || processingRef.current) return

    const now = Date.now()
    if (text === lastScanRef.current.code && now - lastScanRef.current.at < 3000) return
    lastScanRef.current = { code: text, at: now }

    processingRef.current = true
    try {
      const result = await attendanceService.verifyAndCheckin(text, selectedDayIdRef.current)
      setLastRequestFailed(false)
      showResult(result)
    } catch (err) {
      setLastRequestFailed(true)
      showResult({ success: false, status: 'error', message: err.message || 'Check-in request failed. Check the connection.' })
    } finally {
      processingRef.current = false
    }
  }, [showResult])

  const processPayloadRef = useRef(processPayload)
  processPayloadRef.current = processPayload

  /* ---------- Camera lifecycle ---------- */
  const stopCamera = useCallback(async () => {
    const scanner = html5QrCodeRef.current
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop()
      } catch (err) {
        console.warn('Error stopping camera:', err)
      }
      try { scanner.clear() } catch { /* element may already be gone */ }
      html5QrCodeRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Always stop the camera when leaving the page
  useEffect(() => () => {
    const scanner = html5QrCodeRef.current
    if (scanner) {
      try {
        if (scanner.isScanning) scanner.stop().catch(() => {})
      } catch { /* ignore */ }
      html5QrCodeRef.current = null
    }
  }, [])

  const startCamera = async (preferredId = cameraId) => {
    setCameraError('')
    setScanResult(null)
    getAudioCtx() // unlock audio during the user gesture

    try {
      if (html5QrCodeRef.current) await stopCamera()
      html5QrCodeRef.current = new Html5Qrcode('qr-reader')

      let list = cameras
      if (list.length === 0) {
        try {
          list = await Html5Qrcode.getCameras()
          setCameras(list || [])
        } catch {
          list = []
        }
      }

      const validId = preferredId && list.some(c => c.id === preferredId) ? preferredId : null
      const source = validId ? validId : { facingMode: 'environment' }

      await html5QrCodeRef.current.start(
        source,
        { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s } } },
        (text) => processPayloadRef.current(text),
        () => {}
      )
      setIsScanning(true)
    } catch (err) {
      console.error('Failed to start camera:', err)
      html5QrCodeRef.current = null
      setCameraError('Camera access failed. Allow camera permission in your browser and make sure the site is opened over HTTPS. You can also use Manual Lookup.')
      setIsScanning(false)
    }
  }

  const handleCameraChange = async (id) => {
    setCameraId(id)
    writePref(CAMERA_PREF_KEY, id)
    if (isScanning) await startCamera(id)
  }

  const switchCamera = async () => {
    if (cameras.length < 2) return
    const idx = cameras.findIndex(c => c.id === cameraId)
    const next = cameras[(idx + 1) % cameras.length]
    await handleCameraChange(next.id)
  }

  const handleTabChange = async (tab) => {
    if (tab !== 'camera') await stopCamera()
    setScanResult(null)
    setActiveTab(tab)
    if (tab === 'device') setTimeout(() => deviceInputRef.current?.focus(), 50)
  }

  /* ---------- Manual check-in ---------- */
  const handleManualCheckIn = async (regId) => {
    getAudioCtx()
    setManualLoadingId(regId)
    try {
      const result = await attendanceService.manualCheckin(regId, selectedDayId)
      setLastRequestFailed(false)
      showResult(result)
    } catch (err) {
      setLastRequestFailed(true)
      showResult({ success: false, status: 'error', message: err.message || 'Manual check-in failed.' })
    } finally {
      setManualLoadingId(null)
    }
  }

  // Word-order independent search ("dela cruz juan" matches "Juan Dela Cruz")
  const filteredRegistrations = useMemo(() => {
    const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return []
    return registrations.filter(r => {
      const att = r.attendee
      if (!att) return false
      const haystack = `${att.first_name} ${att.middle_name || ''} ${att.last_name} ${att.contact_number || ''} ${att.households?.family_name || ''}`.toLowerCase()
      return tokens.every(t => haystack.includes(t))
    }).slice(0, 30)
  }, [registrations, searchQuery])

  /* ---------- Barcode device ---------- */
  const handleDeviceSubmit = async (e) => {
    e.preventDefault()
    getAudioCtx()
    const value = deviceInput
    setDeviceInput('')
    lastScanRef.current = { code: '', at: 0 } // devices intentionally re-scan
    await processPayload(value)
    deviceInputRef.current?.focus()
  }

  /* ---------- Render ---------- */
  const connectionTone = !online ? 'is-offline' : lastRequestFailed ? 'is-stale' : 'is-online'
  const connectionLabel = !online ? 'Offline' : lastRequestFailed ? 'Connection issue' : 'Online'

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Day selector banner */}
      <div className="card on-dark" style={{
        backgroundColor: 'var(--color-brand-navy-900)',
        color: '#FFFFFF',
        marginBottom: '1rem',
        padding: '1rem 1.25rem',
        border: '2px solid var(--color-brand-yellow-500)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-brand-yellow-500)', fontWeight: 800 }}>
              Checking in for
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {currentDay ? `Day ${currentDay.day_number} — ${formatDate(currentDay.event_date)}` : 'No event day'}
            </div>
            <div style={{ fontSize: '0.85rem', color: isOpen ? '#A7F3D0' : '#FECACA', fontWeight: 700 }}>
              {isOpen ? 'Check-in is OPEN' : `Check-in is ${(currentDay?.status || 'unavailable').toUpperCase()}`}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`live-indicator ${connectionTone}`} role="status">
              {online ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
              {connectionLabel}
            </span>
            {event.days?.length > 1 && (
              <>
                <label htmlFor="scanner-day" className="sr-only">Event day</label>
                <select
                  id="scanner-day"
                  className="form-select"
                  style={{ width: 'auto', minHeight: '40px', fontSize: '0.9rem' }}
                  value={selectedDayId}
                  onChange={(e) => {
                    setSelectedDayId(e.target.value)
                    setScanResult(null)
                  }}
                >
                  {event.days.map(d => (
                    <option key={d.id} value={d.id}>
                      Day {d.day_number} ({formatDate(d.event_date)}) — {d.status}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {currentDay && !isOpen && (
        <Alert variant="error" title="Check-in is not open for this day">
          Scans will be rejected. Ask an administrator to open Day {currentDay.day_number} on the Schedule tab, or pick the correct day above.
        </Alert>
      )}
      {currentDay && isOpen && !isToday && (
        <Alert variant="warning" title="The selected day is not today">
          You are checking people in for {formatDate(currentDay.event_date)}. Make sure this is intended.
        </Alert>
      )}
      {!online && (
        <Alert variant="warning" title="You are offline">
          Check-ins cannot be verified until the connection returns.
        </Alert>
      )}

      {/* Mode tabs */}
      <div style={{ marginBottom: '1rem' }}>
        <Tabs
          label="Check-in mode"
          fullWidth
          value={activeTab}
          onChange={handleTabChange}
          options={[
            { value: 'camera', label: 'Camera', icon: Camera },
            { value: 'manual', label: 'Name Lookup', icon: Search },
            { value: 'device', label: 'Scanner Device', icon: Keyboard }
          ]}
        />
      </div>

      {/* Camera mode */}
      {activeTab === 'camera' && (
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          {cameraError && <Alert variant="error" style={{ textAlign: 'left' }}>{cameraError}</Alert>}

          <div className="scanner-viewport" style={{ minHeight: isScanning ? '320px' : 0, background: isScanning ? '#000' : 'transparent' }}>
            <div id="qr-reader" style={{ width: '100%' }} />
            {isScanning && scanResult && (
              <ScanResult result={scanResult} variant="overlay" onDismiss={dismissResult} />
            )}
          </div>

          {!isScanning ? (
            <Button variant="primary" size="lg" block onClick={() => startCamera()}>
              <Camera size={22} />
              <span>Start Camera Scanner</span>
            </Button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={stopCamera} style={{ flex: 1 }}>
                <StopCircle size={18} />
                <span>Stop Camera</span>
              </Button>
              {cameras.length > 1 && (
                <Button variant="secondary" onClick={switchCamera} aria-label="Switch camera">
                  <SwitchCamera size={18} />
                  <span className="hide-sm">Switch</span>
                </Button>
              )}
            </div>
          )}

          {cameras.length > 1 && (
            <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
              <label htmlFor="scanner-camera" className="form-label" style={{ fontSize: '0.8rem' }}>Camera</label>
              <select
                id="scanner-camera"
                className="form-select"
                value={cameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
              >
                <option value="">Default (back camera)</option>
                {cameras.map(c => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
              </select>
            </div>
          )}

          <p className="text-muted" style={{ fontSize: '0.825rem', marginTop: '0.75rem' }}>
            Point the camera at the attendee&apos;s phone pass or printed QR card. Results appear on screen with a sound —
            one beep means checked in, two beeps mean already checked in, a low tone means denied.
          </p>
        </div>
      )}

      {/* Manual lookup mode */}
      {activeTab === 'manual' && (
        <div className="card" style={{ padding: '1rem' }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            label="Search attendee"
            placeholder="Type a name, family name or phone number…"
            autoFocus
          />

          {searchQuery.trim() && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredRegistrations.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.9rem' }}>
                  No matching attendee. Check the spelling, or register them at the desk.
                </p>
              ) : (
                filteredRegistrations.map(r => {
                  const att = r.attendee
                  const checkedAt = checkedIn.get(r.id)
                  return (
                    <div key={r.id} className="list-card" style={{ padding: '0.7rem 0.9rem' }}>
                      <div className="list-card-row" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-title">{att.first_name} {att.last_name}</div>
                          <div className="cell-sub">
                            {att.classification?.toUpperCase()} • {att.contact_number || 'No contact'}
                            {att.households?.family_name ? ` • ${att.households.family_name}` : ''}
                          </div>
                          {checkedAt && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 700, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={14} aria-hidden="true" /> Checked in at {formatClockTime(checkedAt)}
                            </div>
                          )}
                        </div>
                        <Button
                          variant={checkedAt ? 'secondary' : 'gold'}
                          size="sm"
                          loading={manualLoadingId === r.id}
                          loadingText="Checking…"
                          disabled={Boolean(checkedAt)}
                          onClick={() => handleManualCheckIn(r.id)}
                          aria-label={checkedAt ? `${att.first_name} ${att.last_name} already checked in` : `Check in ${att.first_name} ${att.last_name}`}
                        >
                          <UserCheck size={14} />
                          <span>{checkedAt ? 'Done' : 'Check In'}</span>
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* USB / Bluetooth barcode scanner mode */}
      {activeTab === 'device' && (
        <div className="card" style={{ padding: '1rem' }}>
          <form onSubmit={handleDeviceSubmit}>
            <label htmlFor="device-input" className="form-label">Scan with a USB or Bluetooth barcode scanner</label>
            <input
              id="device-input"
              ref={deviceInputRef}
              className="form-control"
              value={deviceInput}
              onChange={(e) => setDeviceInput(e.target.value)}
              onBlur={() => {
                // Keep focus so the next scan is captured
                setTimeout(() => {
                  if (activeTab === 'device' && document.activeElement === document.body) deviceInputRef.current?.focus()
                }, 100)
              }}
              autoComplete="off"
              autoFocus
              placeholder="Waiting for scan…"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            />
            <p className="form-text">
              Keep this box focused. Most scanners type the code and press Enter automatically.
            </p>
          </form>
        </div>
      )}

      {/* Result card for non-camera modes (and camera when stopped) */}
      {scanResult && !(activeTab === 'camera' && isScanning) && (
        <ScanResult result={scanResult} onDismiss={dismissResult} />
      )}
    </div>
  )
}
