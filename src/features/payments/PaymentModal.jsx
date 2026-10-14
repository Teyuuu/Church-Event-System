import React, { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { paymentService } from './paymentService'
import { formatDate } from '../../utils/date'
import { DollarSign, ShieldCheck, Check } from 'lucide-react'

export function PaymentModal({ isOpen, onClose, registration, event, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fee = event?.registration_fee || 0
  const attendeeName = registration?.attendee
    ? `${registration.attendee.first_name} ${registration.attendee.last_name}`
    : 'Attendee'

  useEffect(() => {
    async function fetchPayments() {
      if (!registration?.id) return
      try {
        const history = await paymentService.getPaymentsByRegistration(registration.id)
        setPayments(history)
        const totalPaid = history
          .filter(p => p.payment_status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0)
        const remaining = Math.max(0, fee - totalPaid)
        setAmount(remaining > 0 ? remaining.toFixed(2) : '0.00')
      } catch (err) {
        console.error('Failed to load payments:', err)
      }
    }
    fetchPayments()
  }, [registration, fee])

  const totalPaid = payments
    .filter(p => p.payment_status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
  const remainingBalance = Math.max(0, fee - totalPaid)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid payment amount greater than zero.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await paymentService.recordPayment({
        registrationId: registration.id,
        amount,
        paymentMethod: method,
        referenceNumber: reference,
        notes
      })
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const handleWaive = async () => {
    if (!window.confirm('Are you sure you want to approve a pastoral fee waiver for this attendee?')) return
    setLoading(true)
    try {
      await paymentService.waivePayment(registration.id)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to waive payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Event Registration Payment" maxWidth="560px">
      {/* Attendee Summary Header */}
      <div style={{
        background: 'var(--color-bg-muted)',
        padding: '1rem',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '1.25rem',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
          Registration Details
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-brand-navy-900)', marginTop: '0.2rem' }}>
          {attendeeName}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          <div>Standard Fee: <strong>₱{fee.toFixed(2)}</strong></div>
          <div>Total Paid: <strong style={{ color: 'var(--color-success)' }}>₱{totalPaid.toFixed(2)}</strong></div>
          <div>Balance: <strong style={{ color: remainingBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>₱{remainingBalance.toFixed(2)}</strong></div>
        </div>
      </div>

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

      {remainingBalance <= 0 && registration?.payment_status === 'paid' ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.5rem'
          }}>
            <Check size={28} />
          </div>
          <p style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '1.1rem' }}>
            Paid in Full
          </p>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            This registration has no outstanding balance.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
            <Input
              label="Amount to Pay (PHP)"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="cash">Cash (Office)</option>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Input
            label="Transaction Reference / Receipt #"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. GCash Ref # or Church OR #"
          />

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              className="form-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received by Sis. Mary at church lobby"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={handleWaive}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-brand-gold-600)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'underline'
              }}
            >
              Approve Pastoral Fee Waiver
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                Save Payment Receipt
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
