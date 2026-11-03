import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from './authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const restoreSession = async () => {
    try {
      const session = await authService.getCurrentSession()
      if (session) {
        setCurrentUser(session.user)
        setProfile(session.profile)
      } else {
        setCurrentUser(null)
        setProfile(null)
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err)
      setCurrentUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    restoreSession()
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const session = await authService.login(email, password)
      setCurrentUser(session.user)
      setProfile(session.profile)
      return session
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await authService.logout()
    setCurrentUser(null)
    setProfile(null)
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
        refreshSession: restoreSession,
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
