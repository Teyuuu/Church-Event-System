import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore, saveStore } from '../../lib/mockStore'

export const eventService = {
  /**
   * Fetch all events
   */
  async getEvents() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false })
      if (error) throw error
      return data || []
    }

    const store = getStore()
    return store.events || []
  },

  /**
   * Fetch a single event by ID with its event days
   */
  async getEventById(id) {
    if (isSupabaseConfigured && supabase) {
      const { data: event, error: eventErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()
      if (eventErr) throw eventErr

      const { data: days, error: daysErr } = await supabase
        .from('event_days')
        .select('*')
        .eq('event_id', id)
        .order('day_number', { ascending: true })
      if (daysErr) throw daysErr

      return { ...event, days: days || [] }
    }

    const store = getStore()
    const event = store.events.find(e => e.id === id)
    if (!event) return null
    const days = store.event_days
      .filter(d => d.event_id === id)
      .sort((a, b) => a.day_number - b.day_number)
    return { ...event, days }
  },

  /**
   * Create an event and auto-generate its event days
   */
  async createEvent(eventData) {
    const start = new Date(eventData.start_date)
    const end = new Date(eventData.end_date)
    const diffTime = Math.abs(end - start)
    const numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (isSupabaseConfigured && supabase) {
      const { data: newEvent, error: eventErr } = await supabase
        .from('events')
        .insert([{
          ...eventData,
          status: eventData.status || 'registration_open'
        }])
        .select()
        .single()
      if (eventErr) throw eventErr

      // Generate day records
      const dayInserts = []
      for (let i = 0; i < numDays; i++) {
        const dayDate = new Date(start)
        dayDate.setDate(dayDate.getDate() + i)
        dayInserts.push({
          event_id: newEvent.id,
          event_date: dayDate.toISOString().split('T')[0],
          day_number: i + 1,
          status: i === 0 ? 'open' : 'scheduled',
          expected_walk_ins: eventData.expected_walk_ins || 0,
          meal_buffer_percentage: eventData.default_meal_buffer_percentage || 10.00
        })
      }

      const { error: daysErr } = await supabase.from('event_days').insert(dayInserts)
      if (daysErr) throw daysErr

      return newEvent
    }

    // Mock Store implementation
    const store = getStore()
    const newId = `evt-${Date.now()}`
    const newEvent = {
      ...eventData,
      id: newId,
      status: eventData.status || 'registration_open',
      created_at: new Date().toISOString()
    }
    store.events.unshift(newEvent)

    for (let i = 0; i < numDays; i++) {
      const dayDate = new Date(start)
      dayDate.setDate(dayDate.getDate() + i)
      store.event_days.push({
        id: `day-${newId}-${i + 1}`,
        event_id: newId,
        event_date: dayDate.toISOString().split('T')[0],
        day_number: i + 1,
        status: i === 0 ? 'open' : 'scheduled',
        expected_walk_ins: eventData.expected_walk_ins || 0,
        meal_buffer_percentage: eventData.default_meal_buffer_percentage || 10.00
      })
    }

    saveStore(store)
    return newEvent
  },

  /**
   * Update event day status (e.g. open/close day, change buffer or walk-ins)
   */
  async updateEventDay(dayId, updates) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('event_days')
        .update(updates)
        .eq('id', dayId)
        .select()
        .single()
      if (error) throw error
      return data
    }

    const store = getStore()
    const dayIndex = store.event_days.findIndex(d => d.id === dayId)
    if (dayIndex !== -1) {
      store.event_days[dayIndex] = { ...store.event_days[dayIndex], ...updates }
      saveStore(store)
      return store.event_days[dayIndex]
    }
    throw new Error('Event day not found')
  }
}
