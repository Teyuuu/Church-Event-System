import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useToast } from '../../components/ui/Toast'
import { eventService } from './eventService'
import { invalidateEvent } from '../../hooks/useEvent'
import { todayLocal } from '../../utils/date'

export const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft (not visible for registration)' },
  { value: 'registration_open', label: 'Registration Open' },
  { value: 'registration_closed', label: 'Registration Closed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived / Cancelled' }
]

function buildInitial(event) {
  const today = todayLocal()
  return {
    name: event?.name || '',
    description: event?.description || '',
    venue: event?.venue || 'Berean Bible Baptist Church Sanctuary',
    start_date: event?.start_date || today,
    end_date: event?.end_date || today,
    start_time: event?.start_time?.slice(0, 5) || '08:00',
    end_time: event?.end_time?.slice(0, 5) || '17:00',
    status: event?.status || 'registration_open',
    capacity: event?.capacity ?? 250,
    has_registration_fee: event?.has_registration_fee || false,
    registration_fee: event?.registration_fee ?? 0,
    currency: event?.currency || 'PHP',
    payment_instructions: event?.payment_instructions || '',
    require_payment_before_checkin: event?.require_payment_before_checkin || false,
    expected_walk_ins: event?.expected_walk_ins ?? 15,
    default_meal_buffer_percentage: event?.default_meal_buffer_percentage ?? 10,
    meals_per_attendee: event?.meals_per_attendee ?? 1
  }
}

const toNumber = (value, fallback) => {
  if (value === '' || value === null || value === undefined) return fallback
  const n = Number(value)
  return Number.isNaN(n) ? fallback : n
}

/**
 * Create a new event, or edit an existing one (pass `event`).
 * Dates are locked when editing because event days are generated from them.
 */
