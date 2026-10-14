import React, { useState } from 'react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { attendeeService } from './attendeeService'
import { AlertCircle } from 'lucide-react'

export function RegistrationForm({
  eventId,
  eventDays = [],
  defaultSource = 'staff_assisted',
  onSuccess,
  onCancel,
  existingAttendees = []
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    classification: 'visitor',
    source: defaultSource,
    selectedDays: eventDays.map(d => d.id)
  })
  const [keepOpen, setKeepOpen] = useState(defaultSource === 'paper')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Duplicate check on name blur
    if (name === 'lastName' || name === 'firstName') {
      const fn = name === 'firstName' ? value : formData.firstName
      const ln = name === 'lastName' ? value : formData.lastName
      if (fn.trim() && ln.trim()) {
        const match = existingAttendees.find(
          a => a.first_name.toLowerCase() === fn.trim().toLowerCase() &&
               a.last_name.toLowerCase() === ln.trim().toLowerCase()
        )
        if (match) {
          setDuplicateWarning(`Note: An attendee named "${match.first_name} ${match.last_name}" is already registered.`)
        } else {
          setDuplicateWarning(null)
        }
      }
    }
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
    setLoading(true)

    try {
      const result = await attendeeService.registerAttendee({
        eventId,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        email: formData.email,
        classification: formData.classification,
        source: formData.source,
        selectedDayIds: formData.selectedDays
      })

      if (onSuccess) onSuccess(result)

      if (keepOpen) {
        // Reset form for next paper entry while keeping day selections
        setFormData(prev => ({
          ...prev,
          firstName: '',
          middleName: '',
          lastName: '',
          contactNumber: '',
          email: '',
          classification: 'visitor'
        }))
        setDuplicateWarning(null)
      }
    } catch (err) {
      setError(err.message || 'Failed to complete registration')
    } finally {
      setLoading(false)
    }
  }

  return (
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

      {duplicateWarning && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          border: '1px solid #FDE68A'
        }}>
          <AlertCircle size={18} />
          <span>{duplicateWarning}</span>
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

      {/* Keep open for rapid paper entry */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-brand-navy-900)' }}>
          <input
            type="checkbox"
            checked={keepOpen}
            onChange={(e) => setKeepOpen(e.target.checked)}
          />
          <strong>Keep form open for rapid successive paper entry</strong>
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Done / Close
          </Button>
        )}
        <Button type="submit" variant="primary" loading={loading}>
          Save Registration & Issue QR
        </Button>
      </div>
    </form>
  )
}
