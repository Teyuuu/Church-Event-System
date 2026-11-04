import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore, saveStore } from '../../lib/mockStore'
import { convertToCsv, downloadCsv } from '../../utils/csv'
import { formatDateTime, todayLocal } from '../../utils/date'

export const auditService = {
  /**
   * Log an activity in the system
   */
  async logActivity({
    action,
    entityType,
    entityId = null,
    details = '',
    metadata = {},
    actor = null
  }) {
    try {
      let currentActor = actor
      if (!currentActor && typeof localStorage !== 'undefined') {
        const storedSession = localStorage.getItem('berean_auth_session') || localStorage.getItem('berean_demo_session')
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession)
            currentActor = parsed.profile || parsed.user
          } catch {
            currentActor = null
          }
        }
      }

      const actorId = currentActor?.id || null
      const actorName = currentActor?.full_name || currentActor?.email || 'System'
      const actorRole = currentActor?.role || 'system'
      const now = new Date().toISOString()

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('audit_logs').insert([{
          actor_id: actorId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          reason: details,
          metadata: {
            ...metadata,
            actor_name: actorName,
            actor_role: actorRole
          }
        }])
        if (error) console.warn('Supabase audit log insert error:', error)
        return true
      }

      // Mock Store
      const store = getStore()
      const newEntry = {
        id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        actor_id: actorId,
        actor_name: actorName,
        actor_role: actorRole,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        metadata,
        created_at: now
      }

      if (!store.audit_logs) {
        store.audit_logs = []
      }
      store.audit_logs.unshift(newEntry)
      saveStore(store)
      return true
    } catch (err) {
      console.warn('Failed to record audit log:', err)
      return false
    }
  },

  /**
   * Fetch all audit logs with optional filters
   */
  async getAuditLogs(filters = {}) {
    let logs = []

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          actor_id,
          action,
          entity_type,
          entity_id,
          reason,
          metadata,
          created_at,
          profiles (full_name, role)
        `)
        .order('created_at', { ascending: false })
        .limit(filters.limit || 1000)

      if (error) throw error

      logs = (data || []).map(l => ({
        id: l.id,
        actor_id: l.actor_id,
        actor_name: l.profiles?.full_name || l.metadata?.actor_name || 'System',
        actor_role: l.profiles?.role || l.metadata?.actor_role || 'staff',
        action: l.action,
        entity_type: l.entity_type,
        entity_id: l.entity_id,
        details: l.reason || l.metadata?.details || l.action,
        metadata: l.metadata || {},
        created_at: l.created_at
      }))
    } else {
      const store = getStore()
      logs = [...(store.audit_logs || [])]
    }

    // Sort newest first
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // Apply Filters
    const { searchQuery, category } = filters

    return logs.filter(log => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesQuery =
          (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.details && log.details.toLowerCase().includes(q)) ||
          (log.entity_type && log.entity_type.toLowerCase().includes(q))
        if (!matchesQuery) return false
      }

      if (category && category !== 'all') {
        if (category === 'accounts') {
          return log.action.startsWith('ACCOUNT_') || log.entity_type === 'account' || log.entity_type === 'user'
        }
        if (category === 'attendees') {
          return log.action.startsWith('ATTENDEE_') || log.action.startsWith('FAMILY_') || log.entity_type === 'attendee'
        }
        if (category === 'checkins') {
          return log.action.startsWith('CHECKIN_') || log.entity_type === 'attendance'
        }
        if (category === 'payments') {
          return log.action.startsWith('PAYMENT_') || log.entity_type === 'payment'
        }
        if (category === 'events') {
          return log.action.startsWith('EVENT_') || log.action.startsWith('DAY_') || log.entity_type === 'event' || log.entity_type === 'event_day'
        }
        if (category === 'sessions') {
          return log.action.startsWith('USER_') || log.entity_type === 'session'
        }
      }

      return true
    })
  },

  /**
   * Export audit log records to CSV
   */
  exportAuditLogsCsv(logs) {
    const rows = logs.map(l => ({
      timestamp: formatDateTime(l.created_at),
      actorName: l.actor_name,
      actorRole: l.actor_role,
      action: l.action,
      entityType: l.entity_type,
      details: l.details
    }))

    const columns = [
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'actorName', label: 'Actor Name' },
      { key: 'actorRole', label: 'Actor Role' },
      { key: 'action', label: 'Action' },
      { key: 'entityType', label: 'Entity Type' },
      { key: 'details', label: 'Details / Summary' }
    ]

    downloadCsv(`Berean_Church_Audit_Logs_${todayLocal()}`, convertToCsv(rows, columns))
  }
}
