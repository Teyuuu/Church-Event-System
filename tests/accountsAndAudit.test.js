import { describe, it, expect, beforeEach } from 'vitest'
import { accountService } from '../src/features/accounts/accountService'
import { auditService } from '../src/features/audit/auditService'
import { authService } from '../src/features/auth/authService'
import { resetStore, getStore } from '../src/lib/mockStore'

describe('Account Management & Audit Trail Engine', () => {
  beforeEach(() => {
    resetStore()
  })

  it('retrieves default church staff accounts', async () => {
    const accounts = await accountService.getAccounts()
    expect(accounts.length).toBeGreaterThanOrEqual(4)

    const admin = accounts.find(a => a.role === 'admin')
    expect(admin).toBeDefined()
    expect(admin.email).toBe('admin@berean.org')
  })

  it('allows administrator to create a new staff account and logs the audit event', async () => {
    const newAccount = await accountService.createAccount({
      full_name: 'Bro. Joshua Tan',
      email: 'joshua.tan@berean.org',
      password: 'password123',
      role: 'usher',
      is_active: true
    })

    expect(newAccount.id).toBeDefined()
    expect(newAccount.full_name).toBe('Bro. Joshua Tan')
    expect(newAccount.role).toBe('usher')

    const accounts = await accountService.getAccounts()
    expect(accounts.some(a => a.email === 'joshua.tan@berean.org')).toBe(true)

    // Verify audit log entry was created
    const logs = await auditService.getAuditLogs()
    const createLog = logs.find(l => l.action === 'ACCOUNT_CREATED' && l.details.includes('Bro. Joshua Tan'))
    expect(createLog).toBeDefined()
  })

  it('prevents creating account with duplicate email', async () => {
    await expect(
      accountService.createAccount({
        full_name: 'Duplicate Admin',
        email: 'admin@berean.org',
        password: 'password123',
        role: 'admin'
      })
    ).rejects.toThrow(/already exists/i)
  })

  it('updates an existing staff account details and role', async () => {
    const accounts = await accountService.getAccounts()
    const usher = accounts.find(a => a.role === 'usher')

    await accountService.updateAccount(usher.id, {
      full_name: 'Bro. Caleb Santos (Head Usher)',
      email: 'caleb.santos@berean.org',
      role: 'registrar',
      is_active: true
    })

    const updatedAccounts = await accountService.getAccounts()
    const updated = updatedAccounts.find(a => a.id === usher.id)

    expect(updated.full_name).toBe('Bro. Caleb Santos (Head Usher)')
    expect(updated.role).toBe('registrar')
    expect(updated.email).toBe('caleb.santos@berean.org')

    const logs = await auditService.getAuditLogs()
    expect(logs.some(l => l.action === 'ACCOUNT_UPDATED')).toBe(true)
  })

  it('toggles account status and prevents deactivating own logged-in account', async () => {
    const accounts = await accountService.getAccounts()
    const kitchen = accounts.find(a => a.role === 'kitchen')

    // Toggle to inactive
    await accountService.toggleAccountStatus(kitchen.id, 'other-user')
    const updated = (await accountService.getAccounts()).find(a => a.id === kitchen.id)
    expect(updated.is_active).toBe(false)

    // Reject self-deactivation
    await expect(
      accountService.toggleAccountStatus(kitchen.id, kitchen.id)
    ).rejects.toThrow(/cannot deactivate your own/i)
  })

  it('prevents deactivated accounts from logging in', async () => {
    const accounts = await accountService.getAccounts()
    const registrar = accounts.find(a => a.role === 'registrar')

    // Deactivate registrar
    await accountService.toggleAccountStatus(registrar.id, 'admin-id')

    // Attempt login
    await expect(
      authService.login(registrar.email, 'password123')
    ).rejects.toThrow(/deactivated/i)
  })

  it('verifies audit logs can be filtered by category and search query', async () => {
    const allLogs = await auditService.getAuditLogs()
    expect(allLogs.length).toBeGreaterThan(0)

    const paymentLogs = await auditService.getAuditLogs({ category: 'payments' })
    expect(paymentLogs.every(l => l.action.startsWith('PAYMENT_') || l.entity_type === 'payment')).toBe(true)

    const searchLogs = await auditService.getAuditLogs({ searchQuery: 'Santos' })
    expect(searchLogs.length).toBeGreaterThan(0)
  })
})

