/**
 * Date and Time utilities for Berean Event Check-In
 */

/**
 * Format an ISO string or Date object to readable date (e.g. Oct 14, 2026)
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return '—'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return String(dateInput)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
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
    hour12: true
  }).format(date)
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
