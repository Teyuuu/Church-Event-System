import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { accountService } from './accountService'
import { useAuth } from '../auth/AuthContext'
import { AccountModal } from './AccountModal'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState, getErrorMessage } from '../../components/ui/ErrorState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { SearchInput } from '../../components/ui/SearchInput'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { formatDate } from '../../utils/date'
import { Users, UserPlus, Pencil, Trash2, Power } from 'lucide-react'

export function AccountsPage() {
  const { currentUser } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const isMobile = useIsMobile()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)

  const loadAccounts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      setAccounts(await accountService.getAccounts())
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const openCreate = () => {
    setSelectedAccount(null)
    setIsModalOpen(true)
  }

  const handleToggleStatus = async (acc) => {
    if (acc.is_active) {
      const ok = await confirm({
        title: `Deactivate ${acc.full_name}?`,
        message: 'They will no longer be able to sign in. You can reactivate the account at any time.',
        confirmLabel: 'Deactivate',
        variant: 'danger'
      })
      if (!ok) return
    }
    try {
      await accountService.toggleAccountStatus(acc.id, currentUser?.id)
      toast.success(`${acc.full_name} is now ${acc.is_active ? 'deactivated' : 'active'}`)
      loadAccounts({ silent: true })
    } catch (err) {
      toast.error(err.message || 'Failed to update account status.')
    }
  }

  const handleDelete = async (acc) => {
    const ok = await confirm({
      title: `Permanently delete ${acc.full_name}?`,
      message: 'This cannot be undone. Consider deactivating instead so their activity history stays linked to a named account.',
      confirmLabel: 'Delete Account',
      variant: 'danger'
    })
    if (!ok) return
    try {
      await accountService.deleteAccount(acc.id, currentUser?.id)
      toast.success(`Deleted account for ${acc.full_name}`)
      loadAccounts({ silent: true })
    } catch (err) {
      toast.error(err.message || 'Failed to delete account.')
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return accounts.filter(acc => {
      const matchesSearch = acc.full_name.toLowerCase().includes(q) || acc.email.toLowerCase().includes(q)
      const matchesRole = roleFilter === 'all' || acc.role === roleFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && acc.is_active) ||
        (statusFilter === 'inactive' && !acc.is_active)
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [accounts, searchQuery, roleFilter, statusFilter])

  const countRole = (role) => accounts.filter(a => a.role === role).length

  const menuItemsFor = (acc) => {
    const isSelf = acc.id === currentUser?.id
    return [
      { label: 'Edit account', icon: Pencil, onClick: () => { setSelectedAccount(acc); setIsModalOpen(true) } },
      { label: acc.is_active ? 'Deactivate' : 'Activate', icon: Power, onClick: () => handleToggleStatus(acc), hidden: isSelf },
      { label: 'Delete', icon: Trash2, onClick: () => handleDelete(acc), danger: true, hidden: isSelf }
    ]
  }

  const avatar = (acc) => (
    <span className="avatar" style={{ width: 38, height: 38, background: 'var(--color-brand-navy-900)', color: 'var(--color-brand-yellow-500)' }} aria-hidden="true">
      {acc.full_name?.charAt(0).toUpperCase() || 'U'}
    </span>
  )

  const statusBadge = (acc) => acc.is_active
    ? <span className="badge badge-success">Active</span>
    : <span className="badge badge-danger">Deactivated</span>

  return (
    <div>
      <PageHeader
        title="Staff Accounts"
        subtitle="Add volunteers and administrators and manage their roles"
        actions={
          <Button variant="gold" onClick={openCreate}>
            <UserPlus size={18} />
            <span>Add Staff Account</span>
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="Loading staff accounts..." />
      ) : error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => loadAccounts()} />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard title="Total Accounts" value={accounts.length} subtitle={`${accounts.filter(a => a.is_active).length} active`} />
            <StatCard title="Administrators" value={countRole('admin')} subtitle="Full system control" />
            <StatCard title="Registrars" value={countRole('registrar')} tone="gold" subtitle="Desk entry & finances" />
            <StatCard title="Ushers & Kitchen" value={countRole('usher') + countRole('kitchen')} tone="info" subtitle={`${countRole('usher')} ushers · ${countRole('kitchen')} kitchen`} />
          </div>

          <div className="card mb-15" style={{ padding: '1rem' }}>
            <div className="filter-bar">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name or email…" label="Search accounts" />
              <div>
                <label htmlFor="acc-role" className="sr-only">Role</label>
                <select id="acc-role" className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="all">All Roles</option>
                  <option value="admin">Administrator</option>
                  <option value="registrar">Registrar</option>
                  <option value="usher">Usher</option>
                  <option value="kitchen">Kitchen Staff</option>
                </select>
              </div>
              <div>
                <label htmlFor="acc-status" className="sr-only">Status</label>
                <select id="acc-status" className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Deactivated Only</option>
                </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No staff accounts match your filters"
              description="Try another search, or add a new account."
              actionLabel="Add Staff Account"
              onAction={openCreate}
              secondaryLabel="Clear filters"
              onSecondary={() => { setSearchQuery(''); setRoleFilter('all'); setStatusFilter('all') }}
              icon={Users}
            />
          ) : (
            <div className="card">
              {isMobile ? (
                <div className="card-list">
                  {filtered.map(acc => (
                    <div key={acc.id} className="list-card">
                      <div className="list-card-row">
                        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', minWidth: 0 }}>
                          {avatar(acc)}
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-title">
                              {acc.full_name} {acc.id === currentUser?.id && <span className="text-gold" style={{ fontSize: '0.75rem' }}>(You)</span>}
                            </div>
                            <div className="cell-sub" style={{ wordBreak: 'break-all' }}>{acc.email}</div>
                          </div>
                        </div>
                        <ActionMenu label={`Actions for ${acc.full_name}`} items={menuItemsFor(acc)} />
                      </div>
                      <div className="list-card-meta">
                        <StatusBadge status={acc.role} />
                        {statusBadge(acc)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Staff Member</th>
                        <th scope="col">Role</th>
                        <th scope="col">Status</th>
                        <th scope="col">Created</th>
                        <th scope="col" style={{ width: '56px' }}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(acc => (
                        <tr key={acc.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {avatar(acc)}
                              <div>
                                <div className="cell-title">
                                  {acc.full_name} {acc.id === currentUser?.id && <span className="text-gold" style={{ fontSize: '0.75rem', fontWeight: 600 }}>(You)</span>}
                                </div>
                                <div className="cell-sub">{acc.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><StatusBadge status={acc.role} /></td>
                          <td>{statusBadge(acc)}</td>
                          <td style={{ fontSize: '0.85rem' }}>{formatDate(acc.created_at)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <ActionMenu label={`Actions for ${acc.full_name}`} items={menuItemsFor(acc)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        account={selectedAccount}
        currentUserId={currentUser?.id}
        onSaved={() => {
          toast.success(selectedAccount ? 'Staff account updated' : 'New staff account created')
          loadAccounts({ silent: true })
        }}
      />
    </div>
  )
}
