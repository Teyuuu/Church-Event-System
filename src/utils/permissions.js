/**
 * Single source of truth for role-based access.
 * Used by routes (ProtectedRoute), navigation (Sidebar / event tabs) and in-page actions,
 * so a link is never shown to a role that would hit "Access Restricted".
 */

export const ROLES = ['admin', 'registrar', 'usher', 'kitchen']

export const PERMISSIONS = {
  dashboard: ['admin'],
  events: ['admin', 'registrar', 'usher', 'kitchen'],
  manageEvents: ['admin'],
  schedule: ['admin', 'registrar', 'usher', 'kitchen'],
  manageSchedule: ['admin'],
  attendees: ['admin', 'registrar', 'usher'],
  register: ['admin', 'registrar'],
  print: ['admin', 'registrar'],
  scan: ['admin', 'usher'],
  attendance: ['admin', 'registrar', 'usher'],
  payments: ['admin', 'registrar'],
  kitchen: ['admin', 'kitchen'],
  reports: ['admin'],
  accounts: ['admin'],
  audit: ['admin']
}

/**
 * @param {string|null} role
 * @param {keyof typeof PERMISSIONS} permission
 */
export function can(role, permission) {
  const allowed = PERMISSIONS[permission]
  if (!allowed) return false
  return Boolean(role) && allowed.includes(role)
}

/**
 * Default landing page per role (static fallback; HomeRedirect may refine it
 * to an event-specific page such as the scanner of today's open event).
 */
export function getHomeRoute(role) {
  if (role === 'admin') return '/dashboard'
  return '/events'
}
