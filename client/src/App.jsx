import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminRoute, CoachRoute, SuperAdminRoute, ParentRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLayout from './layouts/AdminLayout';
import CoachLayout from './layouts/CoachLayout';
import ParentLayout from './layouts/ParentLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import AdminLogin from './pages/AdminLogin';
import CoachLogin from './pages/CoachLogin';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AcademiesPanel from './pages/super-admin/AcademiesPanel';
import SuperAdminPlansPanel from './pages/super-admin/PlansPanel';
import ControllerPanel from './pages/super-admin/ControllerPanel';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import SportsPanel from './pages/admin/SportsPanel';
import CoachesPanel from './pages/admin/CoachesPanel';
import StudentsPanel from './pages/admin/StudentsPanel';
import BatchesPanel from './pages/admin/BatchesPanel';
import PaymentsPanel from './pages/admin/PaymentsPanel';
import ReportsPanel from './pages/admin/ReportsPanel';
import PerformancePanel from './pages/admin/PerformancePanel';
import EnquiriesPanel from './pages/admin/EnquiriesPanel';
import GpsSettingsPanel from './pages/admin/GpsSettingsPanel';
import AdminPlansPanel from './pages/admin/PlansPanel';
import SettingsPanel from './pages/admin/SettingsPanel';
import ForgotPassword from './pages/ForgotPassword.jsx';
import CoachDashboardPage from './pages/coach/CoachDashboardPage';
import CoachAttendancePage from './pages/coach/CoachAttendancePage';
import CoachNotesPage from './pages/coach/CoachNotesPage';
import CoachFeesPage from './pages/coach/CoachFeesPage';
import CoachPerformancePage from './pages/coach/CoachPerformancePage';
import IntakeForm from './pages/public/IntakeForm';
import PublicEnquiryForm from './pages/public/PublicEnquiryForm';
import ParentLogin from './pages/parent/ParentLogin';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentAttendance from './pages/parent/ParentAttendance';
import ParentPerformance from './pages/parent/ParentPerformance';
import ParentFees from './pages/parent/ParentFees';
import ParentProfile from './pages/parent/ParentProfile';
import ParentSettings from './pages/parent/ParentSettings';
import ParentAnnouncements from './pages/parent/announcements/ParentAnnouncements';
import ParentAnnouncementDetails from './pages/parent/announcements/ParentAnnouncementDetails';
import CreateAnnouncement from './pages/admin/announcements/CreateAnnouncement';
import AnnouncementHistory from './pages/admin/announcements/AnnouncementHistory';
import AnnouncementDetails from './pages/admin/announcements/AnnouncementDetails';
import AnnouncementStats from './pages/admin/announcements/AnnouncementStats';
import SuperAdminCreateAnnouncement from './pages/super-admin/announcements/SuperAdminCreateAnnouncement';
import SuperAdminAnnouncementHistory from './pages/super-admin/announcements/SuperAdminAnnouncementHistory';
import SuperAdminAnnouncementDetails from './pages/super-admin/announcements/SuperAdminAnnouncementDetails';
import SuperAdminAnnouncementStats from './pages/super-admin/announcements/SuperAdminAnnouncementStats';
import CoachCreateAnnouncement from './pages/coach/announcements/CoachCreateAnnouncement';
import CoachAnnouncementHistory from './pages/coach/announcements/CoachAnnouncementHistory';
import CoachAnnouncementDetails from './pages/coach/announcements/CoachAnnouncementDetails';
import CoachAnnouncementStats from './pages/coach/announcements/CoachAnnouncementStats';

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
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
            <Route path="plans" element={<AdminPlansPanel />} />
            <Route path="accounts" element={<PaymentsPanel />} />
            <Route path="payments" element={<Navigate to="/admin/accounts" replace />} />
            <Route path="reports" element={<ReportsPanel />} />
            <Route path="performance" element={<PerformancePanel />} />
            <Route path="enquiries" element={<EnquiriesPanel />} />
            <Route path="gps-settings" element={<GpsSettingsPanel />} />
            <Route path="settings" element={<SettingsPanel />} />
            <Route path="import" element={<Navigate to="/admin/students" replace />} />
            <Route path="analytics" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="announcements" element={<AnnouncementHistory />} />
            <Route path="announcements/create" element={<CreateAnnouncement />} />
            <Route path="announcements/:id" element={<AnnouncementDetails />} />
            <Route path="announcements/:id/stats" element={<AnnouncementStats />} />
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
            <Route path="performance" element={<CoachPerformancePage />} />
            <Route path="announcements" element={<CoachAnnouncementHistory />} />
            <Route path="announcements/create" element={<CoachCreateAnnouncement />} />
            <Route path="announcements/:id" element={<CoachAnnouncementDetails />} />
            <Route path="announcements/:id/stats" element={<CoachAnnouncementStats />} />
          </Route>

          {/* Secure Parent Portal Route Configurations */}
          <Route path="/parent/login" element={<ParentLogin />} />
          <Route
            path="/parent"
            element={
              <ParentRoute>
                <ParentLayout />
              </ParentRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="attendance" element={<ParentAttendance />} />
            <Route path="performance" element={<ParentPerformance />} />
            <Route path="fees" element={<ParentFees />} />
            <Route path="profile" element={<ParentProfile />} />
            <Route path="settings" element={<ParentSettings />} />
            <Route path="announcements" element={<ParentAnnouncements />} />
            <Route path="announcements/:id" element={<ParentAnnouncementDetails />} />
          </Route>

          {/* Hidden Gateways (Intentionally Omitted From Direct Public References) */}
          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <SuperAdminLayout />
              </SuperAdminRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="academies" element={<AcademiesPanel />} />
            <Route path="plans" element={<SuperAdminPlansPanel />} />
            <Route path="controller" element={<ControllerPanel />} />
            <Route path="announcements" element={<SuperAdminAnnouncementHistory />} />
            <Route path="announcements/create" element={<SuperAdminCreateAnnouncement />} />
            <Route path="announcements/:id" element={<SuperAdminAnnouncementDetails />} />
            <Route path="announcements/:id/stats" element={<SuperAdminAnnouncementStats />} />
          </Route>

          {/* Fallback Catch-All Wildcard Mapping Logic */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
