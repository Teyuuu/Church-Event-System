import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { dashboardService } from './dashboardService'
import { eventService } from '../events/eventService'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatDate, formatTime } from '../../utils/date'
import {
  UtensilsCrossed,
  Wifi,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Users
} from 'lucide-react'

export function KitchenDashboard() {
  const { eventId, eventDayId } = useParams()
  const [event, setEvent] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState(eventDayId || '')
  const [headcount, setHeadcount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // 1. Load Event and determine active Day
  useEffect(() => {
    async function initKitchen() {
      setLoading(true)
      try {
        const evt = await eventService.getEventById(eventId)
        setEvent(evt)

        const defaultDayId = eventDayId ||
          evt.days?.find(d => d.status === 'open')?.id ||
          evt.days?.[0]?.id

        if (defaultDayId) {
          setSelectedDayId(defaultDayId)
          await loadHeadcount(defaultDayId)
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize kitchen dashboard')
      } finally {
        setLoading(false)
      }
    }
    initKitchen()
  }, [eventId, eventDayId])

  const loadHeadcount = async (dayId) => {
    setRefreshing(true)
    setError('')
    try {
      const data = await dashboardService.getKitchenHeadcount(dayId)
      setHeadcount(data)
    } catch (err) {
      setError(err.message || 'Failed to refresh kitchen headcount')
    } finally {
      setRefreshing(false)
    }
  }

  const handleDayChange = (newDayId) => {
    setSelectedDayId(newDayId)
    loadHeadcount(newDayId)
  }

  if (loading) return <LoadingState message="Connecting to church kitchen live board..." />
  if (!event) return <div style={{ padding: '2rem', textAlign: 'center' }}>Event not found.</div>

  const currentDay = event.days?.find(d => d.id === selectedDayId)

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Bar with Connection and Last Refresh */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div>
          <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-brand-navy-800)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <ArrowLeft size={16} />
            <span>Event Directory</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UtensilsCrossed size={28} color="var(--color-brand-gold-600)" />
            <h1 style={{ fontSize: '1.6rem' }}>Kitchen Headcount Board</h1>
          </div>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            {event.name} — Meal Planning & Attendance Overview
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Day Switcher Dropdown */}
          {event.days?.length > 1 && (
            <select
              className="form-select"
              style={{ width: 'auto', fontWeight: 700 }}
              value={selectedDayId}
              onChange={(e) => handleDayChange(e.target.value)}
            >
              {event.days.map(d => (
                <option key={d.id} value={d.id}>
                  Day {d.day_number} ({formatDate(d.event_date)}) — {d.status.toUpperCase()}
                </option>
              ))}
            </select>
          )}

          {/* Connection badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            background: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <Wifi size={14} />
            <span>Live Sync</span>
          </div>

          <Button variant="secondary" size="sm" onClick={() => loadHeadcount(selectedDayId)} loading={refreshing}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          border: '1px solid #FDE68A'
        }}>
          <AlertTriangle size={18} />
          <span>Notice: {error} (Displaying cached headcount)</span>
        </div>
      )}

      {/* Main Focus: Suggested Meal Estimate Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #0A2540 0%, #103B6E 100%)',
        color: '#FFFFFF',
        padding: '2.5rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        border: '3px solid var(--color-brand-yellow-500)',
        marginBottom: '1.5rem',
        textAlign: 'center',
        boxShadow: '0 10px 25px -5px rgba(10, 37, 64, 0.3)'
      }}>
        <span style={{
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 800,
          color: 'var(--color-brand-yellow-500)'
        }}>
          Suggested Meal Preparation for Day {headcount?.day_number || currentDay?.day_number || 1}
        </span>

        {/* Large Readable Number in Vibrant Church Yellow */}
        <div style={{
          fontSize: '5.5rem',
          fontWeight: 900,
          lineHeight: 1.05,
          color: 'var(--color-brand-yellow-500)',
          margin: '0.5rem 0',
          textShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
        }}>
          {headcount?.suggested_meal_quantity ?? '—'}
        </div>

        <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
          Suggested Meal Servings
        </p>

        <div style={{
          display: 'inline-flex',
          gap: '1.5rem',
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 222, 0, 0.3)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.85rem'
        }}>
          <span>Expected: <strong>{headcount?.expected_today || 0}</strong></span>
          <span>Walk-In Buffer: <strong>+{headcount?.expected_walk_ins || 0}</strong></span>
          <span>Safety Buffer: <strong style={{ color: 'var(--color-brand-yellow-500)' }}>{headcount?.meal_buffer_percentage || 10}%</strong></span>
        </div>
      </div>

      {/* Real-Time Attendance Breakdown Metrics */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Confirmed Arrivals */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <span className="stat-title">Confirmed Arrived Today</span>
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
            {headcount?.confirmed_today ?? 0}
          </span>
          <span className="stat-subtitle">Already checked-in attendees</span>
        </div>

        {/* Remaining Expected */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-brand-gold-500)' }}>
          <span className="stat-title">Expected Not Yet Arrived</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-gold-600)' }}>
            {headcount?.remaining_expected ?? 0}
          </span>
          <span className="stat-subtitle">Still scheduled to arrive today</span>
        </div>

        {/* Attendance Rate */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-brand-navy-700)' }}>
          <span className="stat-title">Daily Attendance Rate</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-navy-900)' }}>
            {headcount?.attendance_percentage ?? 0}%
          </span>
          <span className="stat-subtitle">Of scheduled Day {headcount?.day_number || 1} attendees</span>
        </div>

        {/* Expected Walk-Ins */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-light)' }}>
          <span className="stat-title">Expected Walk-Ins</span>
          <span className="stat-value">
            {headcount?.expected_walk_ins ?? 0}
          </span>
          <span className="stat-subtitle">Configured unannounced guests</span>
        </div>
      </div>

      {/* Explanation Note for Volunteers */}
      <div className="card" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--color-brand-navy-900)' }}>
          Kitchen Meal Formula Guide
        </h4>
        <p className="text-muted" style={{ lineHeight: 1.6 }}>
          Suggested meals are calculated based on the day's scheduled attendance plus expected walk-ins, multiplied by the church meal buffer ({headcount?.meal_buffer_percentage || 10}%). Each event day resets independently without carrying over past days' check-ins.
        </p>
        <div style={{ marginTop: '0.5rem', color: 'var(--color-text-light)', fontSize: '0.775rem' }}>
          Last refreshed: {headcount?.last_updated ? formatTime(new Date(headcount.last_updated).toTimeString().split(' ')[0]) : 'Just now'}
        </div>
      </div>
    </div>
  )
}
