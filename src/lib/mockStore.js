/**
 * Local State Store for Berean Event Check-In
 * Provides full offline/demo capabilities matching the PostgreSQL schema and RPC rules.
 */

const STORAGE_KEY = 'berean_church_event_data_v1'

const INITIAL_DATA = {
  events: [
    {
      id: 'evt-2026-camp',
      name: 'Berean Annual Bible Conference & Camp 2026',
      description: 'Theme: Rooted and Built Up in Christ (Colossians 2:6-7). Three days of preaching, fellowship, prayer, and community building.',
      venue: 'Berean Bible Baptist Church Sanctuary & Fellowship Hall',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      start_time: '08:00',
      end_time: '17:30',
      status: 'registration_open',
      capacity: 300,
      has_registration_fee: true,
      registration_fee: 250.00,
      currency: 'PHP',
      payment_instructions: 'GCash: 0917-123-4567 (Berean Treasury) or pay in cash at the Church Registrar Desk.',
      require_payment_before_checkin: false,
      expected_walk_ins: 20,
      default_meal_buffer_percentage: 10.00,
      meals_per_attendee: 1.00,
      created_at: new Date().toISOString()
    }
  ],
  event_days: [
    {
      id: 'day-1',
      event_id: 'evt-2026-camp',
      event_date: new Date().toISOString().split('T')[0],
      day_number: 1,
      status: 'open',
      expected_walk_ins: 15,
      meal_buffer_percentage: 10.00
    },
    {
      id: 'day-2',
      event_id: 'evt-2026-camp',
      event_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      day_number: 2,
      status: 'scheduled',
      expected_walk_ins: 10,
      meal_buffer_percentage: 10.00
    },
    {
      id: 'day-3',
      event_id: 'evt-2026-camp',
      event_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      day_number: 3,
      status: 'scheduled',
      expected_walk_ins: 10,
      meal_buffer_percentage: 10.00
    }
  ],
  households: [
    {
      id: 'h-santos',
      family_name: 'Santos Family',
      primary_contact: '0917-555-0101'
    }
  ],
  attendees: [
    {
      id: 'att-1',
      household_id: 'h-santos',
      first_name: 'Benjamin',
      last_name: 'Santos',
      contact_number: '0917-555-0101',
      email: 'benjamin.santos@example.com',
      classification: 'member'
    },
    {
      id: 'att-2',
      household_id: 'h-santos',
      first_name: 'Grace',
      last_name: 'Santos',
      contact_number: '0917-555-0102',
      email: 'grace.santos@example.com',
      classification: 'member'
    },
    {
      id: 'att-3',
      household_id: null,
      first_name: 'Timothy',
      last_name: 'Reyes',
      contact_number: '0918-555-0202',
      email: 'timothy.reyes@example.com',
      classification: 'youth'
    },
    {
      id: 'att-4',
      household_id: null,
      first_name: 'Pastor David',
      last_name: 'Villanueva',
      contact_number: '0920-555-0303',
      email: 'pastor.david@example.com',
      classification: 'pastor'
    }
  ],
  event_registrations: [
    {
      id: 'reg-1',
      event_id: 'evt-2026-camp',
      attendee_id: 'att-1',
      registration_status: 'confirmed',
      registration_source: 'staff_assisted',
      registered_at: new Date().toISOString(),
      payment_status: 'paid'
    },
    {
      id: 'reg-2',
      event_id: 'evt-2026-camp',
      attendee_id: 'att-2',
      registration_status: 'confirmed',
      registration_source: 'staff_assisted',
      registered_at: new Date().toISOString(),
      payment_status: 'paid'
    },
    {
      id: 'reg-3',
      event_id: 'evt-2026-camp',
      attendee_id: 'att-3',
      registration_status: 'confirmed',
      registration_source: 'online',
      registered_at: new Date().toISOString(),
      payment_status: 'unpaid'
    },
    {
      id: 'reg-4',
      event_id: 'evt-2026-camp',
      attendee_id: 'att-4',
      registration_status: 'confirmed',
      registration_source: 'paper',
      registered_at: new Date().toISOString(),
      payment_status: 'waived'
    }
  ],
  event_day_registrations: [
    { id: 'edr-1-1', event_day_id: 'day-1', registration_id: 'reg-1', attendance_expected: true },
    { id: 'edr-1-2', event_day_id: 'day-2', registration_id: 'reg-1', attendance_expected: true },
    { id: 'edr-1-3', event_day_id: 'day-3', registration_id: 'reg-1', attendance_expected: true },

    { id: 'edr-2-1', event_day_id: 'day-1', registration_id: 'reg-2', attendance_expected: true },
    { id: 'edr-2-2', event_day_id: 'day-2', registration_id: 'reg-2', attendance_expected: true },
    { id: 'edr-2-3', event_day_id: 'day-3', registration_id: 'reg-2', attendance_expected: true },

    { id: 'edr-3-1', event_day_id: 'day-1', registration_id: 'reg-3', attendance_expected: true },
    { id: 'edr-3-2', event_day_id: 'day-2', registration_id: 'reg-3', attendance_expected: true },
    { id: 'edr-3-3', event_day_id: 'day-3', registration_id: 'reg-3', attendance_expected: false },

    { id: 'edr-4-1', event_day_id: 'day-1', registration_id: 'reg-4', attendance_expected: true },
    { id: 'edr-4-2', event_day_id: 'day-2', registration_id: 'reg-4', attendance_expected: true },
    { id: 'edr-4-3', event_day_id: 'day-3', registration_id: 'reg-4', attendance_expected: true }
  ],
  qr_credentials: [
    {
      id: 'qr-1',
      registration_id: 'reg-1',
      token_raw: 'berean-tok-santos-ben-7788',
      payload: 'BEREAN:reg-1:berean-tok-santos-ben-7788',
      is_active: true,
      issued_at: new Date().toISOString()
    },
    {
      id: 'qr-2',
      registration_id: 'reg-2',
      token_raw: 'berean-tok-santos-grace-7789',
      payload: 'BEREAN:reg-2:berean-tok-santos-grace-7789',
      is_active: true,
      issued_at: new Date().toISOString()
    },
    {
      id: 'qr-3',
      registration_id: 'reg-3',
      token_raw: 'berean-tok-reyes-tim-7790',
      payload: 'BEREAN:reg-3:berean-tok-reyes-tim-7790',
      is_active: true,
      issued_at: new Date().toISOString()
    },
    {
      id: 'qr-4',
      registration_id: 'reg-4',
      token_raw: 'berean-tok-pastor-david-7791',
      payload: 'BEREAN:reg-4:berean-tok-pastor-david-7791',
      is_active: true,
      issued_at: new Date().toISOString()
    }
  ],
  attendance_records: [],
  payments: [
    {
      id: 'pay-1',
      registration_id: 'reg-1',
      amount: 250.00,
      currency: 'PHP',
      payment_method: 'cash',
      payment_status: 'completed',
      reference_number: 'OR-1001',
      paid_at: new Date().toISOString(),
      notes: 'Paid at Church Office'
    },
    {
      id: 'pay-2',
      registration_id: 'reg-2',
      amount: 250.00,
      currency: 'PHP',
      payment_method: 'gcash',
      payment_status: 'completed',
      reference_number: 'GCASH-987654321',
      paid_at: new Date().toISOString(),
      notes: 'Treasury verified'
    }
  ]
}

let memoryStore = null

export function getStore() {
  if (typeof localStorage === 'undefined') {
    if (!memoryStore) {
      memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA))
    }
    return memoryStore
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA))
    return JSON.parse(JSON.stringify(INITIAL_DATA))
  }
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA))
    return JSON.parse(JSON.stringify(INITIAL_DATA))
  }
}

export function saveStore(data) {
  if (typeof localStorage === 'undefined') {
    memoryStore = data
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resetStore() {
  if (typeof localStorage === 'undefined') {
    memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA))
    return memoryStore
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA))
  return JSON.parse(JSON.stringify(INITIAL_DATA))
}
