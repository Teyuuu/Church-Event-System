import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthContext'
import { ToastProvider } from '../components/ui/Toast'
import { ConfirmProvider } from '../components/ui/ConfirmDialog'
import { AppRoutes } from './routes'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppRoutes />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
