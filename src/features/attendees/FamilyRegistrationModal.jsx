import React, { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { attendeeService } from './attendeeService'
import { Plus, Trash2 } from 'lucide-react'

export function FamilyRegistrationModal({ isOpen, onClose, eventId, onRegistered }) {
  const [familyName, setFamilyName] = useState('')
  const [primaryContact, setPrimaryContact] = useState('')
  const [members, setMembers] = useState([
    { firstName: '', lastName: '', classification: 'member' },
    { firstName: '', lastName: '', classification: 'member' }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleMemberChange = (index, field, value) => {
    setMembers(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addMember = () => {
    setMembers(prev => [
      ...prev,
      { firstName: '', lastName: familyName.replace(/\s*Family\s*/i, '').trim(), classification: 'member' }
    ])
  }

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

    const validMembers = members.filter(m => m.firstName.trim() && m.lastName.trim())
    if (validMembers.length === 0) {
      setError('Please add at least one member with first and last name.')
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

      onRegistered(result)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to register family')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Family / Group Registration" maxWidth="650px">
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
          <Input
            label="Family / Household Name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="e.g. Dela Cruz Family"
            required
          />
          <Input
            label="Primary Contact #"
            value={primaryContact}
            onChange={(e) => setPrimaryContact(e.target.value)}
            placeholder="e.g. 0917-000-0000"
          />
        </div>

        <div style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.95rem' }}>Family Members</h4>
          <Button variant="secondary" size="sm" onClick={addMember}>
            <Plus size={14} />
            <span>Add Member</span>
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {members.map((m, idx) => (
            <div key={idx} style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.2fr 1fr auto',
              gap: '0.5rem',
              alignItems: 'center',
              background: 'var(--color-bg-muted)',
              padding: '0.65rem',
              borderRadius: 'var(--radius-sm)'
            }}>
              <input
                type="text"
                placeholder="First Name *"
                className="form-control"
                style={{ minHeight: '38px', fontSize: '0.875rem' }}
                value={m.firstName}
                onChange={(e) => handleMemberChange(idx, 'firstName', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Last Name *"
                className="form-control"
                style={{ minHeight: '38px', fontSize: '0.875rem' }}
                value={m.lastName}
                onChange={(e) => handleMemberChange(idx, 'lastName', e.target.value)}
                required
              />
              <select
                className="form-select"
                style={{ minHeight: '38px', fontSize: '0.85rem' }}
                value={m.classification}
                onChange={(e) => handleMemberChange(idx, 'classification', e.target.value)}
              >
                <option value="member">Member</option>
                <option value="youth">Youth</option>
                <option value="visitor">Visitor</option>
                <option value="guest">Guest</option>
              </select>
              {members.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMember(idx)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    padding: '0.35rem'
                  }}
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Register Family & Generate QR Codes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
