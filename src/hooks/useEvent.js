import { useCallback, useEffect, useState } from 'react'
import { eventService } from '../features/events/eventService'

/**
 * Tiny in-memory cache for event details (event + days).
 * Shared by the event layout, sidebar and pages so switching tabs
 * inside an event does not refetch the same event over and over.
 */
const cache = new Map()      // eventId -> { data, fetchedAt }
const inflight = new Map()   // eventId -> Promise
const listeners = new Set()
const STALE_MS = 60 * 1000

function notify(eventId) {
  listeners.forEach(fn => fn(eventId))
}

export function fetchEvent(eventId, { force = false } = {}) {
  const cached = cache.get(eventId)
  if (!force && cached && Date.now() - cached.fetchedAt < STALE_MS) {
    return Promise.resolve(cached.data)
  }
  if (!force && inflight.has(eventId)) return inflight.get(eventId)

  const p = eventService.getEventById(eventId)
    .then(data => {
      cache.set(eventId, { data, fetchedAt: Date.now() })
      inflight.delete(eventId)
      notify(eventId)
      return data
    })
    .catch(err => {
      inflight.delete(eventId)
      throw err
    })
  inflight.set(eventId, p)
  return p
}

export function invalidateEvent(eventId) {
  if (eventId) cache.delete(eventId)
  else cache.clear()
}

export function getCachedEvent(eventId) {
  return cache.get(eventId)?.data || null
}

/**
 * @param {string|null} eventId
 * @returns {{ event: any, loading: boolean, error: any, reload: () => Promise<any> }}
 */
export function useEvent(eventId) {
  const [event, setEvent] = useState(() => (eventId ? getCachedEvent(eventId) : null))
  const [loading, setLoading] = useState(Boolean(eventId) && !getCachedEvent(eventId))
  const [error, setError] = useState(null)

  const load = useCallback(async (force = false) => {
    if (!eventId) return null
    setError(null)
    if (!getCachedEvent(eventId)) setLoading(true)
    try {
      const data = await fetchEvent(eventId, { force })
      setEvent(data)
      return data
    } catch (err) {
      setError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    setEvent(eventId ? getCachedEvent(eventId) : null)
    load()
  }, [eventId, load])

  // Stay in sync when another component refreshes the same event
  useEffect(() => {
    const fn = (changedId) => {
      if (changedId === eventId) setEvent(getCachedEvent(eventId))
    }
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [eventId])

  const reload = useCallback(() => load(true), [load])

  return { event, loading, error, reload }
}
