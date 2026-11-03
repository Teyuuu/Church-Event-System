import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore, saveStore } from '../../lib/mockStore'
import { qrService } from '../qr/qrService'
import { auditService } from '../audit/auditService'

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
          ),
          event_day_registrations (
            event_day_id,
            attendance_expected
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false })

      if (error) throw error

      return (data || []).map(r => {
        const dayRegs = r.event_day_registrations || []
        return {
          id: r.id,
          event_id: r.event_id,
          registration_status: r.registration_status,
          registration_source: r.registration_source,
          registered_at: r.registered_at,
          payment_status: r.payment_status,
          attendee: r.attendees,
          qr_credential: r.qr_credentials?.[0] || null,
          day_registrations: dayRegs,
          selected_day_ids: dayRegs.filter(d => d.attendance_expected).map(d => d.event_day_id)
        }
      })
    }

    const store = getStore()
    const regs = store.event_registrations.filter(r => r.event_id === eventId)
    return regs.map(r => {
      const attendee = store.attendees.find(a => a.id === r.attendee_id)
      const household = attendee?.household_id 
        ? store.households.find(h => h.id === attendee.household_id)
        : null
      const qrCred = store.qr_credentials.find(q => q.registration_id === r.id)
      const dayRegs = store.event_day_registrations.filter(edr => edr.registration_id === r.id)
      return {
        ...r,
        attendee: {
          ...attendee,
          households: household
        },
        qr_credential: qrCred,
        day_registrations: dayRegs,
        selected_day_ids: dayRegs.filter(d => d.attendance_expected).map(d => d.event_day_id)
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

      await auditService.logActivity({
        action: 'ATTENDEE_REGISTERED',
        entityType: 'attendee',
        entityId: attendee.id,
        details: `Registered attendee ${firstName} ${lastName} (${classification})`,
        metadata: { source, classification, eventId }
      })

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

    await auditService.logActivity({
      action: 'ATTENDEE_REGISTERED',
      entityType: 'attendee',
      entityId: attendeeId,
      details: `Registered attendee ${firstName} ${lastName} (${classification})`,
      metadata: { source, classification, eventId }
    })

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

    await auditService.logActivity({
      action: 'FAMILY_REGISTERED',
      entityType: 'household',
      entityId: householdId,
      details: `Registered family "${familyName}" with ${members.length} members`,
      metadata: { eventId, memberCount: members.length }
    })

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
  },

  /**
   * Update a registered attendee's personal details, classification, source, household, and attending days
   */
  async updateAttendeeRegistration({
    registrationId,
    attendeeId,
    firstName,
    middleName = '',
    lastName,
    contactNumber = '',
    email = '',
    classification = 'visitor',
    source = 'staff_assisted',
    familyName = undefined,
    selectedDayIds = null
  }) {
    if (!firstName?.trim() || !lastName?.trim()) {
      throw new Error('First name and last name are required.')
    }

    if (isSupabaseConfigured && supabase) {
      let householdId = undefined

      if (familyName !== undefined) {
        const { data: currentAtt, error: fetchErr } = await supabase
          .from('attendees')
          .select('household_id')
          .eq('id', attendeeId)
          .single()
        if (fetchErr) throw fetchErr

        const trimmedFamily = familyName.trim()
        if (trimmedFamily) {
          if (currentAtt?.household_id) {
            const { error: hhErr } = await supabase
              .from('households')
              .update({
                family_name: trimmedFamily,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentAtt.household_id)
            if (hhErr) throw hhErr
            householdId = currentAtt.household_id
          } else {
            const { data: newHh, error: hhErr } = await supabase
              .from('households')
              .insert([{
                family_name: trimmedFamily,
                primary_contact: contactNumber.trim() || null
              }])
              .select()
              .single()
            if (hhErr) throw hhErr
            householdId = newHh.id
          }
        } else {
          householdId = null
        }
      }

      const attendeeUpdate = {
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        contact_number: contactNumber.trim() || null,
        email: email.trim() || null,
        classification,
        updated_at: new Date().toISOString()
      }
      if (householdId !== undefined) {
        attendeeUpdate.household_id = householdId
      }

      const { data: updatedAttendee, error: attErr } = await supabase
        .from('attendees')
        .update(attendeeUpdate)
        .eq('id', attendeeId)
        .select()
        .single()
      if (attErr) throw attErr

      const { data: updatedReg, error: regErr } = await supabase
        .from('event_registrations')
        .update({
          registration_source: source,
          updated_at: new Date().toISOString()
        })
        .eq('id', registrationId)
        .select()
        .single()
      if (regErr) throw regErr

      if (selectedDayIds) {
        const { data: days } = await supabase
          .from('event_days')
          .select('id')
          .eq('event_id', updatedReg.event_id)

        if (days && days.length > 0) {
          const dayRegs = days.map(d => ({
            event_day_id: d.id,
            registration_id: registrationId,
            attendance_expected: selectedDayIds.includes(d.id)
          }))
          const { error: edrErr } = await supabase
            .from('event_day_registrations')
            .upsert(dayRegs, { onConflict: 'event_day_id,registration_id' })
          if (edrErr) throw edrErr
        }
      }

      await auditService.logActivity({
        action: 'ATTENDEE_UPDATED',
        entityType: 'attendee',
        entityId: attendeeId,
        details: `Updated details/spelling for attendee ${firstName} ${lastName}`,
        metadata: { classification, registrationId }
      })

      return {
        registration: updatedReg,
        attendee: updatedAttendee
      }
    }

    // Mock Store implementation
    const store = getStore()
    const reg = store.event_registrations.find(r => r.id === registrationId)
    if (!reg) {
      throw new Error('Registration record not found.')
    }

    const targetAttendeeId = attendeeId || reg.attendee_id
    const attendee = store.attendees.find(a => a.id === targetAttendeeId)
    if (!attendee) {
      throw new Error('Attendee record not found.')
    }

    if (familyName !== undefined) {
      const trimmedFamily = familyName.trim()
      if (trimmedFamily) {
        if (attendee.household_id) {
          const hh = store.households.find(h => h.id === attendee.household_id)
          if (hh) {
            hh.family_name = trimmedFamily
          } else {
            store.households.push({
              id: attendee.household_id,
              family_name: trimmedFamily,
              primary_contact: contactNumber.trim() || null
            })
          }
        } else {
          const newHhId = `h-${Date.now()}`
          store.households.push({
            id: newHhId,
            family_name: trimmedFamily,
            primary_contact: contactNumber.trim() || null
          })
          attendee.household_id = newHhId
        }
      } else {
        attendee.household_id = null
      }
    }

    attendee.first_name = firstName.trim()
    attendee.middle_name = middleName.trim() || null
    attendee.last_name = lastName.trim()
    attendee.contact_number = contactNumber.trim() || null
    attendee.email = email.trim() || null
    attendee.classification = classification

    reg.registration_source = source

    if (selectedDayIds) {
      const eventDays = store.event_days.filter(d => d.event_id === reg.event_id)
      eventDays.forEach(d => {
        const expected = selectedDayIds.includes(d.id)
        const existingIdx = store.event_day_registrations.findIndex(
          edr => edr.event_day_id === d.id && edr.registration_id === registrationId
        )
        if (existingIdx !== -1) {
          store.event_day_registrations[existingIdx].attendance_expected = expected
        } else {
          store.event_day_registrations.push({
            id: `edr-${Date.now()}-${d.id}`,
            event_day_id: d.id,
            registration_id: registrationId,
            attendance_expected: expected
          })
        }
      })
    }

    saveStore(store)

    await auditService.logActivity({
      action: 'ATTENDEE_UPDATED',
      entityType: 'attendee',
      entityId: attendee.id,
      details: `Updated details/spelling for attendee ${firstName} ${lastName}`,
      metadata: { classification, registrationId }
    })

    return {
      registration: { ...reg },
      attendee: { ...attendee }
    }
  }
}
