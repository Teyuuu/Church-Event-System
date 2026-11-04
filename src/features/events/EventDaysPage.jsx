import React, { useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { eventService } from './eventService'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { EventFormModal } from './EventFormModal'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { can } from '../../utils/permissions'
import { formatDate, todayLocal } from '../../utils/date'
import { Lock, Unlock, Users, UtensilsCrossed, Pencil, CalendarX, Settings } from 'lucide-react'

export function EventDaysPage() {
  const { event, reloadEvent } = useOutletContext()
  const { role } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const isMobile = useIsMobile()
  const [updatingId, setUpdatingId] = useState(null)
  const [editingDay, setEditingDay] = useState(null)
  const [dayForm, setDayForm] = useState({ expected_walk_ins: '', meal_buffer_percentage: '' })
  const [savingDay, setSavingDay] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)

  const canManage = can(role, 'manageSchedule')
  const canAttendance = can(role, 'attendance')
  const canKitchen = can(role, 'kitchen')
  const today = todayLocal()
  const days = event.days || []

  const bufferOf = (d) => d.meal_buffer_percentage ?? event.default_meal_buffer_percentage ?? 10

  const handleStatusChange = async (day, newStatus) => {
    const opening = newStatus === 'open'
    const ok = await confirm({
      title: opening ? `Open check-in for Day ${day.day_number}?` : `Close Day ${day.day_number}?`,
      message: opening
        ? `Ushers will be able to check attendees in for ${formatDate(day.event_date)}.`
        : 'Further scans for this day will be rejected until it is reopened.',
      confirmLabel: opening ? 'Open Check-In' : 'Close Day',
      variant: opening ? 'primary' : 'danger'
    })
    if (!ok) return

    setUpdatingId(day.id)
    try {
      await eventService.updateEventDay(day.id, { status: newStatus })
      await reloadEvent()
      toast.success(`Day ${day.day_number} is now ${newStatus}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update day status')
    } finally {
      setUpdatingId(null)
    }
  }

  const openDayEditor = (day) => {
    setEditingDay(day)
    setDayForm({
      expected_walk_ins: day.expected_walk_ins ?? 0,
      meal_buffer_percentage: bufferOf(day)
    })
  }

  const saveDay = async (e) => {
    e.preventDefault()
    const walkIns = Number(dayForm.expected_walk_ins)
    const buffer = Number(dayForm.meal_buffer_percentage)
    if (Number.isNaN(walkIns) || walkIns < 0 || Number.isNaN(buffer) || buffer < 0 || buffer > 100) {
      toast.error('Walk-ins must be 0 or more, and buffer between 0 and 100.')
      return
    }
    setSavingDay(true)
    try {
      await eventService.updateEventDay(editingDay.id, {
        expected_walk_ins: walkIns,
        meal_buffer_percentage: buffer
      })
      await reloadEvent()
      toast.success(`Day ${editingDay.day_number} kitchen settings saved`)
      setEditingDay(null)
    } catch (err) {
      toast.error(err.message || 'Failed to save day settings')
    } finally {
      setSavingDay(false)
    }
  }

  const statusButton = (d) => {
    if (!canManage) return null
    return d.status !== 'open' ? (
      <Button variant="gold" size="sm" loading={updatingId === d.id} loadingText="Opening…" onClick={() => handleStatusChange(d, 'open')}>
        <Unlock size={14} />
        <span>Open Check-In</span>
      </Button>
    ) : (
      <Button variant="secondary" size="sm" loading={updatingId === d.id} loadingText="Closing…" onClick={() => handleStatusChange(d, 'closed')}>
        <Lock size={14} />
        <span>Close Day</span>
      </Button>
    )
  }

  const linkButtons = (d) => (
    <>
      {canManage && (
        <Button variant="secondary" size="sm" onClick={() => openDayEditor(d)} aria-label={`Edit Day ${d.day_number} kitchen settings`}>
          <Pencil size={14} />
          <span>Edit</span>
        </Button>
      )}
      {canAttendance && (
        <Link to={`/events/${event.id}/attendance?dayId=${d.id}`} className="btn btn-secondary btn-sm">
          <Users size={14} aria-hidden="true" />
          <span>Log</span>
        </Link>
      )}
      {canKitchen && (
        <Link to={`/events/${event.id}/kitchen?dayId=${d.id}`} className="btn btn-secondary btn-sm">
          <UtensilsCrossed size={14} aria-hidden="true" />
          <span>Kitchen</span>
        </Link>
      )}
    </>
  )

  return (
    <div>
      <SectionHeader
        title="Daily Schedule"
        subtitle="Open or close each day's check-in window and tune kitchen estimates"
        actions={can(role, 'manageEvents') && (
          <Button variant="secondary" onClick={() => setEventModalOpen(true)}>
            <Settings size={16} />
            <span>Edit Event</span>
          </Button>
        )}
      />

      {days.length === 0 ? (
        <EmptyState icon={CalendarX} title="No event days" description="This event has no generated days." />
      ) : isMobile ? (
        <div className="card-list">
          {days.map(d => (
            <div key={d.id} className="list-card">
              <div className="list-card-row">
                <div>
                  <div className="cell-title">
                    Day {d.day_number} {d.event_date === today && <span className="badge badge-gold" style={{ marginLeft: '0.35rem' }}>Today</span>}
                  </div>
                  <div className="cell-sub">{formatDate(d.event_date)}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <div className="cell-sub" style={{ marginTop: '0.4rem' }}>
                Walk-ins: {d.expected_walk_ins ?? 0} · Buffer: {bufferOf(d)}%
              </div>
              <div className="list-card-meta">
                {statusButton(d)}
                {linkButtons(d)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Date</th>
                  <th scope="col">Check-In</th>
                  <th scope="col">Walk-Ins</th>
                  <th scope="col">Meal Buffer</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {days.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700 }}>
                      Day {d.day_number}
                      {d.event_date === today && <span className="badge badge-gold" style={{ marginLeft: '0.4rem' }}>Today</span>}
                    </td>
                    <td>{formatDate(d.event_date)}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>{d.expected_walk_ins ?? 0}</td>
                    <td>{bufferOf(d)}%</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {statusButton(d)}
                        {linkButtons(d)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(editingDay)}
        onClose={() => setEditingDay(null)}
        title={editingDay ? `Day ${editingDay.day_number} Kitchen Settings` : ''}
        maxWidth="460px"
      >
        <form onSubmit={saveDay}>
          <Input
            label="Expected Walk-Ins"
            type="number"
            min="0"
            inputMode="numeric"
            value={dayForm.expected_walk_ins}
            onChange={(e) => setDayForm(f => ({ ...f, expected_walk_ins: e.target.value }))}
            helperText="Unregistered guests expected on this day"
            autoFocus
          />
          <Input
            label="Meal Buffer (%)"
            type="number"
            min="0"
            max="100"
            inputMode="decimal"
            value={dayForm.meal_buffer_percentage}
            onChange={(e) => setDayForm(f => ({ ...f, meal_buffer_percentage: e.target.value }))}
            helperText="Extra margin on top of expected meals (0 allowed)"
          />
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setEditingDay(null)} disabled={savingDay}>Cancel</Button>
            <Button type="submit" loading={savingDay}>Save</Button>
          </div>
        </form>
      </Modal>

      <EventFormModal
        isOpen={eventModalOpen}
        event={event}
        onClose={() => setEventModalOpen(false)}
        onSaved={() => reloadEvent()}
      />
    </div>
  )
}
