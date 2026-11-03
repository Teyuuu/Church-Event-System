import React, { useState, useEffect } from 'react'
import { auditService } from './auditService'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime } from '../../utils/date'
import {
  History,
  Search,
  Download,
  RefreshCw,
  User,
  Shield,
  QrCode,
  DollarSign,
  UserCheck,
  Calendar,
  LogIn,
  LogOut,
  Pencil,
  PlusCircle,
  Clock
} from 'lucide-react'

export function AuditPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const data = await auditService.getAuditLogs({
        searchQuery,
        category: categoryFilter
      })
      setLogs(data)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [categoryFilter])

  // Trigger search on debounce or Enter
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadAuditLogs()
  }

  const handleExportCsv = () => {
    auditService.exportAuditLogsCsv(logs)
  }

  // Get action icon and color
  const getActionBadge = (action = '') => {
    if (action.startsWith('ACCOUNT_')) {
      return { label: action.replace('ACCOUNT_', ''), color: '#6366F1', bg: '#EEF2FF', icon: Shield }
    }
    if (action.startsWith('ATTENDEE_') || action.startsWith('FAMILY_')) {
      return { label: action.replace('ATTENDEE_', ''), color: '#0284C7', bg: '#F0F9FF', icon: UserCheck }
    }
    if (action.startsWith('CHECKIN_')) {
      return { label: action.replace('CHECKIN_', ''), color: '#059669', bg: '#ECFDF5', icon: QrCode }
    }
    if (action.startsWith('PAYMENT_')) {
      return { label: action.replace('PAYMENT_', ''), color: '#D97706', bg: '#FEFCE8', icon: DollarSign }
    }
    if (action.startsWith('USER_LOGIN')) {
      return { label: 'SIGN IN', color: '#103B6E', bg: '#E0E7FF', icon: LogIn }
    }
    if (action.startsWith('USER_LOGOUT')) {
      return { label: 'SIGN OUT', color: '#64748B', bg: '#F1F5F9', icon: LogOut }
    }
    return { label: action, color: '#334155', bg: '#F8FAFC', icon: Clock }
  }

  // Compute stat highlights
  const totalCheckins = logs.filter(l => l.action?.startsWith('CHECKIN_')).length
  const totalPayments = logs.filter(l => l.action?.startsWith('PAYMENT_')).length
  const totalAccountModifications = logs.filter(l => l.action?.startsWith('ACCOUNT_')).length
  const totalRegistrations = logs.filter(l => l.action?.startsWith('ATTENDEE_') || l.action?.startsWith('FAMILY_')).length

  return (
    <div>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h1>System Activity & Audit Log</h1>
          <p className="text-muted" style={{ fontSize: '0.925rem' }}>
            Comprehensive traceability of staff operations, registrations, payments, and check-in logs
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={loadAuditLogs}
            disabled={loading}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
          >
            <Download size={16} />
            <span>Export Audit Log (CSV)</span>
          </Button>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-title">Total Logged Activities</span>
          <span className="stat-value">{logs.length}</span>
          <span className="stat-subtitle">Traceable system events</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Check-Ins Logged</span>
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>{totalCheckins}</span>
          <span className="stat-subtitle">QR & manual check-in entries</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Attendee Updates</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-navy-900)' }}>{totalRegistrations}</span>
          <span className="stat-subtitle">Registrations & spelling edits</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Payments & Accounts</span>
          <span className="stat-value" style={{ color: 'var(--color-brand-gold-600)' }}>{totalPayments + totalAccountModifications}</span>
          <span className="stat-subtitle">{totalPayments} payments • {totalAccountModifications} account edits</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search actor, action, or details..."
                style={{ paddingLeft: '2.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={loadAuditLogs}
              />
            </div>

            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Activity Categories</option>
              <option value="accounts">Staff & Accounts (Created / Updated)</option>
              <option value="attendees">Attendee Registrations & Edits</option>
              <option value="checkins">Check-In Activity (QR / Manual)</option>
              <option value="payments">Financial Payments & Collections</option>
              <option value="events">Event Days & Schedule Changes</option>
              <option value="sessions">Staff Sign In / Out Sessions</option>
            </select>
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <LoadingState message="Fetching system audit trail..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No activity records found"
          description="System actions like account edits, attendee registrations, check-ins, and payments will appear here in chronological order."
          icon={History}
        />
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Timestamp</th>
                  <th>Actor (Performed By)</th>
                  <th>Action Type</th>
                  <th>Activity Details</th>
                  <th>Target Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = getActionBadge(log.action)
                  const ActionIcon = badge.icon

                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.created_at)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-bg-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--color-brand-navy-900)'
                          }}>
                            {log.actor_name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-brand-navy-900)' }}>
                              {log.actor_name}
                            </div>
                            <div style={{ fontSize: '0.75rem' }}>
                              <StatusBadge status={log.actor_role} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.color}33`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          <ActionIcon size={12} />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>
                        <div style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>
                          {log.details}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'var(--color-bg-muted)',
                          color: 'var(--color-text-muted)',
                          textTransform: 'capitalize',
                          fontWeight: 600
                        }}>
                          {log.entity_type}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

