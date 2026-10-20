import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, Calendar, CreditCard, Bell, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const emp = user?.employee;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-200 bg-indigo-800/60 px-2.5 py-1 rounded-md inline-block mb-2">
            Employee Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {emp?.full_name || user?.username}!
          </h1>
          <p className="text-indigo-100 text-sm mt-1">
            {emp?.designation || 'Team Member'} &bull; {emp?.department || 'Operations'} &bull; ID: {emp?.employee_code || 'EMP-0000'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/attendance"
            className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Clock In / Out</span>
          </Link>
          <Link
            to="/leaves"
            className="px-4 py-2.5 bg-indigo-500/40 hover:bg-indigo-500/60 border border-indigo-400/40 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Request Leave</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Today's Shift</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">Active</p>
          <p className="text-xs text-slate-500 mt-1">Standard 8.0 hrs workday</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Leave Balance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">18 Days</p>
          <p className="text-xs text-slate-500 mt-1">Paid & Casual leaves</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Monthly Salary</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            ${emp?.salary ? Number(emp.salary).toLocaleString() : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Monthly base salary</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Notifications</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">1 Unread</p>
          <p className="text-xs text-slate-500 mt-1">System & HR notifications</p>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-4">Quick Shortcuts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/attendance"
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-indigo-600 text-sm">Attendance Records</p>
                <p className="text-xs text-slate-500 mt-0.5">Check in/out and view monthly history</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </Link>

            <Link
              to="/leaves"
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-indigo-600 text-sm">Leave Applications</p>
                <p className="text-xs text-slate-500 mt-0.5">Apply and track review status</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </Link>

            <Link
              to="/payroll"
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-indigo-600 text-sm">Payslips & Payroll</p>
                <p className="text-xs text-slate-500 mt-0.5">Download monthly salary slips</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </Link>

            <Link
              to="/notifications"
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-indigo-600 text-sm">Notification Center</p>
                <p className="text-xs text-slate-500 mt-0.5">View HR announcements & alerts</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Profile Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Employee ID</span>
              <span className="font-semibold text-slate-800">{emp?.employee_code || 'EMP-0000'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Department</span>
              <span className="font-semibold text-slate-800">{emp?.department || 'Operations'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Designation</span>
              <span className="font-semibold text-slate-800">{emp?.designation || 'Team Member'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Work Email</span>
              <span className="font-semibold text-slate-800">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Status</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">
                {emp?.status || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
