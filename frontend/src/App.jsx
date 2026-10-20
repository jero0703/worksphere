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

// Module placeholders for Phase 1
const ModulePlaceholder = ({ title, description }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center max-w-xl mx-auto shadow-xs mt-10">
    <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-lg">
      WS
    </div>
    <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    <p className="text-sm text-slate-500 mt-2">{description}</p>
    <div className="mt-6 inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
      Phase 1 Foundation Ready &bull; Proceeding to Module Implementation
    </div>
  </div>
);

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

              {/* Admin Users Management */}
              <Route
                path="/admin/users"
                element={
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminUsers />
                  </RoleRoute>
                }
              />

              {/* Placeholders ready for upcoming Phases */}
              <Route
                path="/employees"
                element={
                  <RoleRoute allowedRoles={['HR', 'ADMIN']}>
                    <ModulePlaceholder
                      title="Employee Management Directory"
                      description="Module 2 will introduce complete employee CRUD operations, advanced filters, pagination, and department-wise employee directory."
                    />
                  </RoleRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ModulePlaceholder
                    title="Attendance Management & Timesheets"
                    description="Module 3 will introduce daily check-in/out, working-hour calculations, and monthly attendance tracking."
                  />
                }
              />
              <Route
                path="/leaves"
                element={
                  <ModulePlaceholder
                    title="Leave Management & Approval System"
                    description="Module 4 will introduce leave applications, balance checks, and HR approval/rejection workflows."
                  />
                }
              />
              <Route
                path="/payroll"
                element={
                  <ModulePlaceholder
                    title="Payroll Processing & Payslips"
                    description="Module 5 will introduce automated monthly salary calculation and PDF payslip downloads."
                  />
                }
              />
              <Route
                path="/notifications"
                element={
                  <ModulePlaceholder
                    title="Notification Center"
                    description="Module 7 will introduce automated notifications for leave status, attendance reminders, and payroll release."
                  />
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
