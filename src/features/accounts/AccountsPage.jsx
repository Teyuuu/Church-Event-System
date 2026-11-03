import React, { useState, useEffect } from 'react'
import { accountService } from './accountService'
import { useAuth } from '../auth/AuthContext'
import { AccountModal } from './AccountModal'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../utils/date'
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Pencil,
  Trash2,
  Power,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react'

export function AccountsPage() {
  const { currentUser } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [actionNotice, setActionNotice] = useState('')

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const data = await accountService.getAccounts()
      setAccounts(data)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  // Close 3-dots action menu on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId && !e.target.closest('.action-dropdown')) {
        setOpenMenuId(null)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenuId])

  const showNotification = (msg) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(''), 3500)
  }

  const handleToggleStatus = async (acc) => {
    try {
      await accountService.toggleAccountStatus(acc.id, currentUser?.id)
      showNotification(`Account for "${acc.full_name}" is now ${acc.is_active ? 'deactivated' : 'active'}.`)
      loadAccounts()
    } catch (err) {
      alert(err.message || 'Failed to update account status.')
    }
  }

  const handleDelete = async (acc) => {
    if (acc.id === currentUser?.id) {
      alert('You cannot delete your own active administrator account.')
      return
    }

    if (window.confirm(`Are you sure you want to permanently delete the staff account for "${acc.full_name}"?`)) {
      try {
        await accountService.deleteAccount(acc.id, currentUser?.id)
        showNotification(`Account for "${acc.full_name}" has been deleted.`)
        loadAccounts()
      } catch (err) {
        alert(err.message || 'Failed to delete account.')
      }
    }
  }

  // Filter accounts
  const filtered = accounts.filter(acc => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      acc.full_name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q)

    const matchesRole = roleFilter === 'all' || acc.role === roleFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && acc.is_active) ||
      (statusFilter === 'inactive' && !acc.is_active)

    return matchesSearch && matchesRole && matchesStatus
  })

  // Role counts
  const adminCount = accounts.filter(a => a.role === 'admin').length
  const registrarCount = accounts.filter(a => a.role === 'registrar').length
  const usherCount = accounts.filter(a => a.role === 'usher').length
  const kitchenCount = accounts.filter(a => a.role === 'kitchen').length

  if (loading) return <LoadingState message="Loading staff accounts..." />

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h1>Staff Account Management</h1>
          <p className="text-muted" style={{ fontSize: '0.925rem' }}>
            Add, update roles, and manage permissions for church volunteers and administrators
          </p>
        </div>

        <Button
          variant="gold"
          onClick={() => {
            setSelectedAccount(null)
            setIsModalOpen(true)
          }}
        >
          <UserPlus size={18} />
          <span>Add Staff Account</span>
        </Button>
      </div>

      {actionNotice && (
        <div style={{
          backgroundColor: 'var(--color-success-bg)',
          color: 'var(--color-success)',
          border: '1px solid #A7F3D0',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-title">Total Staff Accounts</span>
          <span className="stat-value">{accounts.length}</span>
          <span className="stat-subtitle">Registered church users</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Administrators</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-navy-900)' }}>{adminCount}</span>
          <span className="stat-subtitle">Full system control</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Registrars</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-gold-600)' }}>{registrarCount}</span>
          <span className="stat-subtitle">Desk entry & finances</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Ushers & Kitchen</span>
          <span className="stat-value" style={{ color: 'var(--color-info)' }}>{usherCount + kitchenCount}</span>
          <span className="stat-subtitle">{usherCount} Ushers • {kitchenCount} Kitchen</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or email..."
              style={{ paddingLeft: '2.5rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="registrar">Registrar</option>
            <option value="usher">Usher / Check-In</option>
            <option value="kitchen">Kitchen Staff</option>
          </select>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No staff accounts match your filters"
          description="Try modifying your search or add a new church account."
          actionLabel="Add Staff Account"
          onAction={() => {
            setSelectedAccount(null)
            setIsModalOpen(true)
          }}
          icon={Users}
        />
      ) : (
        <div className="card">
          <div className="table-responsive" style={{ minHeight: '260px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'center', width: '70px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((acc, index) => {
                  const isMenuOpen = openMenuId === acc.id
                  const isNearBottom = index >= filtered.length - 2 && filtered.length >= 3
                  const isSelf = acc.id === currentUser?.id

                  return (
                    <tr key={acc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-brand-navy-900)',
                            color: 'var(--color-brand-yellow-500)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            flexShrink: 0
                          }}>
                            {acc.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-brand-navy-900)' }}>
                              {acc.full_name} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--color-brand-gold-600)', fontWeight: 600 }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              {acc.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={acc.role} />
                      </td>
                      <td>
                        {acc.is_active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-neutral" style={{ color: 'var(--color-danger)' }}>Deactivated</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {formatDate(acc.created_at)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-dropdown">
                          <button
                            type="button"
                            className={`action-dropdown-btn ${isMenuOpen ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId(isMenuOpen ? null : acc.id)
                            }}
                            title="Account Actions"
                            aria-label="Account Actions"
                            aria-expanded={isMenuOpen}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {isMenuOpen && (
                            <div className={`action-dropdown-menu ${isNearBottom ? 'drop-up' : 'drop-down'}`}>
                              <button
                                type="button"
                                className="action-dropdown-item"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setSelectedAccount(acc)
                                  setIsModalOpen(true)
                                }}
                              >
                                <Pencil size={15} color="var(--color-brand-navy-800)" />
                                <span>Edit Account</span>
                              </button>

                              {!isSelf && (
                                <>
                                  <button
                                    type="button"
                                    className="action-dropdown-item"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      handleToggleStatus(acc)
                                    }}
                                  >
                                    <Power size={15} color={acc.is_active ? 'var(--color-warning)' : 'var(--color-success)'} />
                                    <span>{acc.is_active ? 'Deactivate' : 'Activate'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="action-dropdown-item"
                                    style={{ color: 'var(--color-danger)' }}
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      handleDelete(acc)
                                    }}
                                  >
                                    <Trash2 size={15} color="var(--color-danger)" />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Add/Edit Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        account={selectedAccount}
        currentUserId={currentUser?.id}
        onSaved={() => {
          showNotification(selectedAccount ? 'Staff account updated successfully.' : 'New staff account created.')
          loadAccounts()
        }}
      />
    </div>
  )
}

