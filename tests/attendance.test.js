import { describe, it, expect, beforeEach } from 'vitest'
import { attendanceService } from '../src/features/attendance/attendanceService'
import { resetStore, getStore } from '../src/lib/mockStore'

describe('Berean Event Check-In Engine', () => {
  beforeEach(() => {
    resetStore()
  })

  it('successfully checks in a registered and eligible attendee', async () => {
    const store = getStore()
    const cred = store.qr_credentials.find(q => q.registration_id === 'reg-1')

    const res = await attendanceService.verifyAndCheckin(cred.payload, 'day-1')

    expect(res.success).toBe(true)
    expect(res.status).toBe('success')
    expect(res.attendee_name).toContain('Benjamin Santos')
    expect(res.total_confirmed_today).toBe(1)
  })

  it('strictly prevents duplicate check-in on the same event day', async () => {
    const store = getStore()
    const cred = store.qr_credentials.find(q => q.registration_id === 'reg-1')

    // First scan succeeds
    const firstScan = await attendanceService.verifyAndCheckin(cred.payload, 'day-1')
    expect(firstScan.success).toBe(true)

    // Second scan on the same day is rejected as duplicate
    const secondScan = await attendanceService.verifyAndCheckin(cred.payload, 'day-1')
    expect(secondScan.success).toBe(false)
    expect(secondScan.status).toBe('already_checked_in')
    expect(secondScan.message).toContain('Already checked in today')
  })

  it('allows the same QR code to check in on a different eligible event day without deleting previous records', async () => {
    const store = getStore()
    const cred = store.qr_credentials.find(q => q.registration_id === 'reg-1')

    // Check in on Day 1
    const day1Scan = await attendanceService.verifyAndCheckin(cred.payload, 'day-1')
    expect(day1Scan.success).toBe(true)

    // Open Day 2 for testing
    const day2 = store.event_days.find(d => d.id === 'day-2')
    day2.status = 'open'

    // Check in on Day 2 with the exact same QR credential
    const day2Scan = await attendanceService.verifyAndCheckin(cred.payload, 'day-2')
    expect(day2Scan.success).toBe(true)
    expect(day2Scan.day_number).toBe(2)

    // Verify Day 1 attendance record was NOT deleted
    const updatedStore = getStore()
    const day1Records = updatedStore.attendance_records.filter(a => a.event_day_id === 'day-1')
    const day2Records = updatedStore.attendance_records.filter(a => a.event_day_id === 'day-2')

    expect(day1Records.length).toBe(1)
    expect(day2Records.length).toBe(1)
  })

  it('rejects check-in when event day is not open', async () => {
    const store = getStore()
    const cred = store.qr_credentials.find(q => q.registration_id === 'reg-1')

    // Day 2 is scheduled (not open) by default
    const res = await attendanceService.verifyAndCheckin(cred.payload, 'day-2')
    expect(res.success).toBe(false)
    expect(res.status).toBe('day_not_open')
  })

  it('rejects malformed or invalid QR payloads', async () => {
    const res = await attendanceService.verifyAndCheckin('INVALID:PAYLOAD:123', 'day-1')
    expect(res.success).toBe(false)
    expect(res.status).toBe('invalid_format')
  })

  it('enforces payment-required policy when enabled', async () => {
    const store = getStore()
    const event = store.events[0]
    event.require_payment_before_checkin = true

    // reg-3 is unpaid
    const credUnpaid = store.qr_credentials.find(q => q.registration_id === 'reg-3')
    const res = await attendanceService.verifyAndCheckin(credUnpaid.payload, 'day-1')

    expect(res.success).toBe(false)
    expect(res.status).toBe('payment_required')
  })
})
