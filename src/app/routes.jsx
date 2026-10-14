import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { LoginPage } from '../features/auth/LoginPage'
import { AdminDashboard } from '../features/dashboard/AdminDashboard'
import { KitchenDashboard } from '../features/dashboard/KitchenDashboard'
import { EventsPage } from '../features/events/EventsPage'
import { EventDaysPage } from '../features/events/EventDaysPage'
import { AttendeesPage } from '../features/attendees/AttendeesPage'
import { PublicRegistrationPage } from '../features/attendees/PublicRegistrationPage'
import { QRPrintPage } from '../features/qr/QRPrintPage'
import { ScannerPage } from '../features/attendance/ScannerPage'
import { DailyAttendancePage } from '../features/attendance/DailyAttendancePage'
import { PaymentsPage } from '../features/payments/PaymentsPage'
import { ReportsPage } from '../features/reports/ReportsPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/:eventId" element={<PublicRegistrationPage />} />
      <Route path="/events/:eventId/public-register" element={<PublicRegistrationPage />} />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Events Directory */}
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:eventId" element={<Navigate to="attendees" replace />} />
        <Route path="events/:eventId/days" element={<EventDaysPage />} />

        {/* Attendees & Registration */}
        <Route
          path="events/:eventId/attendees"
          element={
            <ProtectedRoute allowedRoles={['admin', 'registrar', 'usher']}>
              <AttendeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="events/:eventId/register"
          element={<Navigate to="../attendees" replace />}
        />

        {/* QR Badges & Printing */}
        <Route
          path="events/:eventId/print"
          element={
            <ProtectedRoute allowedRoles={['admin', 'registrar']}>
              <QRPrintPage />
            </ProtectedRoute>
          }
        />

        {/* Scanner Check-In */}
        <Route
          path="events/:eventId/scan"
          element={
            <ProtectedRoute allowedRoles={['admin', 'usher']}>
              <ScannerPage />
            </ProtectedRoute>
          }
        />

        {/* Daily Attendance Log */}
        <Route
          path="events/:eventId/attendance"
          element={
            <ProtectedRoute allowedRoles={['admin', 'registrar', 'usher']}>
              <DailyAttendancePage />
            </ProtectedRoute>
          }
        />

        {/* Payments & Financials */}
        <Route
          path="events/:eventId/payments"
          element={
            <ProtectedRoute allowedRoles={['admin', 'registrar']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        {/* Reports & Exports */}
        <Route
          path="events/:eventId/reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Kitchen Dashboard */}
        <Route
          path="kitchen/:eventId"
          element={
            <ProtectedRoute allowedRoles={['admin', 'kitchen']}>
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="kitchen/:eventId/:eventDayId"
          element={
            <ProtectedRoute allowedRoles={['admin', 'kitchen']}>
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 Catch-All */}
      <Route
        path="*"
        element={
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <h1 style={{ fontSize: '3rem', color: 'var(--color-brand-navy-900)' }}>404</h1>
            <h2>Page Not Found</h2>
            <p className="text-muted" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              The requested page does not exist or has been moved.
            </p>
            <a href="/dashboard" className="btn btn-primary">
              Return to Dashboard
            </a>
          </div>
        }
      />
    </Routes>
  )
}
