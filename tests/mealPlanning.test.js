import { describe, it, expect, beforeEach } from 'vitest'
import { dashboardService } from '../src/features/dashboard/dashboardService'
import { resetStore, getStore } from '../src/lib/mockStore'

describe('Kitchen Meal Planning Calculator', () => {
  beforeEach(() => {
    resetStore()
  })

  it('calculates the exact master prompt example: 200 expected + 10 walk-ins + 5% buffer = 221 meals', async () => {
    const store = getStore()
    const day = store.event_days[0]
    const event = store.events[0]

    // Setup mock values according to Section 15
    day.expected_walk_ins = 10
    day.meal_buffer_percentage = 5.00
    event.meals_per_attendee = 1.00

    // Set exactly 200 expected attendees
    store.event_day_registrations = []
    for (let i = 0; i < 200; i++) {
      store.event_day_registrations.push({
        id: `edr-test-${i}`,
        event_day_id: day.id,
        registration_id: `reg-test-${i}`,
        attendance_expected: true
      })
    }

    const headcount = await dashboardService.getKitchenHeadcount(day.id)

    expect(headcount.expected_today).toBe(200)
    expect(headcount.expected_walk_ins).toBe(10)
    expect(headcount.meal_buffer_percentage).toBe(5.00)
    // (200 + 10) * 1.05 = 220.5 -> CEIL = 221
    expect(headcount.suggested_meal_quantity).toBe(221)
  })

  it('never carries past days check-ins into today headcount', async () => {
    const store = getStore()
    // Add check-ins on Day 1
    store.attendance_records.push({
      id: 'att-old-1',
      registration_id: 'reg-1',
      event_day_id: 'day-1',
      checked_in_at: new Date().toISOString()
    })

    // Day 2 has 0 check-ins
    const day2Headcount = await dashboardService.getKitchenHeadcount('day-2')
    expect(day2Headcount.confirmed_today).toBe(0)
  })
})
