import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { accountService } from './accountService'
import { generateTempPassword } from '../../utils/validation'
import { KeyRound, Copy } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator (full system & account control)' },
  { value: 'registrar', label: 'Registrar (registration, payments & badges)' },
  { value: 'usher', label: 'Usher (QR scanner & check-in)' },
  { value: 'kitchen', label: 'Kitchen Staff (meal planning board)' }
]

function buildInitial(account) {
  return {
    fullName: account?.full_name || '',
    email: account?.email || '',
    password: '',
    role: account?.role || 'usher',
    isActive: account ? account.is_active !== false : true
  }
}

export function AccountModal({
  isOpen,
  onClose,
  account = null,
  currentUserId,
  onSaved
}) {
  const isEditing = Boolean(account)
  const initial = useMemo(() => buildInitial(account), [account, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  const [formData, setFormData] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState('')

  useEffect(() => {
    setFormData(initial)
    setError('')
    setGenerated('')
  }, [initial])

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initial)
  const isSelf = isEditing && account?.id === currentUserId

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleGenerate = () => {
    const pwd = generateTempPassword()
    setFormData(prev => ({ ...prev, password: pwd }))
    setGenerated(pwd)
  }

  const copyGenerated = async () => {
    try { await navigator.clipboard.writeText(generated) } catch { /* user can copy manually */ }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.fullName.trim()) return setError('Staff full name is required.')
    if (!formData.email.trim()) return setError('Email address is required.')
    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      return setError('Password must be at least 6 characters long.')
    }
    if (isEditing && formData.password && formData.password.length < 6) {
      return setError('Password must be at least 6 characters long.')
    }

    setLoading(true)
    try {
      const payload = {
        full_name: formData.fullName,
        email: formData.email,
        role: formData.role,
        is_active: formData.isActive
      }
      if (isEditing) {
        await accountService.updateAccount(account.id, { ...payload, password: formData.password || undefined })
      } else {
        await accountService.createAccount({ ...payload, password: formData.password })
      }
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save staff account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Account: ${account.full_name}` : 'Add Staff Account'}
      maxWidth="560px"
      isDirty={isDirty && !loading}
    >
      <form onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Full Name & Title"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="e.g. Sis. Grace Santos"
          autoComplete="off"
          required
          autoFocus
        />

        <Input
          label="Staff Email Address"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="off"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g. grace.santos@berean.org"
          required
        />

        <Select
          label="Role & Permissions"
          name="role"
          value={formData.role}
          onChange={handleChange}
          disabled={isSelf}
          options={ROLE_OPTIONS}
          helperText={isSelf ? 'You cannot change your own administrator role.' : undefined}
        />

        <Input
          label={isEditing ? 'New Password (Optional)' : 'Initial Password'}
          type="password"
          name="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          placeholder={isEditing ? 'Leave blank to keep current password' : 'At least 6 characters'}
          required={!isEditing}
          helperText="Share the password privately with the staff member."
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '-0.75rem', marginBottom: '1rem' }}>
          <Button variant="secondary" size="sm" onClick={handleGenerate}>
            <KeyRound size={14} />
            <span>Generate temporary password</span>
          </Button>
          {generated && (
            <Button variant="ghost" size="sm" onClick={copyGenerated} aria-label="Copy generated password">
              <Copy size={14} />
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{generated}</span>
            </Button>
          )}
        </div>

        <div className="fieldset-box">
          <label className="checkbox-label" style={{ fontWeight: 600, cursor: isSelf ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={isSelf}
            />
            <span>Active account (can sign in)</span>
          </label>
          {isSelf && (
            <p className="form-text">You cannot deactivate your own account.</p>
          )}
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
