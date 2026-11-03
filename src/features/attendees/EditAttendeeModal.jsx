import React, { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { attendeeService } from './attendeeService'
import { CheckCircle2 } from 'lucide-react'

export function EditAttendeeModal({
  isOpen,
  onClose,
  registration,
  eventDays = [],
  onSaved
}) {
  const attendee = registration?.attendee

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    classification: 'visitor',
    source: 'staff_assisted',
    familyName: '',
    selectedDays: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (registration && attendee) {
      const initialDays =
        registration.selected_day_ids?.length > 0
          ? registration.selected_day_ids
          : eventDays.map(d => d.id)

      setFormData({
        firstName: attendee.first_name || '',
        middleName: attendee.middle_name || '',
        lastName: attendee.last_name || '',
        contactNumber: attendee.contact_number || '',
        email: attendee.email || '',
        classification: attendee.classification || 'visitor',
        source: registration.registration_source || 'staff_assisted',
        familyName: attendee.households?.family_name || '',
        selectedDays: initialDays
      })
      setError('')
    }
  }, [registration, attendee, eventDays])

  if (!registration || !attendee) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDayToggle = (dayId) => {
    setFormData(prev => {
      const exists = prev.selectedDays.includes(dayId)
      return {
        ...prev,
        selectedDays: exists
          ? prev.selectedDays.filter(id => id !== dayId)
          : [...prev.selectedDays, dayId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required.')
      return
    }

    setLoading(true)
    try {
      await attendeeService.updateAttendeeRegistration({
        registrationId: registration.id,
        attendeeId: attendee.id,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        email: formData.email,
        classification: formData.classification,
        source: formData.source,
        familyName: formData.familyName,
        selectedDayIds: formData.selectedDays
      })

      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update attendee details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Registered Attendee"
      maxWidth="650px"
    >
      <form onSubmit={handleSubmit}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Middle Name (Optional)"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
          />
          <div className="form-group">
            <label className="form-label">Classification</label>
            <select
              name="classification"
              className="form-select"
              value={formData.classification}
              onChange={handleChange}
            >
              <option value="member">Church Member</option>
              <option value="visitor">First-time Visitor</option>
              <option value="youth">Youth</option>
              <option value="pastor">Pastor / Minister</option>
              <option value="worker">Church Worker</option>
              <option value="guest">Invited Guest</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Mobile / Contact #"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            placeholder="e.g. 0917-123-4567"
          />
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g. attendee@email.com"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Family / Household Name (Optional)"
            name="familyName"
            value={formData.familyName}
            onChange={handleChange}
            placeholder="e.g. Santos Family"
          />
          <div className="form-group">
            <label className="form-label">Registration Source</label>
            <select
              name="source"
              className="form-select"
              value={formData.source}
              onChange={handleChange}
            >
              <option value="paper">Paper Registration Sheet (Physical form)</option>
              <option value="staff_assisted">Staff-Assisted Digital Entry</option>
              <option value="online">Online Direct Submission</option>
            </select>
          </div>
        </div>

        {/* Multi-day selection */}
        {eventDays.length > 1 && (
          <div className="form-group" style={{ background: 'var(--color-bg-muted)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>
              Attending Days:
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {eventDays.map(d => (
                <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.selectedDays.includes(d.id)}
                    onChange={() => handleDayToggle(d.id)}
                  />
                  <span>Day {d.day_number}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem 0.85rem',
          backgroundColor: 'var(--color-bg-muted)',
          color: 'var(--color-text-muted)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          marginBottom: '1.25rem'
        }}>
          <CheckCircle2 size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
          <span>
            The attendee&apos;s existing QR code remains valid after editing. Re-download the PDF Pass or re-print the badge if you need the updated spelling on their physical card.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}

