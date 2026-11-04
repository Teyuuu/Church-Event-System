import React, { useEffect, useRef, useState } from 'react'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useToast } from '../../components/ui/Toast'
import { attendeeService } from './attendeeService'
import { CLASSIFICATION_OPTIONS, SOURCE_OPTIONS } from './classifications'
import { isValidPhMobile, PH_MOBILE_HINT } from '../../utils/validation'
import { CheckCircle2 } from 'lucide-react'

const EMPTY_PERSON = {
  firstName: '',
  middleName: '',
  lastName: '',
  contactNumber: '',
  email: '',
  classification: 'visitor'
}

export function RegistrationForm({
  eventId,
  eventDays = [],
  defaultSource = 'staff_assisted',
  onSuccess,
  onCancel,
  onDirtyChange,
  existingAttendees = []
}) {
  const toast = useToast()
  const firstNameRef = useRef(null)
  const [formData, setFormData] = useState({
    ...EMPTY_PERSON,
    source: defaultSource,
    selectedDays: eventDays.map(d => d.id)
  })
  const [keepOpen, setKeepOpen] = useState(defaultSource === 'paper')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [recent, setRecent] = useState([])

  const isDirty = Boolean(
    formData.firstName || formData.lastName || formData.middleName || formData.contactNumber || formData.email
  )

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Duplicate check (name match against already registered attendees)
  const duplicate = (() => {
    const fn = formData.firstName.trim().toLowerCase()
    const ln = formData.lastName.trim().toLowerCase()
    if (!fn || !ln) return null
    return existingAttendees.find(
      a => a.first_name?.toLowerCase() === fn && a.last_name?.toLowerCase() === ln
    ) || null
  })()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'contactNumber') setPhoneError('')
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

    if (!isValidPhMobile(formData.contactNumber)) {
      setPhoneError(PH_MOBILE_HINT)
      return
    }
    if (eventDays.length > 1 && formData.selectedDays.length === 0) {
      setError('Select at least one attending day.')
      return
    }

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

      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`
      toast.success(`Saved: ${fullName} — QR pass issued`)
      if (onSuccess) onSuccess(result, { keepOpen })

      if (keepOpen) {
        setRecent(prev => [{ id: result?.registrationId || Date.now(), name: fullName }, ...prev].slice(0, 5))
        // Reset person fields for the next paper entry; keep days + source
        setFormData(prev => ({ ...prev, ...EMPTY_PERSON }))
        setTimeout(() => firstNameRef.current?.focus(), 0)
      }
    } catch (err) {
      setError(err.message || 'Failed to complete registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      {error && <Alert variant="error">{error}</Alert>}

      {duplicate && (
        <Alert variant="warning" title="Possible duplicate">
          &ldquo;{duplicate.first_name} {duplicate.last_name}&rdquo;
          {duplicate.contact_number ? ` (${duplicate.contact_number})` : ''} is already registered for this event.
          Check before saving again.
        </Alert>
      )}

      <div className="form-row">
        <Input
          label="First Name"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          autoComplete="off"
          ref={firstNameRef}
          required
          autoFocus
        />
        <Input
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          autoComplete="off"
          required
        />
      </div>

      <div className="form-row">
        <Input
          label="Middle Name (Optional)"
          name="middleName"
          value={formData.middleName}
          onChange={handleChange}
          autoComplete="off"
        />
        <Select
          label="Classification"
          name="classification"
          value={formData.classification}
          onChange={handleChange}
          options={CLASSIFICATION_OPTIONS}
        />
      </div>

      <div className="form-row">
        <Input
          label="Mobile / Contact #"
          name="contactNumber"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={formData.contactNumber}
          onChange={handleChange}
          placeholder="e.g. 0917-123-4567"
          error={phoneError}
        />
        <Input
          label="Email Address"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="off"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g. attendee@email.com"
        />
      </div>

      <Select
        label="Registration Source"
        name="source"
        value={formData.source}
        onChange={handleChange}
        options={SOURCE_OPTIONS}
      />

      {eventDays.length > 1 && (
        <fieldset className="fieldset-box">
          <legend className="form-label" style={{ float: 'left', width: '100%' }}>Attending Days</legend>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', clear: 'both' }}>
            {eventDays.map(d => (
              <label key={d.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.selectedDays.includes(d.id)}
                  onChange={() => handleDayToggle(d.id)}
                />
                <span>Day {d.day_number}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="checkbox-label" style={{ marginBottom: '0.5rem' }}>
        <input
          type="checkbox"
          checked={keepOpen}
          onChange={(e) => setKeepOpen(e.target.checked)}
        />
        <span><strong>Rapid entry:</strong> keep this form open after saving</span>
      </label>

      {recent.length > 0 && (
        <div className="fieldset-box" style={{ marginTop: '0.75rem' }} aria-live="polite">
          <div className="form-label" style={{ marginBottom: '0.35rem' }}>Saved this session</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {recent.map(r => (
              <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--color-success)', fontWeight: 600 }}>
                <CheckCircle2 size={15} aria-hidden="true" /> {r.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-actions">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {recent.length > 0 ? 'Done' : 'Cancel'}
          </Button>
        )}
        <Button type="submit" variant="primary" loading={loading} loadingText="Saving…">
          Save Registration & Issue QR
        </Button>
      </div>
    </form>
  )
}
