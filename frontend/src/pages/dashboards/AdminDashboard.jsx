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
  CheckSquare,
  ListTodo,
  Megaphone,
  LogOut,
  MessageSquareHeart,
  BarChart3,
  FileText,
  Award,
  Clock,
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Administration & Operations Modules</h2>
            <p className="text-xs text-slate-500">Quick access to governance, workforce tracking, and employee experience workflows.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
            All 12 Modules Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">User & Role Management</p>
                <p className="text-xs text-slate-500 mt-0.5">Control permissions, roles, and account state</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </Link>

          <Link
            to="/onboarding"
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Employee Onboarding</p>
                <p className="text-xs text-slate-500 mt-0.5">Milestone checklists & induction progress</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </Link>

          <Link
            to="/tasks"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                <ListTodo className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Internal Task Tracking</p>
                <p className="text-xs text-slate-500 mt-0.5">Assign, delegate, and monitor task deadlines</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>

          <Link
            to="/announcements"
            className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Company Announcements</p>
                <p className="text-xs text-slate-500 mt-0.5">Broadcast bulletin notices & alerts</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </Link>

          <Link
            to="/resignations"
            className="p-4 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100 transition-colors">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Resignation & Exit Management</p>
                <p className="text-xs text-slate-500 mt-0.5">Notice periods, approvals & transition remarks</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
          </Link>

          <Link
            to="/feedback"
            className="p-4 rounded-xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-pink-50 text-pink-600 rounded-lg group-hover:bg-pink-100 transition-colors">
                <MessageSquareHeart className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Employee Feedback & Sentiment</p>
                <p className="text-xs text-slate-500 mt-0.5">Anonymous ratings, pulse, and HR responses</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600 transition-colors" />
          </Link>

          <Link
            to="/attendance"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Attendance Records</p>
                <p className="text-xs text-slate-500 mt-0.5">Audit check-ins, corrections, and absences</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </Link>

          <Link
            to="/payroll"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Financial Audits & Payroll</p>
                <p className="text-xs text-slate-500 mt-0.5">Generate payroll dispatches and PDF payslips</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </Link>

          <Link
            to="/employees"
            className="p-4 rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg group-hover:bg-cyan-100 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Organization Directory</p>
                <p className="text-xs text-slate-500 mt-0.5">Employee roster, 360 profiles & filtering</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
          </Link>

          <Link
            to="/shifts"
            className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-100 transition-colors">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Shift Scheduling</p>
                <p className="text-xs text-slate-500 mt-0.5">Roster planning, night shifts & assignments</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
          </Link>

          <Link
            to="/documents"
            className="p-4 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Document Management</p>
                <p className="text-xs text-slate-500 mt-0.5">Certificates, contracts, ID proof storage</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
          </Link>

          <Link
            to="/analytics"
            className="p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-50 text-violet-600 rounded-lg group-hover:bg-violet-100 transition-colors">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Analytics & Reports</p>
                <p className="text-xs text-slate-500 mt-0.5">Workforce insights, trends & CSV exports</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
