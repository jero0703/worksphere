import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/auth/Unauthorized';
import AdminUsers from './pages/auth/AdminUsers';

import RoleRedirect from './pages/dashboards/RoleRedirect';
import EmployeeDashboard from './pages/dashboards/EmployeeDashboard';
import HrDashboard from './pages/dashboards/HrDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

import AttendanceDashboard from './pages/attendance/AttendanceDashboard';
import { ShiftManagement } from './pages/shifts/ShiftManagement';
import LeaveDashboard from './pages/leaves/LeaveDashboard';
import LeaveCalendar from './pages/leaves/LeaveCalendar';
import PayrollDashboard from './pages/payroll/PayrollDashboard';
import NotificationCenter from './pages/notifications/NotificationCenter';
import DocumentCenter from './pages/documents/DocumentCenter';
import PerformanceDashboard from './pages/performance/PerformanceDashboard';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import EmployeeDirectory from './pages/employees/EmployeeDirectory';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<RoleRedirect />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Role Dashboards */}
              <Route
                path="/employee/dashboard"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <EmployeeDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/hr/dashboard"
                element={
                  <RoleRoute allowedRoles={['HR', 'ADMIN']}>
                    <HrDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </RoleRoute>
                }
              />

              {/* Admin Users & Role Management */}
              <Route
                path="/admin/users"
                element={
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminUsers />
                  </RoleRoute>
                }
              />

              {/* Organization Directory & Advanced Search */}
              <Route
                path="/employees"
                element={
                  <RoleRoute allowedRoles={['HR', 'ADMIN']}>
                    <EmployeeDirectory />
                  </RoleRoute>
                }
              />

              {/* Attendance Management */}
              <Route
                path="/attendance"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <AttendanceDashboard />
                  </RoleRoute>
                }
              />

              {/* Shift & Schedule Management */}
              <Route
                path="/shifts"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <ShiftManagement />
                  </RoleRoute>
                }
              />

              {/* Leave Management */}
              <Route
                path="/leaves"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <LeaveDashboard />
                  </RoleRoute>
                }
              />

              {/* Team Leave Calendar */}
              <Route
                path="/leaves/calendar"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <LeaveCalendar />
                  </RoleRoute>
                }
              />

              {/* Document Management Center */}
              <Route
                path="/documents"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <DocumentCenter />
                  </RoleRoute>
                }
              />

              {/* Performance Management System */}
              <Route
                path="/performance"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <PerformanceDashboard />
                  </RoleRoute>
                }
              />

              {/* Advanced Analytics & Reports */}
              <Route
                path="/analytics"
                element={
                  <RoleRoute allowedRoles={['HR', 'ADMIN']}>
                    <AnalyticsDashboard />
                  </RoleRoute>
                }
              />

              {/* Payroll & Payslips */}
              <Route
                path="/payroll"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <PayrollDashboard />
                  </RoleRoute>
                }
              />

              {/* Notifications */}
              <Route
                path="/notifications"
                element={
                  <RoleRoute allowedRoles={['EMPLOYEE', 'HR', 'ADMIN']}>
                    <NotificationCenter />
                  </RoleRoute>
                }
              />
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
