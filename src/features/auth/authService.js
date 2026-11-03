import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore } from '../../lib/mockStore'
import { auditService } from '../audit/auditService'

const SESSION_KEY = 'berean_auth_session'

export const authService = {
  /**
   * Log in user with email & password
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPassword = (password || '').trim()

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please enter both your email address and password.')
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      })
      if (error) throw error

      // Fetch profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileErr) throw profileErr

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut()
        throw new Error('This account has been deactivated. Please contact an administrator.')
      }

      const session = { user: data.user, profile }
      if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }

      await auditService.logActivity({
        action: 'USER_LOGIN',
        entityType: 'session',
        entityId: profile.id,
        details: `Staff member ${profile.full_name} (${profile.role}) signed in successfully`,
        actor: profile
      })

      return session
    }

    // Local / Offline Store Authentication
    const store = getStore()
    const users = store.users || []

    const matched = users.find(
      u => u.email.toLowerCase() === cleanEmail
    )

    if (!matched) {
      throw new Error('Invalid email or password. Please check your credentials.')
    }

    if (matched.is_active === false) {
      throw new Error('This account has been deactivated. Please contact an administrator.')
    }

    const expectedPass = matched.password || 'password123'
    if (cleanPassword !== expectedPass) {
      throw new Error('Invalid email or password. Please check your credentials.')
    }

    const session = {
      user: { id: matched.id, email: matched.email },
      profile: {
        id: matched.id,
        full_name: matched.full_name,
        email: matched.email,
        role: matched.role,
        is_active: matched.is_active !== false
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }

    await auditService.logActivity({
      action: 'USER_LOGIN',
      entityType: 'session',
      entityId: matched.id,
      details: `Staff member ${matched.full_name} (${matched.role}) signed in successfully`,
      actor: matched
    })

    return session
  },

  /**
   * Log out current user
   */
  async logout() {
    const session = await this.getCurrentSession()
    if (session?.profile) {
      await auditService.logActivity({
        action: 'USER_LOGOUT',
        entityType: 'session',
        entityId: session.profile.id,
        details: `Staff member ${session.profile.full_name} signed out`,
        actor: session.profile
      })
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('Supabase signout notice:', err)
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem('berean_demo_session')
    }
  },

  /**
   * Get current session and profile
   */
  async getCurrentSession() {
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.is_active === false) return null
      return { user: session.user, profile }
    }

    // Local Session check
    if (typeof localStorage === 'undefined') {
      return null
    }

    const stored = localStorage.getItem(SESSION_KEY) || localStorage.getItem('berean_demo_session')
    if (stored) {
      try {
        const session = JSON.parse(stored)
        // Verify account is still active in store
        const store = getStore()
        const userInStore = (store.users || []).find(u => u.id === session.user?.id)
        if (userInStore) {
          if (userInStore.is_active === false) {
            localStorage.removeItem(SESSION_KEY)
            localStorage.removeItem('berean_demo_session')
            return null
          }
          // Refresh profile role and name if changed
          session.profile.full_name = userInStore.full_name
          session.profile.role = userInStore.role
          session.profile.is_active = userInStore.is_active !== false
        }
        return session
      } catch {
        return null
      }
    }

    // No default auto-login; user must log in through LoginPage
    return null
  }
}
