import React, { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { eventService } from '../../features/events/eventService'
import { LoadingState } from '../ui/LoadingState'
import { can, getHomeRoute } from '../../utils/permissions'
import { todayLocal } from '../../utils/date'

/**
 * Sends each role to the most useful starting page.
 *
 * - admin     -> /dashboard
 * - usher     -> scanner of the event running today (else /events)
 * - kitchen   -> kitchen board of the event running today (else /events)
 * - registrar -> /events
 *
 * With `eventScoped` (the index of /events/:eventId) it picks the first
 * event tab this role can use.
 */
export function HomeRedirect({ eventScoped = false }) {
  const { role } = useAuth()
  const { eventId } = useParams()
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let cancelled = false

    if (eventScoped && eventId) {
      const order = ['attendees', 'scan', 'kitchen', 'days']
      const first = order.find(p => can(role, p === 'days' ? 'schedule' : p))
      setTarget(`/events/${eventId}/${first || 'days'}`)
      return undefined
    }

    if (role !== 'usher' && role !== 'kitchen') {
      setTarget(getHomeRoute(role))
      return undefined
    }

    async function findTodaysEvent() {
      try {
        const events = await eventService.getEvents()
        const today = todayLocal()
        const active = events.filter(e => e.start_date <= today && e.end_date >= today && e.status !== 'archived')
        if (active.length === 1) {
          const page = role === 'usher' ? 'scan' : 'kitchen'
          if (!cancelled) setTarget(`/events/${active[0].id}/${page}`)
          return
        }
      } catch {
        // fall through to the events list
      }
      if (!cancelled) setTarget('/events')
    }
    findTodaysEvent()
    return () => { cancelled = true }
  }, [role, eventScoped, eventId])

  if (!target) return <LoadingState message="Opening your workspace…" />
  return <Navigate to={target} replace />
}
