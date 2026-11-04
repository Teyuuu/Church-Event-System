import React, { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { paymentService } from './paymentService'
import { formatDateTime } from '../../utils/date'
import { Check } from 'lucide-react'

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash (Office)' },
  { value: 'gcash', label: 'GCash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' }
]

const peso = (n) => `₱${Number(n || 0).toFixed(2)}`

export function PaymentModal({ isOpen, onClose, registration, event, onSuccess }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [payments, setPayments] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fee = event?.registration_fee || 0
  const attendeeName = registration?.attendee
    ? `${registration.attendee.first_name} ${registration.attendee.last_name}`
    : 'Attendee'

  useEffect(() => {
    let cancelled = false
    async function fetchPayments() {
      if (!registration?.id) return
      setHistoryLoading(true)
      try {
        const history = await paymentService.getPaymentsByRegistration(registration.id)
        if (cancelled) return
        setPayments(history)
        const paid = history
          .filter(p => p.payment_status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        const remaining = Math.max(0, fee - paid)
        setAmount(remaining > 0 ? remaining.toFixed(2) : '')
      } catch {
        if (!cancelled) setError('Could not load payment history.')
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }
    fetchPayments()
    return () => { cancelled = true }
  }, [registration, fee])

  const totalPaid = payments
    .filter(p => p.payment_status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const remainingBalance = Math.max(0, fee - totalPaid)
  const isSettled = registration?.payment_status === 'waived' || (remainingBalance <= 0 && registration?.payment_status === 'paid')
  const isDirty = Boolean(reference || notes)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError('Enter a payment amount greater than zero.')
      return
    }
    if (value > remainingBalance && remainingBalance > 0) {
      const ok = await confirm({
        title: 'Amount exceeds balance',
        message: `${peso(value)} is more than the remaining balance of ${peso(remainingBalance)}. Record it anyway?`,
        confirmLabel: 'Record Payment'
      })
      if (!ok) return
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
      toast.success(`Recorded ${peso(value)} payment for ${attendeeName}`)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const handleWaive = async () => {
    const reason = await confirm({
      title: 'Approve fee waiver',
      message: `Waive the remaining registration fee for ${attendeeName}? This is recorded in the audit log.`,
      confirmLabel: 'Approve Waiver',
      input: { label: 'Reason and approver', placeholder: 'e.g. Pastoral waiver approved by Ptr. David', required: true }
    })
    if (!reason) return

    setLoading(true)
    try {
      await paymentService.waivePayment(registration.id, reason, attendeeName)
      toast.success(`Fee waived for ${attendeeName}`)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to waive payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registration Payment" maxWidth="560px" isDirty={isDirty && !loading}>
      <div className="fieldset-box">
        <div className="stat-title" style={{ marginBottom: '0.15rem' }}>Attendee</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-brand-navy-900)' }}>
          {attendeeName}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1.25rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          <span>Fee: <strong>{peso(fee)}</strong></span>
          <span>Paid: <strong style={{ color: 'var(--color-success)' }}>{peso(totalPaid)}</strong></span>
          <span>Balance: <strong style={{ color: remainingBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{peso(remainingBalance)}</strong></span>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {payments.length > 0 && (
        <details style={{ marginBottom: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-brand-navy-800)' }}>
            Payment history ({payments.length})
          </summary>
          <ul style={{ listStyle: 'none', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {payments.map(p => (
              <li key={p.id} className="recent-item">
                <span><strong>{peso(p.amount)}</strong> · {(p.payment_method || '').replace('_', ' ')}{p.reference_number ? ` · ${p.reference_number}` : ''}</span>
                <span className="cell-sub">{formatDateTime(p.paid_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {isSettled ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <div className="empty-state-icon" style={{ margin: '0 auto 0.5rem', background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <Check size={28} aria-hidden="true" />
          </div>
          <p style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '1.1rem' }}>
            {registration?.payment_status === 'waived' ? 'Fee Waived' : 'Paid in Full'}
          </p>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            This registration has no outstanding balance.
          </p>
          <div className="form-actions" style={{ justifyContent: 'center' }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <Input
              label="Amount (PHP)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={historyLoading}
              required
              autoFocus
            />
            <Select
              label="Payment Method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={METHOD_OPTIONS}
            />
          </div>

          <Input
            label={method === 'cash' ? 'Official Receipt # (Optional)' : 'Transaction Reference #'}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. GCash Ref # or Church OR #"
            required={method === 'gcash' || method === 'bank_transfer'}
          />

          <Input
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Received by Sis. Mary at church lobby"
          />

          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <Button variant="ghost" onClick={handleWaive} disabled={loading} style={{ color: 'var(--color-brand-gold-600)' }}>
              Approve Fee Waiver
            </Button>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading} disabled={historyLoading}>
                Save Payment
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