export function EventFormModal({ isOpen, onClose, onCreated, onSaved, event = null }) {
  const toast = useToast()
  const isEditing = Boolean(event)
  const initial = useMemo(() => buildInitial(event), [event, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  const [formData, setFormData] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      setFormData(initial)
      setError('')
      setFieldErrors({})
    }
  }, [isOpen, initial])

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initial)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setFieldErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Event name is required.'
    if (!isEditing && formData.end_date < formData.start_date) errs.end_date = 'End date must be on or after the start date.'
    if (formData.start_time && formData.end_time && formData.end_time <= formData.start_time) errs.end_time = 'End time must be after the start time.'
    if (formData.capacity !== '' && toNumber(formData.capacity, 0) < 0) errs.capacity = 'Capacity cannot be negative.'
    if (toNumber(formData.expected_walk_ins, 0) < 0) errs.expected_walk_ins = 'Cannot be negative.'
    if (formData.has_registration_fee && !(toNumber(formData.registration_fee, 0) > 0)) errs.registration_fee = 'Enter a fee greater than zero.'
    const buffer = toNumber(formData.default_meal_buffer_percentage, 0)
    if (buffer < 0 || buffer > 100) errs.default_meal_buffer_percentage = 'Use a value from 0 to 100.'
    if (toNumber(formData.meals_per_attendee, 0) <= 0) errs.meals_per_attendee = 'Must be greater than zero.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    const payload = {
      ...formData,
      capacity: formData.capacity === '' ? null : parseInt(formData.capacity, 10),
      registration_fee: formData.has_registration_fee ? parseFloat(formData.registration_fee) : 0,
      require_payment_before_checkin: formData.has_registration_fee && formData.require_payment_before_checkin,
      expected_walk_ins: toNumber(formData.expected_walk_ins, 0),
      // ?? semantics: an explicit 0% buffer is valid and must be kept
      default_meal_buffer_percentage: toNumber(formData.default_meal_buffer_percentage, 10),
      meals_per_attendee: toNumber(formData.meals_per_attendee, 1)
    }

    setLoading(true)
    try {
      if (isEditing) {
        const saved = await eventService.updateEvent(event.id, payload)
        invalidateEvent(event.id)
        toast.success('Event updated')
        onSaved?.(saved)
      } else {
        const created = await eventService.createEvent(payload)
        toast.success(`Created “${created.name}”`)
        onCreated?.(created)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Create New Church Event'}
      maxWidth="680px"
      isDirty={isDirty && !loading}
    >
      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Event Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Berean Annual Bible Conference 2026"
          error={fieldErrors.name}
          required
          autoFocus
        />

        <div className="form-group">
          <label className="form-label" htmlFor="evt-description">Theme / Description</label>
          <textarea
            id="evt-description"
            name="description"
            rows="2"
            className="form-control"
            value={formData.description}
            onChange={handleChange}
            placeholder="Theme verse, speakers, or general conference description..."
          />
        </div>

        <div className="form-row">
          <Input label="Venue" name="venue" value={formData.venue} onChange={handleChange} required />
          {isEditing && (
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={EVENT_STATUS_OPTIONS}
              helperText="Closing or archiving stops public self-registration."
            />
          )}
        </div>

        <div className="form-row">
          <Input
            label="Start Date"
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            disabled={isEditing}
            required
          />
          <Input
            label="End Date (Inclusive)"
            type="date"
            name="end_date"
            min={formData.start_date}
            value={formData.end_date}
            onChange={handleChange}
            disabled={isEditing}
            error={fieldErrors.end_date}
            helperText={isEditing ? 'Dates are fixed after creation because daily schedules are generated from them.' : undefined}
            required
          />
        </div>

        <div className="form-row">
          <Input label="Daily Start Time" type="time" name="start_time" value={formData.start_time} onChange={handleChange} />
          <Input label="Daily End Time" type="time" name="end_time" value={formData.end_time} onChange={handleChange} error={fieldErrors.end_time} />
        </div>

        <div className="form-row">
          <Input
            label="Capacity Limit (Optional)"
            type="number"
            min="0"
            inputMode="numeric"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            error={fieldErrors.capacity}
          />
          <Input
            label="Expected Walk-Ins / Day"
            type="number"
            min="0"
            inputMode="numeric"
            name="expected_walk_ins"
            value={formData.expected_walk_ins}
            onChange={handleChange}
            error={fieldErrors.expected_walk_ins}
          />
        </div>

        {/* Financial Settings */}
        <fieldset className="fieldset-box">
          <legend className="sr-only">Registration fee</legend>
          <label className="checkbox-label" style={{ fontWeight: 600 }}>
            <input
              type="checkbox"
              name="has_registration_fee"
              checked={formData.has_registration_fee}
              onChange={handleChange}
            />
            <span>This is a paid event (has a registration fee)</span>
          </label>

          {formData.has_registration_fee && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="form-row">
                <Input
                  label="Standard Fee (PHP)"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  name="registration_fee"
                  value={formData.registration_fee}
                  onChange={handleChange}
                  error={fieldErrors.registration_fee}
                  required
                />
                <div className="form-group">
                  <span className="form-label">Check-In Policy</span>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="require_payment_before_checkin"
                      checked={formData.require_payment_before_checkin}
                      onChange={handleChange}
                    />
                    <span>Require payment before check-in</span>
                  </label>
                </div>
              </div>
              <Input
                label="Payment Instructions"
                name="payment_instructions"
                value={formData.payment_instructions}
                onChange={handleChange}
                placeholder="GCash or Church Treasury details..."
                className=""
              />
            </div>
          )}
        </fieldset>

        {/* Kitchen Settings */}
        <div className="form-row">
          <Input
            label="Kitchen Buffer (%)"
            type="number"
            min="0"
            max="100"
            inputMode="decimal"
            name="default_meal_buffer_percentage"
            value={formData.default_meal_buffer_percentage}
            onChange={handleChange}
            error={fieldErrors.default_meal_buffer_percentage}
            helperText="Safety margin for meal prep (0 is allowed)"
          />
          <Input
            label="Meals per Attendee / Day"
            type="number"
            step="0.5"
            min="0.5"
            inputMode="decimal"
            name="meals_per_attendee"
            value={formData.meals_per_attendee}
            onChange={handleChange}
            error={fieldErrors.meals_per_attendee}
            helperText="1 = lunch only, 2 = lunch & dinner"
          />
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Event & Generate Days'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
