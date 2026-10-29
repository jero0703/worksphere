import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboardApi';
import {
  Users,
  CalendarCheck,
  Clock,
  CheckSquare,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CreditCard,
  UserCheck,
  ListTodo,
  Megaphone,
  LogOut,
  MessageSquareHeart,
  FileText,
  Award,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HrDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await dashboardApi.getHrDashboard();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load HR dashboard');
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
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-blue-600/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-200 bg-blue-800/60 px-2.5 py-1 rounded-md inline-block mb-2">
            Human Resources Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {user?.employee?.full_name || user?.username || 'HR Manager'}!
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Workforce Management, Attendance Tracking & Leave Operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/attendance"
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance Log</span>
          </Link>
          <Link
            to="/leaves"
            className="px-4 py-2.5 bg-blue-500/40 hover:bg-blue-500/60 border border-blue-400/40 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Review Leaves</span>
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
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Employees</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {data ? `${data.total_active_employees} Staff` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data ? `${data.departments_count} Active departments` : 'Active roster'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Today's Attendance</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {data ? `${data.today_present_count} Present` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data ? `${data.today_late_count} Late &bull; ${data.today_absent_count} Absent` : 'Attendance logs'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Pending Leaves</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {data ? `${data.pending_leaves_count} Requests` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data ? `${data.approved_leaves_this_month} approved this month` : 'All requests up to date'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Payroll Disbursed</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            ${data ? Number(data.current_month_payroll_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Current monthly cycle</p>
        </div>
      </div>

      {/* HR Operations Shortcuts */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">HR Operations & Workforce Hub</h2>
          <p className="text-xs text-slate-500">Quick shortcuts to manage leaves, onboarding, tasks, and employee communication.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/attendance"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Attendance Summary</p>
              <p className="text-xs text-slate-500 mt-0.5">Daily & monthly attendance logs & corrections</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
          <Link
            to="/leaves"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Leave Approvals</p>
              <p className="text-xs text-slate-500 mt-0.5">Approve or reject time off with notes</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
          <Link
            to="/payroll"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Payroll Management</p>
              <p className="text-xs text-slate-500 mt-0.5">Salary generation and distribution</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
          <Link
            to="/onboarding"
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Employee Onboarding</p>
              <p className="text-xs text-slate-500 mt-0.5">Checklist milestones and induction tracking</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </Link>
          <Link
            to="/tasks"
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Internal Task Tracking</p>
              <p className="text-xs text-slate-500 mt-0.5">Assign, delegate, and monitor operational tasks</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </Link>
          <Link
            to="/announcements"
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Company Announcements</p>
              <p className="text-xs text-slate-500 mt-0.5">Post company news, updates and notices</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </Link>
          <Link
            to="/resignations"
            className="p-4 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Resignation Requests</p>
              <p className="text-xs text-slate-500 mt-0.5">Review notice periods & exit workflows</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
          </Link>
          <Link
            to="/feedback"
            className="p-4 rounded-xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Employee Feedback</p>
              <p className="text-xs text-slate-500 mt-0.5">Review sentiment, ratings and respond</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600 transition-colors" />
          </Link>
          <Link
            to="/employees"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Employee Directory</p>
              <p className="text-xs text-slate-500 mt-0.5">Browse 360-degree employee profiles</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
        </div>

        {/* Recent Pending Leaves */}
        {data?.recent_leave_requests && data.recent_leave_requests.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Pending Leave Approvals ({data.recent_leave_requests.length})
            </h3>
            <div className="space-y-2">
              {data.recent_leave_requests.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{l.employee?.full_name || `Emp #${l.employee_id}`}</span>
                    <span className="text-slate-400 mx-2">&bull;</span>
                    <span className="font-semibold text-indigo-700">{l.leave_type}</span>
                    <span className="text-slate-500 ml-1">({l.days_requested} days: {l.start_date} to {l.end_date})</span>
                  </div>
                  <Link
                    to="/leaves"
                    className="font-bold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Review &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HrDashboard;
