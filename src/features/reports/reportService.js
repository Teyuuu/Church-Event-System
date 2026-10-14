import { getStore } from '../../lib/mockStore'
import { convertToCsv, downloadCsv } from '../../utils/csv'
import { formatDate, formatDateTime } from '../../utils/date'

export const reportService = {
  /**
   * Get Multi-Day Attendance Analytics
   */
  async getMultiDayReport(eventId) {
    const store = getStore()
    const event = store.events.find(e => e.id === eventId)
    const days = store.event_days
      .filter(d => d.event_id === eventId)
      .sort((a, b) => a.day_number - b.day_number)

    const registrations = store.event_registrations.filter(r => r.event_id === eventId)
    const regIds = registrations.map(r => r.id)

    // Check-ins for this event
    const attendance = store.attendance_records.filter(a => regIds.includes(a.registration_id))

    // Total Check-Ins across days
    const totalDailyCheckins = attendance.length

    // Distinct Unique Attendees who checked in at least once
    const uniqueAttendeeRegIds = new Set(attendance.map(a => a.registration_id))
    const totalUniqueAttendees = uniqueAttendeeRegIds.size

    // Breakdown per day
    const dayBreakdown = days.map(d => {
      const dayExpected = store.event_day_registrations.filter(
        edr => edr.event_day_id === d.id && edr.attendance_expected
      ).length

      const dayCheckins = attendance.filter(a => a.event_day_id === d.id)
      const confirmed = dayCheckins.length
      const pct = dayExpected > 0 ? Math.round((confirmed / dayExpected) * 1000) / 10 : 0

      return {
        id: d.id,
        day_number: d.day_number,
        date: d.event_date,
        status: d.status,
        expected: dayExpected,
        confirmed,
        remaining: Math.max(0, dayExpected - confirmed),
        attendance_percentage: pct
      }
    })

    // Frequency: how many days did each person attend?
    const frequency = { 1: 0, 2: 0, 3: 0, '4+': 0 }
    uniqueAttendeeRegIds.forEach(rId => {
      const count = attendance.filter(a => a.registration_id === rId).length
      if (count === 1) frequency[1]++
      else if (count === 2) frequency[2]++
      else if (count === 3) frequency[3]++
      else if (count >= 4) frequency['4+']++
    })

    return {
      eventName: event?.name || 'Event',
      totalRegistrations: registrations.length,
      totalDailyCheckins,
      totalUniqueAttendees,
      daysCount: days.length,
      dayBreakdown,
      frequency
    }
  },

  /**
   * Get Financial Report
   */
  async getFinancialReport(eventId) {
    const store = getStore()
    const event = store.events.find(e => e.id === eventId)
    const registrations = store.event_registrations.filter(r => r.event_id === eventId)
    const regIds = registrations.map(r => r.id)

    const payments = store.payments.filter(p => regIds.includes(p.registration_id))
    const completedPayments = payments.filter(p => p.payment_status === 'completed')

    const totalCollected = completedPayments.reduce((sum, p) => sum + p.amount, 0)

    const statusCounts = {
      paid: registrations.filter(r => r.payment_status === 'paid').length,
      partially_paid: registrations.filter(r => r.payment_status === 'partially_paid').length,
      unpaid: registrations.filter(r => r.payment_status === 'unpaid').length,
      waived: registrations.filter(r => r.payment_status === 'waived').length
    }

    const byMethod = {
      cash: completedPayments.filter(p => p.payment_method === 'cash').reduce((s, p) => s + p.amount, 0),
      gcash: completedPayments.filter(p => p.payment_method === 'gcash').reduce((s, p) => s + p.amount, 0),
      bank_transfer: completedPayments.filter(p => p.payment_method === 'bank_transfer').reduce((s, p) => s + p.amount, 0),
      other: completedPayments.filter(p => p.payment_method === 'other').reduce((s, p) => s + p.amount, 0)
    }

    return {
      hasFee: event?.has_registration_fee || false,
      fee: event?.registration_fee || 0,
      currency: event?.currency || 'PHP',
      totalCollected,
      statusCounts,
      byMethod,
      recentPayments: payments.slice(-10).reverse().map(p => {
        const reg = store.event_registrations.find(r => r.id === p.registration_id)
        const att = store.attendees.find(a => a.id === reg?.attendee_id)
        return {
          id: p.id,
          attendee_name: att ? `${att.first_name} ${att.last_name}` : 'Unknown',
          amount: p.amount,
          method: p.payment_method,
          reference: p.reference_number || '—',
          paid_at: p.paid_at
        }
      })
    }
  },

  /**
   * Export Registrations to CSV
   */
  exportRegistrationsCsv(eventId) {
    const store = getStore()
    const event = store.events.find(e => e.id === eventId)
    const registrations = store.event_registrations.filter(r => r.event_id === eventId)

    const rows = registrations.map((r, idx) => {
      const att = store.attendees.find(a => a.id === r.attendee_id)
      const hh = att?.household_id ? store.households.find(h => h.id === att.household_id) : null
      return {
        no: idx + 1,
        fullName: `${att?.last_name || ''}, ${att?.first_name || ''} ${att?.middle_name || ''}`.trim(),
        classification: att?.classification || 'visitor',
        contact: att?.contact_number || '—',
        email: att?.email || '—',
        household: hh?.family_name || 'Individual',
        registrationSource: r.registration_source,
        paymentStatus: r.payment_status,
        registeredAt: formatDateTime(r.registered_at)
      }
    })

    const columns = [
      { key: 'no', label: '#' },
      { key: 'fullName', label: 'Attendee Full Name' },
      { key: 'classification', label: 'Classification' },
      { key: 'contact', label: 'Contact Number' },
      { key: 'email', label: 'Email' },
      { key: 'household', label: 'Family/Group' },
      { key: 'registrationSource', label: 'Reg Source' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'registeredAt', label: 'Registration Date' }
    ]

    const csv = convertToCsv(rows, columns)
    const filename = `${event?.name || 'Berean_Event'}_Registrations_${new Date().toISOString().split('T')[0]}`
    downloadCsv(filename, csv)
  },

  /**
   * Export Daily Attendance to CSV
   */
  exportAttendanceCsv(eventDayId) {
    const store = getStore()
    const day = store.event_days.find(d => d.id === eventDayId)
    const event = store.events.find(e => e.id === day?.event_id)
    const attendance = store.attendance_records.filter(a => a.event_day_id === eventDayId)

    const rows = attendance.map((a, idx) => {
      const reg = store.event_registrations.find(r => r.id === a.registration_id)
      const att = store.attendees.find(at => at.id === reg?.attendee_id)
      return {
        no: idx + 1,
        fullName: `${att?.last_name || ''}, ${att?.first_name || ''}`.trim(),
        classification: att?.classification || 'attendee',
        contact: att?.contact_number || '—',
        checkInMethod: a.check_in_method.toUpperCase(),
        checkInTime: formatDateTime(a.checked_in_at),
        dayNumber: day?.day_number || 1
      }
    })

    const columns = [
      { key: 'no', label: '#' },
      { key: 'fullName', label: 'Attendee Name' },
      { key: 'classification', label: 'Classification' },
      { key: 'contact', label: 'Contact' },
      { key: 'checkInMethod', label: 'Method' },
      { key: 'checkInTime', label: 'Checked In Time' },
      { key: 'dayNumber', label: 'Event Day #' }
    ]

    const csv = convertToCsv(rows, columns)
    const filename = `${event?.name || 'Event'}_Day${day?.day_number || 1}_Attendance_${day?.event_date || ''}`
    downloadCsv(filename, csv)
  }
}
