import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { HomeRedirect } from '../components/layout/HomeRedirect'
import { NotFoundPage } from '../components/layout/NotFoundPage'
import { LoadingState } from '../components/ui/LoadingState'
import { LoginPage } from '../features/auth/LoginPage'
import { PERMISSIONS } from '../utils/permissions'

// Route-level code splitting: heavy libraries (html5-qrcode, qrcode, jspdf)
// are only downloaded when the page that needs them is opened.
const named = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })))

const AdminDashboard = named(() => import('../features/dashboard/AdminDashboard'), 'AdminDashboard')
const KitchenDashboard = named(() => import('../features/dashboard/KitchenDashboard'), 'KitchenDashboard')
const EventsPage = named(() => import('../features/events/EventsPage'), 'EventsPage')
const EventLayout = named(() => import('../features/events/EventLayout'), 'EventLayout')
const EventDaysPage = named(() => import('../features/events/EventDaysPage'), 'EventDaysPage')
const AttendeesPage = named(() => import('../features/attendees/AttendeesPage'), 'AttendeesPage')
const PublicRegistrationPage = named(() => import('../features/attendees/PublicRegistrationPage'), 'PublicRegistrationPage')
const QRPrintPage = named(() => import('../features/qr/QRPrintPage'), 'QRPrintPage')
const ScannerPage = named(() => import('../features/attendance/ScannerPage'), 'ScannerPage')
const DailyAttendancePage = named(() => import('../features/attendance/DailyAttendancePage'), 'DailyAttendancePage')
const PaymentsPage = named(() => import('../features/payments/PaymentsPage'), 'PaymentsPage')
const ReportsPage = named(() => import('../features/reports/ReportsPage'), 'ReportsPage')
const AccountsPage = named(() => import('../features/accounts/AccountsPage'), 'AccountsPage')
const AuditPage = named(() => import('../features/audit/AuditPage'), 'AuditPage')

const guard = (permission, element) => (
  <ProtectedRoute allowedRoles={PERMISSIONS[permission]}>{element}</ProtectedRoute>
)

/** Legacy /kitchen/:eventId[/:eventDayId] links -> new nested event route */
function LegacyKitchenRedirect() {
  const { eventId, eventDayId } = useParams()
  return <Navigate to={`/events/${eventId}/kitchen${eventDayId ? `?dayId=${eventDayId}` : ''}`} replace />
}

/** /events/:eventId/kitchen/:eventDayId -> ?dayId= */
function KitchenDayRedirect() {
  const { eventId, eventDayId } = useParams()
  return <Navigate to={`/events/${eventId}/kitchen?dayId=${eventDayId}`} replace />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState message="Loading…" />}>
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
          <Route index element={<HomeRedirect />} />
          <Route path="home" element={<HomeRedirect />} />

          <Route path="dashboard" element={guard('dashboard', <AdminDashboard />)} />
          <Route path="events" element={guard('events', <EventsPage />)} />

          {/* Event workspace: shared header, tabs and breadcrumbs */}
          <Route path="events/:eventId" element={guard('events', <EventLayout />)}>
            <Route index element={<HomeRedirect eventScoped />} />
            <Route path="days" element={guard('schedule', <EventDaysPage />)} />
            <Route path="attendees" element={guard('attendees', <AttendeesPage />)} />
            <Route path="register" element={<Navigate to="../attendees" replace />} />
            <Route path="print" element={guard('print', <QRPrintPage />)} />
            <Route path="scan" element={guard('scan', <ScannerPage />)} />
            <Route path="attendance" element={guard('attendance', <DailyAttendancePage />)} />
            <Route path="payments" element={guard('payments', <PaymentsPage />)} />
            <Route path="reports" element={guard('reports', <ReportsPage />)} />
            <Route path="kitchen" element={guard('kitchen', <KitchenDashboard />)} />
            <Route path="kitchen/:eventDayId" element={<KitchenDayRedirect />} />
          </Route>

          {/* Legacy kitchen URLs */}
          <Route path="kitchen/:eventId" element={<LegacyKitchenRedirect />} />
          <Route path="kitchen/:eventId/:eventDayId" element={<LegacyKitchenRedirect />} />

          <Route path="admin/accounts" element={guard('accounts', <AccountsPage />)} />
          <Route path="admin/audit" element={guard('audit', <AuditPage />)} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
