import React, { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { eventService } from './eventService'

export function EventFormModal({ isOpen, onClose, onCreated }) {
  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    venue: 'Berean Bible Baptist Church Sanctuary',
    start_date: today,
    end_date: today,
    start_time: '08:00',
    end_time: '17:00',
    status: 'registration_open',
    capacity: 250,
    has_registration_fee: false,
    registration_fee: 0,
    currency: 'PHP',
    payment_instructions: '',
    require_payment_before_checkin: false,
    expected_walk_ins: 15,
    default_meal_buffer_percentage: 10,
    meals_per_attendee: 1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const created = await eventService.createEvent({
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        registration_fee: formData.has_registration_fee ? parseFloat(formData.registration_fee) : 0,
        expected_walk_ins: parseInt(formData.expected_walk_ins, 10) || 0,
        default_meal_buffer_percentage: parseFloat(formData.default_meal_buffer_percentage) || 10,
        meals_per_attendee: parseFloat(formData.meals_per_attendee) || 1
      })
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Church Event" maxWidth="650px">
      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Input
          label="Event Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Berean Annual Bible Conference 2026"
          required
        />

        <div className="form-group">
          <label className="form-label">Theme / Description</label>
          <textarea
            name="description"
            rows="2"
            className="form-control"
            value={formData.description}
            onChange={handleChange}
            placeholder="Theme verse, speakers, or general conference description..."
          />
        </div>

        <Input
          label="Venue"
          name="venue"
          value={formData.venue}
          onChange={handleChange}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Start Date"
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
          />
          <Input
            label="End Date (Inclusive)"
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Daily Start Time"
            type="time"
            name="start_time"
            value={formData.start_time}
            onChange={handleChange}
          />
          <Input
            label="Daily End Time"
            type="time"
            name="end_time"
            value={formData.end_time}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Capacity Limit (Optional)"
            type="number"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
          />
          <Input
            label="Expected Walk-Ins / Day"
            type="number"
            name="expected_walk_ins"
            value={formData.expected_walk_ins}
            onChange={handleChange}
          />
        </div>

        {/* Financial Settings */}
        <div style={{
          background: 'var(--color-bg-muted)',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1rem',
          border: '1px solid var(--color-border)'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              name="has_registration_fee"
              checked={formData.has_registration_fee}
              onChange={handleChange}
            />
            <span>This is a paid event (Has Registration Fee)</span>
          </label>

          {formData.has_registration_fee && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Standard Fee (PHP)"
                  type="number"
                  step="0.01"
                  name="registration_fee"
                  value={formData.registration_fee}
                  onChange={handleChange}
                  required
                />
                <div className="form-group">
                  <label className="form-label">Check-In Policy</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      name="require_payment_before_checkin"
                      checked={formData.require_payment_before_checkin}
                      onChange={handleChange}
                    />
                    <span>Require payment verification before check-in</span>
                  </label>
                </div>
              </div>
              <Input
                label="Payment Instructions"
                name="payment_instructions"
                value={formData.payment_instructions}
                onChange={handleChange}
                placeholder="GCash or Church Treasury details..."
              />
            </div>
          )}
        </div>

        {/* Kitchen Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <Input
            label="Kitchen Buffer (%)"
            type="number"
            name="default_meal_buffer_percentage"
            value={formData.default_meal_buffer_percentage}
            onChange={handleChange}
            helperText="Default safety margin for meal prep"
          />
          <Input
            label="Meals per Attendee / Day"
            type="number"
            step="0.5"
            name="meals_per_attendee"
            value={formData.meals_per_attendee}
            onChange={handleChange}
            helperText="e.g. 1 for Lunch only, 2 for Lunch & Dinner"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Create Event & Generate Days
          </Button>
        </div>
      </form>
    </Modal>
  )
}
