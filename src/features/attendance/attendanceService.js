import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore, saveStore } from '../../lib/mockStore'

export const attendanceService = {
  /**
   * Validate QR payload and record atomic check-in
   */
  async verifyAndCheckin(qrPayload, eventDayId) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('verify_and_checkin', {
        p_qr_payload: qrPayload,
        p_event_day_id: eventDayId
      })
      if (error) {
        return {
          success: false,
          status: 'error',
          message: error.message || 'Database error processing check-in.'
        }
      }
      return data
    }

    // Mock store atomic check-in implementation
    const store = getStore()
    const parts = (qrPayload || '').split(':')
    if (parts.length < 3 || parts[0] !== 'BEREAN') {
      return {
        success: false,
        status: 'invalid_format',
        message: 'Invalid QR code format. Not a Berean Church event credential.'
      }
    }

    const registrationId = parts[1]
    const rawToken = parts[2]

    // 1. Validate QR Credential
    const cred = store.qr_credentials.find(q => q.registration_id === registrationId)
    if (!cred || (cred.token_raw && cred.token_raw !== rawToken)) {
      return {
        success: false,
        status: 'invalid_credential',
        message: 'QR credential does not match or is invalid.'
      }
    }

    if (!cred.is_active) {
      return {
        success: false,
        status: 'revoked',
        message: `This QR credential has been revoked (${cred.revoked_reason || 'Administrative action'}).`
      }
    }

    // 2. Validate Event Day
    const day = store.event_days.find(d => d.id === eventDayId)
    if (!day) {
      return {
        success: false,
        status: 'invalid_day',
        message: 'Selected event day was not found.'
      }
    }

    if (day.status !== 'open') {
      return {
        success: false,
        status: 'day_not_open',
        message: `Event day is currently ${day.status.toUpperCase()}. Check-in is not permitted.`
      }
    }

    // 3. Validate Registration
    const reg = store.event_registrations.find(r => r.id === registrationId)
    if (!reg) {
      return {
        success: false,
        status: 'registration_not_found',
        message: 'Registration record not found.'
      }
    }

    if (reg.event_id !== day.event_id) {
      const event = store.events.find(e => e.id === day.event_id)
      return {
        success: false,
        status: 'wrong_event',
        message: `This QR code is for a different event, not ${event?.name || 'this event'}.`
      }
    }

    if (reg.registration_status !== 'confirmed') {
      return {
        success: false,
        status: 'registration_inactive',
        message: `Registration status is ${reg.registration_status.toUpperCase()}.`
      }
    }

    const attendee = store.attendees.find(a => a.id === reg.attendee_id)
    const attendeeName = attendee ? `${attendee.first_name} ${attendee.last_name}` : 'Unknown'

    // 4. Check Daily Eligibility
    const dayReg = store.event_day_registrations.find(
      edr => edr.event_day_id === eventDayId && edr.registration_id === registrationId
    )
    if (dayReg && !dayReg.attendance_expected) {
      return {
        success: false,
        status: 'not_eligible_today',
        message: `Attendee (${attendeeName}) is not scheduled to attend Day ${day.day_number}.`
      }
    }

    // 5. Check Payment Policy
    const event = store.events.find(e => e.id === day.event_id)
    if (event?.has_registration_fee && event?.require_payment_before_checkin) {
      if (!['paid', 'waived'].includes(reg.payment_status)) {
        return {
          success: false,
          status: 'payment_required',
          message: `Payment required before entry. Current status: ${reg.payment_status.toUpperCase()}. Direct to Registrar desk.`
        }
      }
    }

    // 6. Check Duplicate Check-In for this day
    const existing = store.attendance_records.find(
      a => a.registration_id === registrationId && a.event_day_id === eventDayId
    )
    if (existing) {
      return {
        success: false,
        status: 'already_checked_in',
        message: 'Already checked in today!',
        attendee_name: attendeeName,
        checked_in_at: existing.checked_in_at
      }
    }

    // 7. Insert Attendance Record
    const newRecord = {
      id: `att-rec-${Date.now()}`,
      registration_id: registrationId,
      event_day_id: eventDayId,
      checked_in_at: new Date().toISOString(),
      checked_in_by: 'current-user',
      check_in_method: 'qr'
    }
    store.attendance_records.push(newRecord)
    saveStore(store)

    const totalConfirmed = store.attendance_records.filter(a => a.event_day_id === eventDayId).length

    return {
      success: true,
      status: 'success',
      attendee_name: attendeeName,
      classification: attendee?.classification || 'attendee',
      checked_in_at: newRecord.checked_in_at,
      day_number: day.day_number,
      total_confirmed_today: totalConfirmed
    }
  },

  /**
   * Authorized Manual Check-In
   */
  async manualCheckin(registrationId, eventDayId) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('manual_checkin', {
        p_registration_id: registrationId,
        p_event_day_id: eventDayId
      })
      if (error) {
        return { success: false, status: 'error', message: error.message }
      }
      return data
    }

    // Use mock verification
    const store = getStore()
    const cred = store.qr_credentials.find(q => q.registration_id === registrationId)
    const payload = cred?.payload || `BEREAN:${registrationId}:token`
    const res = await this.verifyAndCheckin(payload, eventDayId)
    if (res.success) {
      // Mark as manual
      const rec = store.attendance_records.find(
        a => a.registration_id === registrationId && a.event_day_id === eventDayId
      )
      if (rec) {
        rec.check_in_method = 'manual'
        saveStore(store)
      }
    }
    return res
  },

  /**
   * Get attendance records for an event day
   */
  async getDailyAttendance(eventDayId) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          checked_in_at,
          check_in_method,
          event_registrations (
            id,
            payment_status,
            attendees (
              first_name,
              last_name,
              classification,
              contact_number
            )
          )
        `)
        .eq('event_day_id', eventDayId)
        .order('checked_in_at', { ascending: false })

      if (error) throw error
      return (data || []).map(r => ({
        id: r.id,
        checked_in_at: r.checked_in_at,
        check_in_method: r.check_in_method,
        attendee_name: `${r.event_registrations?.attendees?.first_name} ${r.event_registrations?.attendees?.last_name}`,
        classification: r.event_registrations?.attendees?.classification,
        contact: r.event_registrations?.attendees?.contact_number,
        payment_status: r.event_registrations?.payment_status
      }))
    }

    const store = getStore()
    const records = store.attendance_records.filter(a => a.event_day_id === eventDayId)
    return records.map(r => {
      const reg = store.event_registrations.find(reg => reg.id === r.registration_id)
      const attendee = store.attendees.find(att => att.id === reg?.attendee_id)
      return {
        id: r.id,
        checked_in_at: r.checked_in_at,
        check_in_method: r.check_in_method,
        attendee_name: attendee ? `${attendee.first_name} ${attendee.last_name}` : 'Unknown',
        classification: attendee?.classification || 'attendee',
        contact: attendee?.contact_number || '',
        payment_status: reg?.payment_status || 'unpaid'
      }
    }).sort((a, b) => new Date(b.checked_in_at) - new Date(a.checked_in_at))
  }
}
