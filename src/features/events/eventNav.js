import {
  Users,
  CalendarDays,
  QrCode,
  ScanLine,
  CheckCircle2,
  DollarSign,
  UtensilsCrossed,
  FileSpreadsheet
} from 'lucide-react'
import { can } from '../../utils/permissions'

const ITEMS = [
  { key: 'attendees', label: 'Attendees', sidebarLabel: 'Attendee Registration', icon: Users, permission: 'attendees' },
  { key: 'days', label: 'Schedule', sidebarLabel: 'Daily Schedule', icon: CalendarDays, permission: 'schedule' },
  { key: 'scan', label: 'Scan', sidebarLabel: 'Camera Check-In', icon: ScanLine, permission: 'scan' },
  { key: 'attendance', label: 'Attendance', sidebarLabel: 'Daily Attendance', icon: CheckCircle2, permission: 'attendance' },
  { key: 'print', label: 'Badges', sidebarLabel: 'Print QR Badges', icon: QrCode, permission: 'print' },
  { key: 'payments', label: 'Payments', sidebarLabel: 'Payments & Fees', icon: DollarSign, permission: 'payments', requiresFee: true },
  { key: 'kitchen', label: 'Kitchen', sidebarLabel: 'Kitchen Headcount', icon: UtensilsCrossed, permission: 'kitchen' },
  { key: 'reports', label: 'Reports', sidebarLabel: 'Reports & Export', icon: FileSpreadsheet, permission: 'reports' }
]

export const EVENT_SECTION_LABELS = Object.fromEntries(ITEMS.map(i => [i.key, i.label]))

/**
 * Event-scoped navigation filtered by role (and hides Payments for free events).
 * @param {string} eventId
 * @param {string|null} role
 * @param {object|null} event
 */
export function getEventNavItems(eventId, role, event) {
  return ITEMS
    .filter(item => can(role, item.permission))
    .filter(item => !item.requiresFee || !event || event.has_registration_fee)
    .map(item => ({
      ...item,
      path: `/events/${eventId}/${item.key}`,
      label: item.sidebarLabel,
      tabLabel: item.label
    }))
}
