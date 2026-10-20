import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Users, Server, Database, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
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
            to="/employees"
            className="px-4 py-2.5 bg-purple-600/50 hover:bg-purple-600/70 border border-purple-400/40 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Directory</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Users</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">3 Accounts</p>
          <p className="text-xs text-slate-500 mt-1">Admin, HR & Employee</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Database Status</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">Connected</p>
          <p className="text-xs text-slate-500 mt-1">MySQL 8.0 &bull; worksphere_db</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">API Health</span>
          <p className="text-2xl font-bold text-indigo-600 mt-2">Healthy</p>
          <p className="text-xs text-slate-500 mt-1">FastAPI v1.0.0 Online</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Security Level</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">Argon2 + JWT</p>
          <p className="text-xs text-slate-500 mt-1">Role-Based Access Control</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">Administration Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">User & Role Management</p>
              <p className="text-xs text-slate-500 mt-0.5">Control permissions and accounts</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            to="/employees"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Organization Records</p>
              <p className="text-xs text-slate-500 mt-0.5">Complete employee directories</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            to="/payroll"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm">Financial Audits</p>
              <p className="text-xs text-slate-500 mt-0.5">Payroll ledgers and records</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
