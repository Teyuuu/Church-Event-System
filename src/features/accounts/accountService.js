import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore, saveStore } from '../../lib/mockStore'
import { auditService } from '../audit/auditService'

export const accountService = {
  /**
   * Get all staff user accounts
   */
  async getAccounts() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }

    const store = getStore()
    return (store.users || []).map(u => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      is_active: u.is_active !== false,
      created_at: u.created_at,
      updated_at: u.updated_at || u.created_at
    }))
  },

  /**
   * Create a new staff account
   */
  async createAccount({ full_name, email, password, role = 'usher', is_active = true }) {
    const cleanName = (full_name || '').trim()
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPass = (password || '').trim()

    if (!cleanName) throw new Error('Full name is required.')
    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('A valid email address is required.')
    if (!cleanPass || cleanPass.length < 6) throw new Error('Password must be at least 6 characters.')
    if (!['admin', 'registrar', 'usher', 'kitchen'].includes(role)) {
      throw new Error('Invalid account role specified.')
    }

    if (isSupabaseConfigured && supabase) {
      // 1. Create auth user via Supabase Auth Admin or SignUp
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: cleanName,
            role
          }
        }
      })
      if (authErr) throw authErr

      const userId = authData.user?.id

      // 2. Ensure profile exists and has role
      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: cleanName,
          role,
          is_active: Boolean(is_active)
        })
      }

      await auditService.logActivity({
        action: 'ACCOUNT_CREATED',
        entityType: 'account',
        entityId: userId,
        details: `Created new staff account for ${cleanName} (${role.toUpperCase()})`,
        metadata: { email: cleanEmail, role, is_active }
      })

      return { id: userId, full_name: cleanName, email: cleanEmail, role, is_active }
    }

    const store = getStore()
    store.users = store.users || []

    const existing = store.users.find(u => u.email.toLowerCase() === cleanEmail)
    if (existing) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`)
    }

    const newId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const newAccount = {
      id: newId,
      full_name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      role,
      is_active: Boolean(is_active),
      created_at: new Date().toISOString()
    }

    store.users.unshift(newAccount)
    saveStore(store)

    await auditService.logActivity({
      action: 'ACCOUNT_CREATED',
      entityType: 'account',
      entityId: newId,
      details: `Created new staff account for ${cleanName} (${role.toUpperCase()})`,
      metadata: { email: cleanEmail, role, is_active }
    })

    return newAccount
  },

  /**
   * Update an existing staff account
   */
  async updateAccount(id, { full_name, email, password, role, is_active }) {
    const cleanName = (full_name || '').trim()
    const cleanEmail = (email || '').trim().toLowerCase()

    if (!cleanName) throw new Error('Full name is required.')
    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('A valid email address is required.')
    if (!['admin', 'registrar', 'usher', 'kitchen'].includes(role)) {
      throw new Error('Invalid account role specified.')
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: cleanName,
          role,
          is_active: Boolean(is_active),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await auditService.logActivity({
        action: 'ACCOUNT_UPDATED',
        entityType: 'account',
        entityId: id,
        details: `Updated account details for ${cleanName} (${role.toUpperCase()})`,
        metadata: { role, is_active }
      })

      return data
    }

    const store = getStore()
    const account = (store.users || []).find(u => u.id === id)
    if (!account) throw new Error('Account not found.')

    // Check duplicate email
    const duplicate = (store.users || []).find(
      u => u.id !== id && u.email.toLowerCase() === cleanEmail
    )
    if (duplicate) {
      throw new Error(`Another account already uses the email "${cleanEmail}".`)
    }

    account.full_name = cleanName
    account.email = cleanEmail
    account.role = role
    if (is_active !== undefined) {
      account.is_active = Boolean(is_active)
    }
    if (password && password.trim().length >= 6) {
      account.password = password.trim()
    }
    account.updated_at = new Date().toISOString()

    saveStore(store)

    await auditService.logActivity({
      action: 'ACCOUNT_UPDATED',
      entityType: 'account',
      entityId: id,
      details: `Updated account details for ${cleanName} (${role.toUpperCase()})`,
      metadata: { role, is_active: account.is_active }
    })

    return account
  },

  /**
   * Toggle active/inactive status of an account
   */
  async toggleAccountStatus(id, currentUserId) {
    if (id === currentUserId) {
      throw new Error('You cannot deactivate your own active account.')
    }

    if (isSupabaseConfigured && supabase) {
      const { data: profile } = await supabase.from('profiles').select('is_active, full_name').eq('id', id).single()
      const newStatus = !profile?.is_active
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await auditService.logActivity({
        action: 'ACCOUNT_STATUS_CHANGED',
        entityType: 'account',
        entityId: id,
        details: `${newStatus ? 'Activated' : 'Deactivated'} staff account for ${profile?.full_name}`,
        metadata: { is_active: newStatus }
      })

      return data
    }

    const store = getStore()
    const account = (store.users || []).find(u => u.id === id)
    if (!account) throw new Error('Account not found.')

    account.is_active = !account.is_active
    account.updated_at = new Date().toISOString()
    saveStore(store)

    await auditService.logActivity({
      action: 'ACCOUNT_STATUS_CHANGED',
      entityType: 'account',
      entityId: id,
      details: `${account.is_active ? 'Activated' : 'Deactivated'} staff account for ${account.full_name}`,
      metadata: { is_active: account.is_active }
    })

    return account
  },

  /**
   * Delete a staff account
   */
  async deleteAccount(id, currentUserId) {
    if (id === currentUserId) {
      throw new Error('You cannot delete your own active administrator account.')
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error

      await auditService.logActivity({
        action: 'ACCOUNT_DELETED',
        entityType: 'account',
        entityId: id,
        details: `Deleted staff account ID ${id}`
      })

      return true
    }

    const store = getStore()
    const index = (store.users || []).findIndex(u => u.id === id)
    if (index === -1) throw new Error('Account not found.')

    const deleted = store.users.splice(index, 1)[0]
    saveStore(store)

    await auditService.logActivity({
      action: 'ACCOUNT_DELETED',
      entityType: 'account',
      entityId: id,
      details: `Deleted staff account for ${deleted.full_name} (${deleted.email})`
    })

    return true
  }
}

