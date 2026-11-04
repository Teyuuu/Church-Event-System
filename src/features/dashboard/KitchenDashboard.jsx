import React, { useCallback, useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { dashboardService } from './dashboardService'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatCard } from '../../components/ui/StatCard'
import { usePolling, useNow } from '../../hooks/usePolling'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { formatDate, pickDefaultDay, timeAgo } from '../../utils/date'
import { RefreshCw, Maximize2, Minimize2, CalendarX, UtensilsCrossed } from 'lucide-react'

const REFRESH_MS = 30000
const STALE_MS = 2 * REFRESH_MS + 5000

export function KitchenDashboard() {
  const { event } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const online = useOnlineStatus()
  const now = useNow(5000)

  const days = event.days || []
  const queryDayId = searchParams.get('dayId')
  const selectedDayId = (queryDayId && days.some(d => d.id === queryDayId))
    ? queryDayId
    : pickDefaultDay(days)?.id || ''

  const [headcount, setHeadcount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [tvMode, setTvMode] = useState(false)

  const loadHeadcount = useCallback(async ({ silent = false } = {}) => {
    if (!selectedDayId) {
      setLoading(false)
      return
    }
    if (silent) setRefreshing(true)
    setError('')
    try {
      const data = await dashboardService.getKitchenHeadcount(selectedDayId)
      setHeadcount(data)
      setLastUpdated(Date.now())
    } catch (err) {
      setError(err.message || 'Failed to refresh kitchen headcount')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedDayId])

  useEffect(() => {
    setLoading(true)
    loadHeadcount()
  }, [loadHeadcount])

  usePolling(() => loadHeadcount({ silent: true }), REFRESH_MS, Boolean(selectedDayId))

  // TV / wall-display mode: hide app chrome, try real fullscreen
  useEffect(() => {
    document.body.classList.toggle('tv-mode', tvMode)
    return () => document.body.classList.remove('tv-mode')
  }, [tvMode])

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setTvMode(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleTvMode = async () => {
    if (!tvMode) {
      setTvMode(true)
      try { await document.documentElement.requestFullscreen?.() } catch { /* not supported */ }
    } else {
      setTvMode(false)
      try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* ignore */ }
    }
  }

  if (days.length === 0) {
    return <EmptyState icon={CalendarX} title="No event days" description="This event has no scheduled days to plan meals for." />
  }
  if (loading && !headcount) return <LoadingState message="Loading kitchen headcount…" />

  const currentDay = days.find(d => d.id === selectedDayId)
  const isStale = lastUpdated && now - lastUpdated > STALE_MS
  const syncTone = !online ? 'is-offline' : (error || isStale) ? 'is-stale' : 'is-online'
  const syncLabel = !online
    ? 'Offline — showing last numbers'
    : error
      ? 'Refresh failed — retrying'
      : `Live · updated ${lastUpdated ? timeAgo(lastUpdated, now) : '—'}`
  // Use ?? so an intentional 0% buffer is displayed as 0, not replaced by a default
  const bufferPct = headcount?.meal_buffer_percentage ?? currentDay?.meal_buffer_percentage ?? event.default_meal_buffer_percentage ?? 10

  return (
    <div style={{ maxWidth: tvMode ? 'none' : '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UtensilsCrossed size={26} color="var(--color-brand-gold-600)" aria-hidden="true" />
          <div>
            <h2>Kitchen Headcount</h2>
            {tvMode && <p className="text-muted">{event.name}</p>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {days.length > 1 && (
            <>
              <label htmlFor="kitchen-day" className="sr-only">Event day</label>
              <select
                id="kitchen-day"
                className="form-select"
                style={{ width: 'auto', fontWeight: 700 }}
                value={selectedDayId}
                onChange={(e) => setSearchParams({ dayId: e.target.value }, { replace: true })}
              >
                {days.map(d => (
                  <option key={d.id} value={d.id}>
                    Day {d.day_number} ({formatDate(d.event_date)}) — {d.status}
                  </option>
                ))}
              </select>
            </>
          )}

          <span className={`live-indicator ${syncTone}`} role="status" aria-live="polite">
            <span className="live-dot" aria-hidden="true" />
            {syncLabel}
          </span>

          <Button variant="secondary" size="sm" onClick={() => loadHeadcount({ silent: true })} loading={refreshing} loadingText="Refreshing…">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
          <Button variant={tvMode ? 'primary' : 'secondary'} size="sm" onClick={toggleTvMode} aria-pressed={tvMode}>
            {tvMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{tvMode ? 'Exit TV Mode' : 'TV Mode'}</span>
          </Button>
        </div>
      </div>

      {error && headcount && (
        <Alert variant="warning">{error}. Showing the last successful numbers.</Alert>
      )}

      <div className="kitchen-hero on-dark">
        <span style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--color-brand-yellow-500)' }}>
          Suggested meals for Day {headcount?.day_number || currentDay?.day_number || 1}
          {currentDay ? ` · ${formatDate(currentDay.event_date)}` : ''}
        </span>

        <div className="kitchen-number" aria-live="polite">
          {headcount?.suggested_meal_quantity ?? '—'}
        </div>

        <p style={{ fontSize: '1.15rem', fontWeight: 700 }}>Meal Servings</p>

        <div style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.5rem 1.5rem',
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 222, 0, 0.3)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.9rem'
        }}>
          <span>Expected: <strong>{headcount?.expected_today ?? 0}</strong></span>
          <span>Walk-ins: <strong>+{headcount?.expected_walk_ins ?? 0}</strong></span>
          <span>Buffer: <strong style={{ color: 'var(--color-brand-yellow-500)' }}>{bufferPct}%</strong></span>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard title="Arrived Today" value={headcount?.confirmed_today ?? 0} tone="success" accent="var(--color-success)" subtitle="Already checked in" />
        <StatCard title="Not Yet Arrived" value={headcount?.remaining_expected ?? 0} tone="gold" accent="var(--color-brand-gold-500)" subtitle="Still expected today" />
        <StatCard title="Attendance Rate" value={`${headcount?.attendance_percentage ?? 0}%`} accent="var(--color-brand-navy-700)" subtitle={`Of Day ${headcount?.day_number || currentDay?.day_number || 1} expected`} />
        <StatCard title="Expected Walk-Ins" value={headcount?.expected_walk_ins ?? 0} accent="var(--color-text-light)" subtitle="Unregistered guests" />
      </div>

      {!tvMode && (
        <div className="card" style={{ background: 'var(--color-bg-base)', fontSize: '0.875rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.4rem' }}>How the estimate works</h3>
          <p className="text-muted" style={{ lineHeight: 1.6 }}>
            (Expected attendees + walk-ins) × meals per attendee, plus a {bufferPct}% safety buffer, rounded up.
            Each event day is calculated independently. This board refreshes automatically every 30 seconds.
          </p>
        </div>
      )}
    </div>
  )
}
