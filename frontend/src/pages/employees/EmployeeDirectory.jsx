import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../api/employeeApi';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  Clock,
  Star,
  FileText,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Briefcase,
  Calendar,
  Eye,
  RefreshCw,
  CalendarCheck,
} from 'lucide-react';

export const EmployeeDirectory = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  // State
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [hasShiftFilter, setHasShiftFilter] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState('');
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Employee 360 Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Fetch Employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        q: searchQuery.trim() || undefined,
        department: selectedDept || undefined,
        status: selectedStatus || undefined,
        role: selectedRole || undefined,
        has_shift: hasShiftFilter === '' ? undefined : hasShiftFilter === 'true',
        min_rating: minRatingFilter ? Number(minRatingFilter) : undefined,
      };

      const res = await employeeApi.searchEmployees(params);
      setEmployees(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
      if (res.departments) setDepartments(res.departments);
      if (res.designations) setDesignations(res.designations);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to search employee directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, pageSize, selectedDept, selectedStatus, selectedRole, hasShiftFilter, minRatingFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  // View Profile Details
  const handleOpenProfile = async (empId) => {
    try {
      setProfileLoading(true);
      setProfileError('');
      setSelectedProfile(null);
      const prof = await employeeApi.getProfile(empId);
      setSelectedProfile(prof);
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to load employee profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Helper for attendance badge
  const getAttendanceBadge = (att) => {
    if (!att) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
          Not Checked In
        </span>
      );
    }
    if (att.status === 'PRESENT') {
      if (att.is_late) {
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Late Check-In
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Present
        </span>
      );
    }
    if (att.status === 'ON_LEAVE') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          On Leave
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        Absent
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Directory & Search</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, and inspect comprehensive 360-degree profiles of all organization staff.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* View Mode Toggle */}
          <div className="bg-white p-1 border border-slate-200 rounded-xl shadow-xs flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Comprehensive Filter Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Main Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, employee code, department, role, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns & Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Access Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Roles</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="HR">HR</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Shift Coverage */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Shift Assigned
            </label>
            <select
              value={hasShiftFilter}
              onChange={(e) => {
                setHasShiftFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">Any</option>
              <option value="true">Has Shift</option>
              <option value="false">Unassigned</option>
            </select>
          </div>

          {/* Min Performance Rating */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Performance
            </label>
            <select
              value={minRatingFilter}
              onChange={(e) => {
                setMinRatingFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">Any Rating</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4.0">4.0+ Stars</option>
              <option value="3.0">3.0+ Stars</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Sort By
            </label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="full_name">Name</option>
                <option value="joining_date">Joining Date</option>
                <option value="salary">Salary</option>
                <option value="department">Department</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs"
                title={`Sort ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Content Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
        <span>Showing {employees.length} of {total} employees</span>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-3 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Searching employee directory...
            </div>
          ) : employees.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              No employees found matching the search criteria.
            </div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Code, Status & 360 View */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm shadow-xs">
                        {emp.employee_code}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{emp.full_name}</h3>
                        <p className="text-xs text-slate-400">{emp.designation}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </div>

                  {/* Badges / Pill tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                      {emp.department}
                    </span>
                    {emp.role && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {emp.role}
                      </span>
                    )}
                  </div>

                  {/* Highlights section */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    {/* Shift */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Shift:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {emp.current_shift ? (
                          `${emp.current_shift.name} (${emp.current_shift.start_time} - ${emp.current_shift.end_time})`
                        ) : (
                          <span className="text-slate-400 italic">Standard Hours</span>
                        )}
                      </span>
                    </div>

                    {/* Today Attendance */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5" /> Today:
                      </span>
                      {getAttendanceBadge(emp.today_attendance)}
                    </div>

                    {/* Performance */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" /> Performance:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {emp.latest_performance ? (
                          <span className="text-amber-600 font-bold">
                            ★ {emp.latest_performance.rating.toFixed(1)} / 5.0
                          </span>
                        ) : (
                          <span className="text-slate-400">Not Evaluated</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {emp.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    {emp.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {emp.documents_count} file(s)
                  </span>
                  <button
                    onClick={() => handleOpenProfile(emp.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>360° Profile</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Shift</th>
                  <th className="px-6 py-3.5">Today Attendance</th>
                  <th className="px-6 py-3.5">Performance</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading directory...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No employees match your search criteria.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.employee_code}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.full_name}</div>
                            <div className="text-xs text-slate-400">{emp.designation}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-700">{emp.department}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {emp.current_shift ? emp.current_shift.name : 'Standard'}
                      </td>

                      <td className="px-6 py-4">{getAttendanceBadge(emp.today_attendance)}</td>

                      <td className="px-6 py-4 text-xs">
                        {emp.latest_performance ? (
                          <span className="font-bold text-amber-600">
                            ★ {emp.latest_performance.rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenProfile(emp.id)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 text-xs font-semibold transition-colors"
                        >
                          View 360°
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-semibold text-slate-600">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Employee 360-Degree Profile Modal */}
      {(selectedProfile || profileLoading) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Employee 360° Profile</span>
              </h2>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileLoading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading comprehensive employee data...
              </div>
            ) : selectedProfile ? (
              <div className="space-y-6">
                {/* Header Overview Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-indigo-600/30">
                      {selectedProfile.employee_code}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{selectedProfile.full_name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {selectedProfile.designation} &bull; {selectedProfile.department}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Joined {new Date(selectedProfile.joining_date).toLocaleDateString()} &bull; Base: $
                        {selectedProfile.salary?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedProfile.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {selectedProfile.status}
                  </span>
                </div>

                {/* Shift Details */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Current Assigned Shift
                  </h4>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">
                        {selectedProfile.current_shift ? selectedProfile.current_shift.name : 'Standard Business Hours'}
                      </span>
                      {selectedProfile.current_shift && (
                        <p className="text-slate-500 mt-0.5">
                          Timing: {selectedProfile.current_shift.start_time} - {selectedProfile.current_shift.end_time}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded">
                      Active Schedule
                    </span>
                  </div>
                </div>

                {/* Performance Evaluation History */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Performance Review History ({selectedProfile.performances?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedProfile.performances?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No formal evaluations on record.</p>
                    ) : (
                      selectedProfile.performances?.map((p) => (
                        <div key={p.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">{p.review_period}</span>
                            <span className="font-bold text-amber-600">★ {p.rating.toFixed(1)} / 5.0</span>
                          </div>
                          <p className="text-slate-600 italic">"{p.feedback}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Compliance Documents */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Stored Documents & Proofs ({selectedProfile.documents?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedProfile.documents?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No compliance documents uploaded.</p>
                    ) : (
                      selectedProfile.documents?.map((d) => (
                        <div
                          key={d.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-slate-800">{d.file_name}</span>
                            <span className="text-slate-400">({d.document_type})</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(d.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
