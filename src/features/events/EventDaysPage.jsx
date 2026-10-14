import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { eventService } from './eventService'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatDate } from '../../utils/date'
import { Calendar, ArrowLeft, Check, Lock, Unlock, Users, UtensilsCrossed } from 'lucide-react'

export function EventDaysPage() {
  const { eventId } = useParams()
  const { isAdmin } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const loadEvent = async () => {
    setLoading(true)
    try {
      const data = await eventService.getEventById(eventId)
      setEvent(data)
    } catch (err) {
      console.error('Failed to load event days:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvent()
  }, [eventId])

  const handleStatusChange = async (dayId, newStatus) => {
    setUpdatingId(dayId)
    try {
      await eventService.updateEventDay(dayId, { status: newStatus })
      await loadEvent()
    } catch (err) {
      alert(err.message || 'Failed to update day status')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <LoadingState message="Loading event schedule..." />
  if (!event) return <div>Event not found.</div>

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-brand-navy-800)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <h1>{event.name}</h1>
        <p className="text-muted">
          Multi-Day Schedule & Daily Check-In Window Control
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Day #</th>
                <th>Date</th>
                <th>Check-In Status</th>
                <th>Expected Walk-Ins</th>
                <th>Meal Buffer (%)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {event.days?.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700 }}>Day {d.day_number}</td>
                  <td>{formatDate(d.event_date)}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>{d.expected_walk_ins || 0} attendees</td>
                  <td>{d.meal_buffer_percentage || event.default_meal_buffer_percentage}%</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {isAdmin && (
                        <>
                          {d.status !== 'open' ? (
                            <Button
                              variant="gold"
                              size="sm"
                              loading={updatingId === d.id}
                              onClick={() => handleStatusChange(d.id, 'open')}
                            >
                              <Unlock size={14} />
                              <span>Open Check-In</span>
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={updatingId === d.id}
                              onClick={() => handleStatusChange(d.id, 'closed')}
                            >
                              <Lock size={14} />
                              <span>Close Day</span>
                            </Button>
                          )}
                        </>
                      )}

                      <Link
                        to={`/events/${eventId}/attendance?dayId=${d.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        <Users size={14} />
                        <span>Daily Log</span>
                      </Link>

                      <Link
                        to={`/kitchen/${eventId}/${d.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        <UtensilsCrossed size={14} />
                        <span>Kitchen</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
