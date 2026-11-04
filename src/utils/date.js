/**
 * Date and Time utilities for Berean Event Check-In
 *
 * All "today" calculations are pinned to the church's timezone (Asia/Manila).
 * Using `new Date().toISOString()` would return the UTC date, which is
 * *yesterday* between 12:00 AM and 7:59 AM Philippine time.
 */

export const APP_TIMEZONE = 'Asia/Manila'

/**
 * Today's date as YYYY-MM-DD in the church timezone.
 * @param {Date} [now]
 * @returns {string}
 */
export function todayLocal(now = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
}

/**
 * Format an ISO string or Date object to readable date (e.g. Oct 14, 2026)
 * Date-only strings (YYYY-MM-DD) are treated as calendar dates (no timezone shift).
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return '—'
  const isDateOnly = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return String(dateInput)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: isDateOnly ? 'UTC' : APP_TIMEZONE
  }).format(date)
}

/**
 * Format time string (e.g. 08:30:00 -> 8:30 AM)
 * @param {string} timeString
 * @returns {string}
 */
export function formatTime(timeString) {
  if (!timeString) return '—'
  const [hours, minutes] = timeString.split(':')
  if (!hours) return timeString
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const formattedHours = h % 12 || 12
  return `${formattedHours}:${minutes} ${ampm}`
}

/**
 * Format the clock time of an ISO timestamp (e.g. 2026-11-04T00:42:00Z -> 8:42 AM)
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatClockTime(dateInput) {
  if (!dateInput) return '—'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: APP_TIMEZONE
  }).format(date)
}

/**
 * Format date & time together (e.g. Oct 14, 2026, 8:45 AM)
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '—'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return String(dateInput)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: APP_TIMEZONE
  }).format(date)
}

/**
 * Human friendly "time ago" (e.g. "12s ago", "3m ago")
 * @param {number|Date|string} since
 * @param {number} [now]
 */
export function timeAgo(since, now = Date.now()) {
  if (!since) return '—'
  const diff = Math.max(0, Math.round((now - new Date(since).getTime()) / 1000))
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

/**
 * Calculate difference in days between two dates inclusive
 * @param {string|Date} start
 * @param {string|Date} end
 * @returns {number}
 */
export function getDaysCount(start, end) {
  if (!start || !end) return 1
  const s = new Date(start)
  const e = new Date(end)
  const diffTime = Math.abs(e - s)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Pick the best default event day: today's day, else the open day, else the first day.
 * @param {Array<{id:string, event_date:string, status:string}>} days
 */
export function pickDefaultDay(days = []) {
  if (!days.length) return null
  const today = todayLocal()
  return (
    days.find(d => d.event_date === today) ||
    days.find(d => d.status === 'open') ||
    days[0]
  )
}
