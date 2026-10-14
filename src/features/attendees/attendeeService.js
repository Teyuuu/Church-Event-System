import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore, saveStore } from '../../lib/mockStore'
import { qrService } from '../qr/qrService'

export const attendeeService = {
  /**
   * Get all registered attendees for an event
   */
  async getEventRegistrations(eventId) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          registration_status,
          registration_source,
          registered_at,
          payment_status,
          attendees (
            id,
            first_name,
            middle_name,
            last_name,
            contact_number,
            email,
            classification,
            household_id,
            households (family_name)
          ),
          qr_credentials (
            id,
            token_hash,
            is_active
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false })

      if (error) throw error

      return (data || []).map(r => ({
        id: r.id,
        event_id: r.event_id,
        registration_status: r.registration_status,
        registration_source: r.registration_source,
        registered_at: r.registered_at,
        payment_status: r.payment_status,
        attendee: r.attendees,
        qr_credential: r.qr_credentials?.[0] || null
      }))
    }

    const store = getStore()
    const regs = store.event_registrations.filter(r => r.event_id === eventId)
    return regs.map(r => {
      const attendee = store.attendees.find(a => a.id === r.attendee_id)
      const household = attendee?.household_id 
        ? store.households.find(h => h.id === attendee.household_id)
        : null
      const qrCred = store.qr_credentials.find(q => q.registration_id === r.id)
      return {
        ...r,
        attendee: {
          ...attendee,
          households: household
        },
        qr_credential: qrCred
      }
    })
  },

  /**
   * Register a single attendee for an event
   */
  async registerAttendee({
    eventId,
    firstName,
    middleName = '',
    lastName,
    contactNumber = '',
    email = '',
    classification = 'visitor',
    source = 'staff_assisted',
    householdId = null,
    selectedDayIds = null
  }) {
    if (isSupabaseConfigured && supabase) {
      // 1. Insert Attendee
      const { data: attendee, error: attErr } = await supabase
        .from('attendees')
        .insert([{
          household_id: householdId,
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim(),
          contact_number: contactNumber.trim() || null,
          email: email.trim() || null,
          classification
        }])
        .select()
        .single()
      if (attErr) throw attErr

      // 2. Insert Event Registration
      const { data: reg, error: regErr } = await supabase
        .from('event_registrations')
        .insert([{
          event_id: eventId,
          attendee_id: attendee.id,
          registration_status: 'confirmed',
          registration_source: source,
          payment_status: 'unpaid'
        }])
        .select()
        .single()
      if (regErr) throw regErr

      // 3. Populate Event Day Registrations
      const { data: days } = await supabase
        .from('event_days')
        .select('id')
        .eq('event_id', eventId)

      const targetDayIds = selectedDayIds || (days || []).map(d => d.id)
      if (days && days.length > 0) {
        const dayRegs = days.map(d => ({
          event_day_id: d.id,
          registration_id: reg.id,
          attendance_expected: targetDayIds.includes(d.id)
        }))
        await supabase.from('event_day_registrations').insert(dayRegs)
      }

      // 4. Issue QR Credential via RPC
      const { data: qrResult, error: qrErr } = await supabase.rpc('issue_qr_credential', {
        p_registration_id: reg.id
      })
      if (qrErr) console.warn('QR Issuance error:', qrErr)

      return {
        registrationId: reg.id,
        attendeeId: attendee.id,
        qrPayload: qrResult?.qr_payload || `BEREAN:${reg.id}:token`
      }
    }

    // Mock Store implementation
    const store = getStore()
    const attendeeId = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const regId = `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const newAttendee = {
      id: attendeeId,
      household_id: householdId,
      first_name: firstName.trim(),
      middle_name: middleName.trim() || null,
      last_name: lastName.trim(),
      contact_number: contactNumber.trim() || null,
      email: email.trim() || null,
      classification
    }
    store.attendees.push(newAttendee)

    const newReg = {
      id: regId,
      event_id: eventId,
      attendee_id: attendeeId,
      registration_status: 'confirmed',
      registration_source: source,
      registered_at: new Date().toISOString(),
      payment_status: 'unpaid'
    }
    store.event_registrations.push(newReg)

    // Daily eligibility
    const eventDays = store.event_days.filter(d => d.event_id === eventId)
    const targetDayIds = selectedDayIds || eventDays.map(d => d.id)

    eventDays.forEach(d => {
      store.event_day_registrations.push({
        id: `edr-${Date.now()}-${d.id}`,
        event_day_id: d.id,
        registration_id: regId,
        attendance_expected: targetDayIds.includes(d.id)
      })
    })

    // QR Credential
    const rawToken = `berean-tok-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const qrPayload = `BEREAN:${regId}:${rawToken}`
    store.qr_credentials.push({
      id: `qr-${Date.now()}`,
      registration_id: regId,
      token_raw: rawToken,
      payload: qrPayload,
      is_active: true,
      issued_at: new Date().toISOString()
    })

    saveStore(store)

    return {
      registrationId: regId,
      attendeeId,
      qrPayload
    }
  },

  /**
   * Register a whole family/household together
   */
  async registerFamily({ eventId, familyName, primaryContact, members, source = 'staff_assisted' }) {
    let householdId = null

    if (isSupabaseConfigured && supabase) {
      const { data: hh, error: hhErr } = await supabase
        .from('households')
        .insert([{ family_name: familyName, primary_contact: primaryContact }])
        .select()
        .single()
      if (hhErr) throw hhErr
      householdId = hh.id
    } else {
      const store = getStore()
      householdId = `h-${Date.now()}`
      store.households.push({
        id: householdId,
        family_name: familyName,
        primary_contact: primaryContact
      })
      saveStore(store)
    }

    const results = []
    for (const member of members) {
      const res = await this.registerAttendee({
        eventId,
        firstName: member.firstName,
        lastName: member.lastName,
        contactNumber: member.contactNumber || primaryContact,
        email: member.email || '',
        classification: member.classification || 'member',
        source,
        householdId
      })
      results.push(res)
    }

    return { householdId, registrations: results }
  },

  /**
   * Update daily eligibility for a registrant on a specific day
   */
  async updateDailyEligibility(eventDayId, registrationId, attendanceExpected) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('event_day_registrations')
        .upsert({
          event_day_id: eventDayId,
          registration_id: registrationId,
          attendance_expected: attendanceExpected
        })
      if (error) throw error
      return true
    }

    const store = getStore()
    const edrIndex = store.event_day_registrations.findIndex(
      r => r.event_day_id === eventDayId && r.registration_id === registrationId
    )
    if (edrIndex !== -1) {
      store.event_day_registrations[edrIndex].attendance_expected = attendanceExpected
    } else {
      store.event_day_registrations.push({
        id: `edr-${Date.now()}`,
        event_day_id: eventDayId,
        registration_id: registrationId,
        attendance_expected: attendanceExpected
      })
    }
    saveStore(store)
    return true
  }
}
