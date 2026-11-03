import React, { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { accountService } from './accountService'
import { ShieldCheck, UserCheck, Utensils, QrCode } from 'lucide-react'

export function AccountModal({
  isOpen,
  onClose,
  account = null,
  currentUserId,
  onSaved
}) {
  const isEditing = Boolean(account)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'usher',
    isActive: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (account) {
      setFormData({
        fullName: account.full_name || '',
        email: account.email || '',
        password: '',
        role: account.role || 'usher',
        isActive: account.is_active !== false
      })
    } else {
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'usher',
        isActive: true
      })
    }
    setError('')
  }, [account, isOpen])

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

    if (!formData.fullName.trim()) {
      setError('Staff full name is required.')
      return
    }
    if (!formData.email.trim()) {
      setError('Email address is required.')
      return
    }
    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (isEditing && formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      if (isEditing) {
        await accountService.updateAccount(account.id, {
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password || undefined,
          role: formData.role,
          is_active: formData.isActive
        })
      } else {
        await accountService.createAccount({
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          is_active: formData.isActive
        })
      }

      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save staff account.')
    } finally {
      setLoading(false)
    }
  }

  const isSelf = isEditing && account?.id === currentUserId

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Account: ${account.full_name}` : 'Add New Staff Account'}
      maxWidth="550px"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            border: '1px solid #FECACA'
          }}>
            {error}
          </div>
        )}

        <Input
          label="Full Name & Title"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="e.g. Pastor David Villanueva, Sis. Grace Santos"
          required
        />

        <Input
          label="Staff Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g. david.villanueva@berean.org"
          required
        />

        <div className="form-group">
          <label className="form-label">System Role & Permissions</label>
          <select
            name="role"
            className="form-select"
            value={formData.role}
            onChange={handleChange}
            disabled={isSelf}
          >
            <option value="admin">Administrator (Full System & Account Control)</option>
            <option value="registrar">Registrar (Registration, Payments & Badges)</option>
            <option value="usher">Usher (QR Scanner & Check-In Only)</option>
            <option value="kitchen">Kitchen Staff (Meal Planning Board Only)</option>
          </select>
          {isSelf && (
            <p className="form-text" style={{ color: 'var(--color-brand-gold-600)' }}>
              Note: You cannot change your own administrator role.
            </p>
          )}
        </div>

        <Input
          label={isEditing ? 'New Password (Optional)' : 'Initial Password'}
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder={isEditing ? 'Leave blank to keep existing password' : 'At least 6 characters'}
          required={!isEditing}
        />

        {/* Active Toggle */}
        <div style={{
          marginTop: '1rem',
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-bg-muted)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: isSelf ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={isSelf}
            />
            <span>Active Account (Permit sign in to system)</span>
          </label>
          {isSelf && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              You cannot deactivate your own active session.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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

