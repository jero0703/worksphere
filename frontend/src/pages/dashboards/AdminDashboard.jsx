import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboardApi';
import {
  Shield,
  Users,
  Server,
  Database,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CreditCard,
  CalendarCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await dashboardApi.getAdminDashboard();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load Admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-purple-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-purple-200 bg-purple-800/60 px-2.5 py-1 rounded-md inline-block mb-2">
            System Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Administrator Console
          </h1>
          <p className="text-purple-200 text-sm mt-1">
            Signed in as {user?.email} &bull; Full Organization Access
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="px-4 py-2.5 bg-white text-purple-800 hover:bg-purple-50 font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>Manage Roles</span>
          </Link>
          <Link
            to="/attendance"
            className="px-4 py-2.5 bg-purple-600/50 hover:bg-purple-600/70 border border-purple-400/40 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Users</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {data ? `${data.total_users} Accounts` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data ? `${data.active_users} Active (${data.role_breakdown?.ADMIN || 0} Admins, ${data.role_breakdown?.HR || 0} HR)` : 'System accounts'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Employees Roster</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {data ? `${data.active_employees} Active` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data ? `Out of ${data.total_employees} staff (${data.pending_leave_requests || 0} pending leaves)` : 'Profiles'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Today's Attendance</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {data ? `${data.today_attendance_summary?.PRESENT || data.today_attendance_summary?.present || 0} Present` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data ? `${data.today_attendance_summary?.LATE || data.today_attendance_summary?.late || 0} Late, ${data.today_attendance_summary?.ABSENT || data.today_attendance_summary?.absent || 0} Absent` : 'Attendance metrics'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Payroll Disbursed</span>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            ${data ? Number(data.current_month_payroll_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Current month compensation cycle
          </p>
        </div>
      </div>

      {/* Admin Modules */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">Administration Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">User & Role Management</p>
              <p className="text-xs text-slate-500 mt-0.5">Control permissions, roles and account state</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            to="/attendance"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Attendance Records</p>
              <p className="text-xs text-slate-500 mt-0.5">Audit check-ins, corrections, and absences</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            to="/payroll"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Financial Audits & Payroll</p>
              <p className="text-xs text-slate-500 mt-0.5">Generate payroll dispatches and PDF payslips</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
