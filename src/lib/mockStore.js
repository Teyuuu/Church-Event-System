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
  ],
  users: [
    {
      id: 'usr-admin-01',
      full_name: 'Pastor Samuel',
      email: 'admin@berean.org',
      password: 'password123',
      role: 'admin',
      is_active: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'usr-registrar-01',
      full_name: 'Sis. Mary',
      email: 'registrar@berean.org',
      password: 'password123',
      role: 'registrar',
      is_active: true,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      id: 'usr-usher-01',
      full_name: 'Bro. Caleb',
      email: 'usher@berean.org',
      password: 'password123',
      role: 'usher',
      is_active: true,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      id: 'usr-kitchen-01',
      full_name: 'Bro. Peter',
      email: 'kitchen@berean.org',
      password: 'password123',
      role: 'kitchen',
      is_active: true,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    }
  ],
  audit_logs: [
    {
      id: 'audit-01',
      actor_id: 'usr-admin-01',
      actor_name: 'Pastor Samuel',
      actor_role: 'admin',
      action: 'EVENT_CREATED',
      entity_type: 'event',
      entity_id: 'evt-2026-camp',
      details: 'Created event "Berean Annual Bible Conference & Camp 2026"',
      metadata: { venue: 'Berean Bible Baptist Church Sanctuary & Fellowship Hall', capacity: 300 },
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'audit-02',
      actor_id: 'usr-admin-01',
      actor_name: 'Pastor Samuel',
      actor_role: 'admin',
      action: 'DAY_OPENED',
      entity_type: 'event_day',
      entity_id: 'day-1',
      details: 'Opened check-in window for Day 1',
      metadata: { day_number: 1 },
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'audit-03',
      actor_id: 'usr-registrar-01',
      actor_name: 'Sis. Mary',
      actor_role: 'registrar',
      action: 'ATTENDEE_REGISTERED',
      entity_type: 'attendee',
      entity_id: 'att-1',
      details: 'Registered attendee Benjamin Santos (staff_assisted)',
      metadata: { classification: 'member', family: 'Santos Family' },
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'audit-04',
      actor_id: 'usr-registrar-01',
      actor_name: 'Sis. Mary',
      actor_role: 'registrar',
      action: 'PAYMENT_RECORDED',
      entity_type: 'payment',
      entity_id: 'pay-1',
      details: 'Recorded ₱250.00 cash payment for Benjamin Santos (OR-1001)',
      metadata: { amount: 250, method: 'cash', reference: 'OR-1001' },
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
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
    const parsed = JSON.parse(raw)
    let needsUpdate = false
    if (!parsed.users || !Array.isArray(parsed.users)) {
      parsed.users = JSON.parse(JSON.stringify(INITIAL_DATA.users))
      needsUpdate = true
    }
    if (!parsed.audit_logs || !Array.isArray(parsed.audit_logs)) {
      parsed.audit_logs = JSON.parse(JSON.stringify(INITIAL_DATA.audit_logs))
      needsUpdate = true
    }
    if (needsUpdate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }
    return parsed
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
