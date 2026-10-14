import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore } from '../../lib/mockStore'

export const dashboardService = {
  /**
   * Get high-level overview metrics for Admin Dashboard
   */
  async getAdminMetrics(eventId = null) {
    const store = getStore()
    const targetEvents = eventId ? store.events.filter(e => e.id === eventId) : store.events

    let totalRegistrations = 0
    let confirmedToday = 0
    let totalRevenue = 0

    const todayDateStr = new Date().toISOString().split('T')[0]
    const todayDays = store.event_days.filter(d => d.event_date === todayDateStr)
    const todayDayIds = todayDays.map(d => d.id)

    if (eventId) {
      totalRegistrations = store.event_registrations.filter(r => r.event_id === eventId).length
      confirmedToday = store.attendance_records.filter(
        a => todayDayIds.includes(a.event_day_id) && 
        store.event_registrations.find(r => r.id === a.registration_id)?.event_id === eventId
      ).length
      totalRevenue = store.payments
        .filter(p => {
          const reg = store.event_registrations.find(r => r.id === p.registration_id)
          return reg?.event_id === eventId && p.payment_status === 'completed'
        })
        .reduce((sum, p) => sum + p.amount, 0)
    } else {
      totalRegistrations = store.event_registrations.length
      confirmedToday = store.attendance_records.filter(a => todayDayIds.includes(a.event_day_id)).length
      totalRevenue = store.payments
        .filter(p => p.payment_status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)
    }

    return {
      totalEvents: targetEvents.length,
      totalRegistrations,
      confirmedToday,
      totalRevenue,
      recentCheckins: store.attendance_records
        .slice(-5)
        .reverse()
        .map(a => {
          const reg = store.event_registrations.find(r => r.id === a.registration_id)
          const att = store.attendees.find(at => at.id === reg?.attendee_id)
          const day = store.event_days.find(d => d.id === a.event_day_id)
          return {
            id: a.id,
            name: att ? `${att.first_name} ${att.last_name}` : 'Unknown',
            checked_in_at: a.checked_in_at,
            day_number: day?.day_number || 1
          }
        })
    }
  },

  /**
   * Get Kitchen Headcount data (Zero PII exposed)
   * Formula: Suggested meal quantity = round up (expected + walk_ins) * (1 + buffer/100) * meals_per_attendee
   */
  async getKitchenHeadcount(eventDayId) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_kitchen_headcount', {
        p_event_day_id: eventDayId
      })
      if (error) throw error
      return data
    }

    const store = getStore()
    const day = store.event_days.find(d => d.id === eventDayId)
    if (!day) throw new Error('Event day not found')

    const event = store.events.find(e => e.id === day.event_id)

    // Expected attendees scheduled for this specific day
    const dayExpected = store.event_day_registrations.filter(
      r => r.event_day_id === eventDayId && r.attendance_expected
    ).length

    // Confirmed check-ins strictly for this day
    const confirmedToday = store.attendance_records.filter(
      a => a.event_day_id === eventDayId
    ).length

    const bufferPct = day.meal_buffer_percentage ?? event?.default_meal_buffer_percentage ?? 10.00
    const mealsPerAttendee = event?.meals_per_attendee ?? 1.00
    const walkIns = day.expected_walk_ins || 0

    // Core formula
    const estimatedAttendance = dayExpected + walkIns
    const suggestedMeals = Math.ceil(estimatedAttendance * (1 + bufferPct / 100.0) * mealsPerAttendee)
    const percentage = dayExpected > 0 ? Math.round((confirmedToday / dayExpected) * 1000) / 10 : 0

    return {
      success: true,
      event_id: day.event_id,
      event_name: event?.name || 'Berean Event',
      event_day_id: day.id,
      event_date: day.event_date,
      day_number: day.day_number,
      day_status: day.status,
      expected_today: dayExpected,
      confirmed_today: confirmedToday,
      remaining_expected: Math.max(0, dayExpected - confirmedToday),
      attendance_percentage: percentage,
      expected_walk_ins: walkIns,
      meal_buffer_percentage: bufferPct,
      meals_per_attendee: mealsPerAttendee,
      suggested_meal_quantity: suggestedMeals,
      last_updated: new Date().toISOString()
    }
  }
}
