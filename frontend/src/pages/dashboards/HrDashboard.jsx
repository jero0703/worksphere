import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, CalendarCheck, Clock, CheckSquare, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HrDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-blue-600/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-200 bg-blue-800/60 px-2.5 py-1 rounded-md inline-block mb-2">
            Human Resources Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {user?.employee?.full_name || 'HR Manager'}!
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Workforce Management, Attendance Tracking & Leave Operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/employees"
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Manage Employees</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Employees</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">3 Staff</p>
          <p className="text-xs text-slate-500 mt-1">100% active roster</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Today's Attendance</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">100%</p>
          <p className="text-xs text-slate-500 mt-1">Present on duty</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Pending Leaves</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">0 Requests</p>
          <p className="text-xs text-slate-500 mt-1">All requests up to date</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Payroll Cycle</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">October 2026</p>
          <p className="text-xs text-slate-500 mt-1">Current processing month</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">HR Operations Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/employees"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Employee Directory</p>
              <p className="text-xs text-slate-500 mt-0.5">Profiles, departments, and roles</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            to="/attendance"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Attendance Summary</p>
              <p className="text-xs text-slate-500 mt-0.5">Daily & monthly attendance logs</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            to="/payroll"
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Payroll Management</p>
              <p className="text-xs text-slate-500 mt-0.5">Salary generation and distribution</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HrDashboard;
