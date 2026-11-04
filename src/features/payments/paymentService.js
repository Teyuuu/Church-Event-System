import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore, saveStore } from '../../lib/mockStore'
import { auditService } from '../audit/auditService'

export const paymentService = {
  /**
   * Record a payment for an attendee registration
   */
  async recordPayment({ registrationId, amount, paymentMethod, referenceNumber = '', notes = '' }) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('record_payment', {
        p_registration_id: registrationId,
        p_amount: parseFloat(amount),
        p_payment_method: paymentMethod,
        p_reference_number: referenceNumber || null,
        p_notes: notes || null
      })
      if (error) throw error

      await auditService.logActivity({
        action: 'PAYMENT_RECORDED',
        entityType: 'payment',
        entityId: data?.payment_id || null,
        details: `Recorded ₱${parseFloat(amount).toFixed(2)} (${paymentMethod}) payment for registration ${registrationId}`,
        metadata: { amount: parseFloat(amount), paymentMethod, referenceNumber }
      })

      return data
    }

    const store = getStore()
    const reg = store.event_registrations.find(r => r.id === registrationId)
    if (!reg) throw new Error('Registration not found')

    const event = store.events.find(e => e.id === reg.event_id)
    const newPayment = {
      id: `pay-${Date.now()}`,
      registration_id: registrationId,
      amount: parseFloat(amount),
      currency: 'PHP',
      payment_method: paymentMethod,
      payment_status: 'completed',
      reference_number: referenceNumber,
      paid_at: new Date().toISOString(),
      notes
    }
    store.payments.push(newPayment)

    // Calculate total completed payments
    const totalPaid = store.payments
      .filter(p => p.registration_id === registrationId && p.payment_status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)

    const fee = event?.registration_fee || 0
    if (totalPaid >= fee) {
      reg.payment_status = 'paid'
    } else if (totalPaid > 0) {
      reg.payment_status = 'partially_paid'
    } else {
      reg.payment_status = 'unpaid'
    }

    saveStore(store)

    const attendee = store.attendees.find(a => a.id === reg.attendee_id)
    const attName = attendee ? `${attendee.first_name} ${attendee.last_name}` : registrationId

    await auditService.logActivity({
      action: 'PAYMENT_RECORDED',
      entityType: 'payment',
      entityId: newPayment.id,
      details: `Recorded ₱${parseFloat(amount).toFixed(2)} (${paymentMethod}) payment for ${attName}`,
      metadata: { amount: parseFloat(amount), paymentMethod, referenceNumber, attendeeName: attName }
    })

    return {
      success: true,
      total_paid: totalPaid,
      payment_status: reg.payment_status,
      payment: newPayment
    }
  },

  /**
   * Get payments for a registration
   */
  async getPaymentsByRegistration(registrationId) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('registration_id', registrationId)
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data || []
    }

    const store = getStore()
    return store.payments.filter(p => p.registration_id === registrationId)
  },

  /**
   * Waive registration fee
   */
  async waivePayment(registrationId, reason = 'Pastoral waiver', attendeeName = '') {
    const logWaiver = () => auditService.logActivity({
      action: 'PAYMENT_WAIVED',
      entityType: 'registration',
      entityId: registrationId,
      details: `Fee waived${attendeeName ? ` for ${attendeeName}` : ''} — Reason: ${reason}`,
      metadata: { reason, attendeeName }
    })

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('event_registrations')
        .update({ payment_status: 'waived' })
        .eq('id', registrationId)
      if (error) throw error
      await logWaiver()
      return true
    }

    const store = getStore()
    const reg = store.event_registrations.find(r => r.id === registrationId)
    if (reg) {
      reg.payment_status = 'waived'
      reg.waiver_reason = reason
      saveStore(store)
    }
    await logWaiver()
    return true
  },

  /**
   * Get completed-payment totals keyed by registration id (for balance columns)
   * @param {string[]} registrationIds
   * @returns {Promise<Record<string, number>>}
   */
  async getPaidTotalsByRegistration(registrationIds = []) {
    if (registrationIds.length === 0) return {}
    let payments = []

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .select('registration_id, amount, payment_status')
        .in('registration_id', registrationIds)
      if (error) throw error
      payments = data || []
    } else {
      const store = getStore()
      const idSet = new Set(registrationIds)
      payments = store.payments.filter(p => idSet.has(p.registration_id))
    }

    return payments
      .filter(p => p.payment_status === 'completed')
      .reduce((acc, p) => {
        acc[p.registration_id] = (acc[p.registration_id] || 0) + parseFloat(p.amount || 0)
        return acc
      }, {})
  }
}
