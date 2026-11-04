import { describe, it, expect } from 'vitest'
import { can, getHomeRoute, PERMISSIONS } from '../src/utils/permissions'
import { todayLocal, pickDefaultDay, formatDate, timeAgo } from '../src/utils/date'
import { isValidPhMobile, generateTempPassword } from '../src/utils/validation'

describe('Role permissions & home routing', () => {
  it('sends only admins to the admin dashboard', () => {
    expect(getHomeRoute('admin')).toBe('/dashboard')
    for (const role of ['registrar', 'usher', 'kitchen']) {
      expect(getHomeRoute(role)).toBe('/events')
      expect(can(role, 'dashboard')).toBe(false)
    }
  })

  it('never links a role to a page it cannot open', () => {
    expect(can('usher', 'print')).toBe(false)
    expect(can('usher', 'scan')).toBe(true)
    expect(can('kitchen', 'attendance')).toBe(false)
    expect(can('kitchen', 'kitchen')).toBe(true)
    expect(can('registrar', 'payments')).toBe(true)
    expect(can(null, 'events')).toBe(false)
    expect(can('admin', 'unknown-permission')).toBe(false)
  })

  it('grants admin every permission', () => {
    Object.keys(PERMISSIONS).forEach(p => expect(can('admin', p)).toBe(true))
  })
})

describe('Timezone-safe dates (Asia/Manila)', () => {
  it('returns the Manila calendar date, not the UTC date, early in the morning', () => {
    // 2026-11-04 07:30 in Manila == 2026-11-03 23:30 UTC
    const earlyMorning = new Date('2026-11-03T23:30:00Z')
    expect(earlyMorning.toISOString().split('T')[0]).toBe('2026-11-03')
    expect(todayLocal(earlyMorning)).toBe('2026-11-04')
  })

  it('formats date-only strings without shifting the day', () => {
    expect(formatDate('2026-11-04')).toBe('Nov 4, 2026')
  })

  it("prefers today's event day, then the open day, then the first day", () => {
    const today = todayLocal()
    const days = [
      { id: 'a', event_date: '2000-01-01', status: 'open' },
      { id: 'b', event_date: today, status: 'scheduled' }
    ]
    expect(pickDefaultDay(days).id).toBe('b')
    expect(pickDefaultDay([{ id: 'x', event_date: '2000-01-01', status: 'closed' }, { id: 'y', event_date: '2000-01-02', status: 'open' }]).id).toBe('y')
    expect(pickDefaultDay([])).toBe(null)
  })

  it('formats relative times', () => {
    const now = Date.now()
    expect(timeAgo(now - 12000, now)).toBe('12s ago')
    expect(timeAgo(now - 180000, now)).toBe('3m ago')
  })
})

describe('Form validation helpers', () => {
  it('accepts common PH mobile formats', () => {
    ['09171234567', '0917-123-4567', '0917 123 4567', '+639171234567', '639171234567', ''].forEach(v =>
      expect(isValidPhMobile(v)).toBe(true)
    )
  })

  it('rejects invalid numbers', () => {
    ['12345', '0817-123-4567', '0917-123-456', 'abc'].forEach(v =>
      expect(isValidPhMobile(v)).toBe(false)
    )
  })

  it('generates readable temporary passwords', () => {
    const pwd = generateTempPassword()
    expect(pwd).toHaveLength(10)
    expect(pwd).not.toMatch(/[O0Il1]/)
  })
})
