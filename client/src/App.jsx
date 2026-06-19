import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminRoute, CoachRoute, SuperAdminRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLayout from './layouts/AdminLayout';
import CoachLayout from './layouts/CoachLayout';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import CoachLogin from './pages/CoachLogin';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import SportsPanel from './pages/admin/SportsPanel';
import CoachesPanel from './pages/admin/CoachesPanel';
import StudentsPanel from './pages/admin/StudentsPanel';
import BatchesPanel from './pages/admin/BatchesPanel';
import PlansPanel from './pages/admin/PlansPanel';
import PaymentsPanel from './pages/admin/PaymentsPanel';
import ReportsPanel from './pages/admin/ReportsPanel';
import PerformancePanel from './pages/admin/PerformancePanel';
import EnquiriesPanel from './pages/admin/EnquiriesPanel';
import ForgotPassword from './pages/ForgotPassword.jsx';
import CoachDashboardPage from './pages/coach/CoachDashboardPage';
import CoachAttendancePage from './pages/coach/CoachAttendancePage';
import CoachNotesPage from './pages/coach/CoachNotesPage';
import CoachFeesPage from './pages/coach/CoachFeesPage';
import CoachMyAttendancePage from './pages/coach/CoachMyAttendancePage';
import CoachPerformancePage from './pages/coach/CoachPerformancePage';
import IntakeForm from './pages/public/IntakeForm';
import PublicEnquiryForm from './pages/public/PublicEnquiryForm';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Public Frontend Routing Layer Protocols */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<LandingPage />} />
          <Route path="/public/intake-form" element={<IntakeForm />} />
          <Route path="/enquiry-form" element={<PublicEnquiryForm />} />

          {/* Legacy Administrative Internal Path Auto Redirection Handlers */}
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/dashboard/*" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Secure Admin Operations Dashboard Panel Route Configurations */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route
              path="sports"
              element={
                <ErrorBoundary>
                  <SportsPanel />
                </ErrorBoundary>
              }
            />
            <Route path="coaches" element={<CoachesPanel />} />
            <Route
              path="students"
              element={
                <ErrorBoundary>
                  <StudentsPanel />
                </ErrorBoundary>
              }
            />
            <Route path="batches" element={<BatchesPanel />} />
            <Route path="plans" element={<PlansPanel />} />
            <Route path="accounts" element={<PaymentsPanel />} />
            <Route path="payments" element={<Navigate to="/admin/accounts" replace />} />
            <Route path="reports" element={<ReportsPanel />} />
            <Route path="performance" element={<PerformancePanel />} />
            <Route path="enquiries" element={<EnquiriesPanel />} />
            <Route path="import" element={<Navigate to="/admin/students" replace />} />
            <Route path="analytics" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Secure Coach Operations Dashboard Panel Route Configurations */}
          <Route path="/coach/login" element={<CoachLogin />} />
          <Route
            path="/coach"
            element={
              <CoachRoute>
                <CoachLayout />
              </CoachRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CoachDashboardPage />} />
            <Route path="attendance" element={<CoachAttendancePage />} />
            <Route path="notes" element={<CoachNotesPage />} />
            <Route path="fees" element={<CoachFeesPage />} />
            <Route path="my-attendance" element={<CoachMyAttendancePage />} />
            <Route path="performance" element={<CoachPerformancePage />} />
          </Route>

          {/* Hidden Gateways (Intentionally Omitted From Direct Public References) */}
          <Route path="/super-admin-login" element={<SuperAdminLogin />} />
          <Route
            path="/super-admin/dashboard"
            element={
              <SuperAdminRoute>
                <SuperAdminDashboard />
              </SuperAdminRoute>
            }
          />

          {/* Fallback Catch-All Wildcard Mapping Logic */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
