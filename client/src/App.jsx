import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettingsPage from './pages/AdminSettingsPage';
import HrDashboard from './pages/HrDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeDirectoryPage from './pages/EmployeeDirectoryPage';
import EmployeeRegistrationPage from './pages/EmployeeRegistrationPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import AttendanceBoardPage from './pages/AttendanceBoardPage';
import EmployeeAttendancePage from './pages/EmployeeAttendancePage';
import AIAssistantPage from './pages/AIAssistantPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import AuditLogPage from './pages/AuditLogPage';
import Skeleton from './components/ui/Skeleton';

// Root route dynamic redirection
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton width="180px" height="24px" />
      </div>
    );
  }

  if (isAuthenticated && user?.role) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return <Navigate to="/login" replace />;
};

export const App = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AdminDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AdminSettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Workforce & Employee Management (Admin & HR) */}
      <Route
        path="/hr/dashboard"
        element={
          <ProtectedRoute allowedRoles={['hr', 'admin']}>
            <DashboardLayout>
              <HrDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/employees"
        element={
          <ProtectedRoute allowedRoles={['hr', 'admin']}>
            <DashboardLayout>
              <EmployeeDirectoryPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/employees/new"
        element={
          <ProtectedRoute allowedRoles={['hr', 'admin']}>
            <DashboardLayout>
              <EmployeeRegistrationPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['hr', 'admin']}>
            <DashboardLayout>
              <EmployeeDetailPage isSelfProfile={false} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Attendance Module Routes */}
      <Route
        path="/hr/attendance"
        element={
          <ProtectedRoute allowedRoles={['hr', 'admin']}>
            <DashboardLayout>
              <AttendanceBoardPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Employee Protected Routes */}
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute allowedRoles={['employee', 'hr', 'admin']}>
            <DashboardLayout>
              <EmployeeDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/attendance"
        element={
          <ProtectedRoute allowedRoles={['employee', 'hr', 'admin']}>
            <DashboardLayout>
              <EmployeeAttendancePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/profile"
        element={
          <ProtectedRoute allowedRoles={['employee', 'hr', 'admin']}>
            <DashboardLayout>
              <EmployeeDetailPage isSelfProfile={true} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* AI HR Assistant Protected Routes (All authenticated roles) */}
      <Route
        path="/admin/ai-assistant"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AIAssistantPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/ai-assistant"
        element={
          <ProtectedRoute allowedRoles={['hr', 'admin']}>
            <DashboardLayout>
              <AIAssistantPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/ai-assistant"
        element={
          <ProtectedRoute allowedRoles={['employee', 'hr', 'admin']}>
            <DashboardLayout>
              <AIAssistantPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Announcements — Admin */}
      <Route
        path="/admin/announcements"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AnnouncementsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Announcements — HR */}
      <Route
        path="/hr/announcements"
        element={
          <ProtectedRoute allowedRoles={['hr', 'admin']}>
            <DashboardLayout>
              <AnnouncementsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Announcements — Employee */}
      <Route
        path="/employee/announcements"
        element={
          <ProtectedRoute allowedRoles={['employee', 'hr', 'admin']}>
            <DashboardLayout>
              <AnnouncementsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Audit Log — Admin only */}
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AuditLogPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
