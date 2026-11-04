import React, { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useToast } from '../../components/ui/Toast'
import { attendeeService } from './attendeeService'
import { isValidPhMobile, PH_MOBILE_HINT } from '../../utils/validation'
import { Plus, Trash2 } from 'lucide-react'

const MEMBER_CLASSES = [
  { value: 'member', label: 'Member' },
  { value: 'youth', label: 'Youth' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'guest', label: 'Guest' }
]

const newMember = (lastName = '') => ({ firstName: '', lastName, classification: 'member' })

export function FamilyRegistrationModal({ isOpen, onClose, eventId, onRegistered }) {
  const toast = useToast()
  const [familyName, setFamilyName] = useState('')
  const [primaryContact, setPrimaryContact] = useState('')
  const [members, setMembers] = useState([newMember(), newMember()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFamilyName('')
      setPrimaryContact('')
      setMembers([newMember(), newMember()])
      setError('')
      setPhoneError('')
    }
  }, [isOpen])

  const surname = familyName.replace(/\s*family\s*/i, '').trim()
  const isDirty = Boolean(familyName || primaryContact || members.some(m => m.firstName || m.lastName))

  const handleMemberChange = (index, field, value) => {
    setMembers(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addMember = () => setMembers(prev => [...prev, newMember(surname)])

  const removeMember = (index) => {
    if (members.length <= 1) return
    setMembers(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!familyName.trim()) {
      setError('Family / Household Name is required.')
      return
    }
    if (!isValidPhMobile(primaryContact)) {
      setPhoneError(PH_MOBILE_HINT)
      return
    }

    // Fill in empty last names with the family surname
    const prepared = members.map(m => ({ ...m, lastName: m.lastName.trim() || surname }))
    const validMembers = prepared.filter(m => m.firstName.trim() && m.lastName.trim())
    if (validMembers.length === 0) {
      setError('Add at least one member with a first name.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const result = await attendeeService.registerFamily({
        eventId,
        familyName,
        primaryContact,
        members: validMembers,
        source: 'staff_assisted'
      })
      toast.success(`${familyName} registered — ${validMembers.length} QR passes issued`)
      onRegistered(result)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to register family')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Family / Group Registration" maxWidth="680px" isDirty={isDirty && !loading}>
      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <Input
            label="Family / Household Name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="e.g. Dela Cruz Family"
            required
            autoFocus
          />
          <Input
            label="Primary Contact #"
            type="tel"
            inputMode="tel"
            value={primaryContact}
            onChange={(e) => { setPrimaryContact(e.target.value); setPhoneError('') }}
            placeholder="e.g. 0917-000-0000"
            error={phoneError}
          />
        </div>

        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Family Members ({members.length})</h3>
          <Button variant="secondary" size="sm" onClick={addMember}>
            <Plus size={14} />
            <span>Add Member</span>
          </Button>
        </div>
        {surname && (
          <p className="form-text" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
            Leave a last name blank to use &ldquo;{surname}&rdquo;.
          </p>
        )}

        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {members.map((m, idx) => (
            <li key={idx} className="fieldset-box" style={{ marginBottom: 0, padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>Member {idx + 1}</strong>
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(idx)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-danger)' }}
                    aria-label={`Remove member ${idx + 1}`}
                  >
                    <Trash2 size={16} />
                    <span className="hide-sm">Remove</span>
                  </button>
                )}
              </div>
              <div className="form-row form-row-3">
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" htmlFor={`fm-first-${idx}`}>First name *</label>
                  <input
                    id={`fm-first-${idx}`}
                    type="text"
                    className="form-control"
                    value={m.firstName}
                    onChange={(e) => handleMemberChange(idx, 'firstName', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" htmlFor={`fm-last-${idx}`}>Last name</label>
                  <input
                    id={`fm-last-${idx}`}
                    type="text"
                    className="form-control"
                    placeholder={surname || ''}
                    value={m.lastName}
                    onChange={(e) => handleMemberChange(idx, 'lastName', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" htmlFor={`fm-class-${idx}`}>Classification</label>
                  <select
                    id={`fm-class-${idx}`}
                    className="form-select"
                    value={m.classification}
                    onChange={(e) => handleMemberChange(idx, 'classification', e.target.value)}
                  >
                    {MEMBER_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="form-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} loadingText="Registering…">
            Register Family & Generate QR Codes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
