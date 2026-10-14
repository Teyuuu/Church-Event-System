import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

// Preset demo accounts for local preview & testing without Supabase credentials
export const DEMO_ACCOUNTS = [
  {
    id: 'demo-admin-01',
    email: 'admin@berean.org',
    full_name: 'Pastor Samuel (Admin)',
    role: 'admin',
    is_active: true
  },
  {
    id: 'demo-registrar-01',
    email: 'registrar@berean.org',
    full_name: 'Sis. Mary (Registrar)',
    role: 'registrar',
    is_active: true
  },
  {
    id: 'demo-usher-01',
    email: 'usher@berean.org',
    full_name: 'Bro. Caleb (Usher/Check-In)',
    role: 'usher',
    is_active: true
  },
  {
    id: 'demo-kitchen-01',
    email: 'kitchen@berean.org',
    full_name: 'Bro. Peter (Kitchen Lead)',
    role: 'kitchen',
    is_active: true
  }
]

export const authService = {
  /**
   * Log in user with email & password
   */
  async login(email, password) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error

      // Fetch profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileErr) throw profileErr
      return { user: data.user, profile }
    }

    // Fallback Demo authentication
    const matched = DEMO_ACCOUNTS.find(
      acc => acc.email.toLowerCase() === (email || '').trim().toLowerCase()
    ) || DEMO_ACCOUNTS[0]

    const demoSession = {
      user: { id: matched.id, email: matched.email },
      profile: matched
    }
    localStorage.setItem('berean_demo_session', JSON.stringify(demoSession))
    return demoSession
  },

  /**
   * Log out current user
   */
  async logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    localStorage.removeItem('berean_demo_session')
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

      return { user: session.user, profile }
    }

    // Demo Session check
    const stored = localStorage.getItem('berean_demo_session')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
    // Default to admin for convenient out-of-the-box local preview
    const defaultAcc = DEMO_ACCOUNTS[0]
    return {
      user: { id: defaultAcc.id, email: defaultAcc.email },
      profile: defaultAcc
    }
  }
}
