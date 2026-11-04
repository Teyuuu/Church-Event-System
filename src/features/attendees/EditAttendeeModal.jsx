import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useToast } from '../../components/ui/Toast'
import { attendeeService } from './attendeeService'
import { CLASSIFICATION_OPTIONS, SOURCE_OPTIONS } from './classifications'
import { isValidPhMobile, PH_MOBILE_HINT } from '../../utils/validation'

function buildInitial(registration, eventDays) {
  const attendee = registration?.attendee || {}
  return {
    firstName: attendee.first_name || '',
    middleName: attendee.middle_name || '',
    lastName: attendee.last_name || '',
    contactNumber: attendee.contact_number || '',
    email: attendee.email || '',
    classification: attendee.classification || 'visitor',
    source: registration?.registration_source || 'staff_assisted',
    familyName: attendee.households?.family_name || '',
    selectedDays: registration?.selected_day_ids?.length > 0
      ? registration.selected_day_ids
      : eventDays.map(d => d.id)
  }
}

export function EditAttendeeModal({
  isOpen,
  onClose,
  registration,
  eventDays = [],
  onSaved
}) {
  const toast = useToast()
  const attendee = registration?.attendee
  const initial = useMemo(() => buildInitial(registration, eventDays), [registration, eventDays])
  const [formData, setFormData] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  useEffect(() => {
    setFormData(initial)
    setError('')
    setPhoneError('')
  }, [initial])

  if (!registration || !attendee) return null

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initial)

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

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required.')
      return
    }
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
      toast.success(`Updated ${formData.firstName} ${formData.lastName}`)
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
      isDirty={isDirty && !loading}
    >
      <form onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}

        <div className="form-row">
          <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
          <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
        </div>

        <div className="form-row">
          <Input label="Middle Name (Optional)" name="middleName" value={formData.middleName} onChange={handleChange} />
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
            value={formData.contactNumber}
            onChange={handleChange}
            placeholder="e.g. 0917-123-4567"
            error={phoneError}
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

        <div className="form-row">
          <Input
            label="Family / Household Name (Optional)"
            name="familyName"
            value={formData.familyName}
            onChange={handleChange}
            placeholder="e.g. Santos Family"
          />
          <Select
            label="Registration Source"
            name="source"
            value={formData.source}
            onChange={handleChange}
            options={SOURCE_OPTIONS}
          />
        </div>

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

        <Alert variant="info">
          The attendee&apos;s existing QR code stays valid after editing. Re-download the PDF pass or re-print the badge if the printed name needs updating.
        </Alert>

        <div className="form-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
