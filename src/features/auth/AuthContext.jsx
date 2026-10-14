import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService, DEMO_ACCOUNTS } from './authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initAuth() {
      try {
        const session = await authService.getCurrentSession()
        if (session) {
          setCurrentUser(session.user)
          setProfile(session.profile)
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err)
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { user, profile } = await authService.login(email, password)
      setCurrentUser(user)
      setProfile(profile)
      return { user, profile }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await authService.logout()
    setCurrentUser(null)
    setProfile(null)
  }

  // Quick switch role utility for review and testing
  const switchDemoRole = (role) => {
    const acc = DEMO_ACCOUNTS.find(a => a.role === role) || DEMO_ACCOUNTS[0]
    const demoSession = {
      user: { id: acc.id, email: acc.email },
      profile: acc
    }
    localStorage.setItem('berean_demo_session', JSON.stringify(demoSession))
    setCurrentUser(demoSession.user)
    setProfile(acc)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role: profile?.role || null,
        loading,
        login,
        logout,
        switchDemoRole,
        isAdmin: profile?.role === 'admin',
        isRegistrar: profile?.role === 'registrar' || profile?.role === 'admin',
        isUsher: profile?.role === 'usher' || profile?.role === 'admin',
        isKitchen: profile?.role === 'kitchen' || profile?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
