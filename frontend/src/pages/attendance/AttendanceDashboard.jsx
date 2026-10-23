import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceApi } from '../../api/attendanceApi';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  UserCheck,
  Edit3,
  Play,
  Square,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const AttendanceDashboard = () => {
  const { user, hasRole } = useAuth();
  const isHrOrAdmin = hasRole(['HR', 'ADMIN']);

  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'management'
  const [todayStatus, setTodayStatus] = useState(null);
  const [personalHistory, setPersonalHistory] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filters for Management view
  const [filterDate, setFilterDate] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Correction Modal state
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [correctionStatus, setCorrectionStatus] = useState('PRESENT');
  const [correctionNotes, setCorrectionNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      // Load personal status
      const [today, history] = await Promise.all([
        attendanceApi.getTodayStatus(),
        attendanceApi.getPersonalHistory(),
      ]);
      setTodayStatus(today);
      setPersonalHistory(history);

      if (isHrOrAdmin) {
        const [mgmtRecords, summaryData] = await Promise.all([
          attendanceApi.getAllAttendance({
            date: filterDate || undefined,
            department: filterDept || undefined,
            status: filterStatus || undefined,
          }),
          attendanceApi.getSummary(filterDate || undefined),
        ]);
        setAllAttendance(mgmtRecords);
        setSummary(summaryData);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, filterDate, filterDept, filterStatus]);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setError('');
      setMessage('');
      const res = await attendanceApi.checkIn();
      setMessage(res.message);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setError('');
      setMessage('');
      const res = await attendanceApi.checkOut();
      setMessage(res.message);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCorrection = (record) => {
    setSelectedRecord(record);
    setCorrectionStatus(record.status);
    setCorrectionNotes(record.correction_notes || '');
    setCorrectionModalOpen(true);
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!correctionNotes.trim()) {
      setError('Please provide a reason for the attendance correction.');
      return;
    }
    try {
      setActionLoading(true);
      await attendanceApi.correctRecord(selectedRecord.id, {
        status: correctionStatus,
        correction_notes: correctionNotes,
      });
      setMessage('Attendance record corrected successfully.');
      setCorrectionModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to correct record');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerAutoAbsent = async () => {
    if (!window.confirm('Trigger auto-absence processing now? Employees without check-ins will be marked absent.')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await attendanceApi.processAutoAbsent(undefined, true);
      setMessage(res.details);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process auto-absence');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status, isLate) => {
    if (status === 'ABSENT') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Absent</span>;
    }
    if (status === 'HALF_DAY') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Half Day</span>;
    }
    if (isLate) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">Present (Late)</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Present (On-Time)</span>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track daily shifts, server timestamps, working hours, and organizational summaries.
          </p>
        </div>

        {/* Tab switch for HR/Admin */}
        {isHrOrAdmin && (
          <div className="flex bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'personal' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Attendance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('management')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'management' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Organization Overview
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-700 font-bold">&times;</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-700 font-bold">&times;</button>
        </div>
      )}

      {/* Check In / Out Punch Card (Shown on Personal tab) */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Today's Shift Status</span>
              <div className="flex items-center gap-2.5 mt-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {todayStatus?.status ? todayStatus.status : 'Not Clocked In'}
                </h2>
                {todayStatus && getStatusBadge(todayStatus.status, todayStatus.is_late)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Standard shift begins at 09:00 AM (15m grace period) &bull; Minimum 8.0 hrs full-day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {!todayStatus?.check_in ? (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{actionLoading ? 'Recording...' : 'Check In Now'}</span>
              </button>
            ) : !todayStatus?.check_out ? (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="text-right hidden sm:block">
                  <span className="text-xs text-slate-500 block">Check-in at</span>
                  <span className="text-sm font-bold text-slate-800">
                    {new Date(todayStatus.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="flex-1 md:flex-none px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  <span>{actionLoading ? 'Recording...' : 'Check Out'}</span>
                </button>
              </div>
            ) : (
              <div className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block">Shift Completed</span>
                <span className="text-sm font-bold text-slate-800">
                  {todayStatus.working_hours} Hours Logged
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERSONAL HISTORY VIEW */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Personal Attendance History</h2>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Check In</th>
                  <th className="px-6 py-3.5">Check Out</th>
                  <th className="px-6 py-3.5">Working Hours</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {personalHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                      No attendance records found yet. Check in above to start your log.
                    </td>
                  </tr>
                ) : (
                  personalHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {rec.date}
                      </td>
                      <td className="px-6 py-4">
                        {rec.check_in
                          ? new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {rec.check_out
                          ? new Date(rec.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {rec.working_hours} hrs
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(rec.status, rec.is_late)}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {Number(rec.overtime_hours) > 0 ? `+${rec.overtime_hours} hrs` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HR/ADMIN MANAGEMENT VIEW */}
      {activeTab === 'management' && isHrOrAdmin && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs uppercase text-slate-500 font-semibold">Active Roster</span>
                <p className="text-2xl font-bold text-slate-800 mt-1">{summary.total_active_employees}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs uppercase text-emerald-600 font-semibold">Present</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.present_count}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs uppercase text-orange-600 font-semibold">Late Arrivals</span>
                <p className="text-2xl font-bold text-orange-700 mt-1">{summary.late_count}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs uppercase text-amber-600 font-semibold">Half Day</span>
                <p className="text-2xl font-bold text-amber-700 mt-1">{summary.half_day_count}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs uppercase text-indigo-600 font-semibold">Attendance Rate</span>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{summary.attendance_rate}%</p>
              </div>
            </div>
          )}

          {/* Action Bar & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Executive">Executive</option>
                <option value="Design">Design</option>
                <option value="Operations">Operations</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="PRESENT">PRESENT</option>
                <option value="HALF_DAY">HALF_DAY</option>
                <option value="ABSENT">ABSENT</option>
              </select>
              {(filterDate || filterDept || filterStatus) && (
                <button
                  onClick={() => { setFilterDate(''); setFilterDept(''); setFilterStatus(''); }}
                  className="text-xs text-indigo-600 font-medium hover:underline px-2"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleTriggerAutoAbsent}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                title="Process end-of-day absence records for unclocked employees"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Run Auto-Absence</span>
              </button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Check In / Out</th>
                    <th className="px-6 py-3.5">Working Hours</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                        No records match the specified filters.
                      </td>
                    </tr>
                  ) : (
                    allAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{rec.employee_name || 'Staff'}</div>
                          <div className="text-xs text-slate-500">{rec.employee_code} &bull; {rec.department}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">{rec.date}</td>
                        <td className="px-6 py-4 text-xs">
                          <div>In: {rec.check_in ? new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                          <div>Out: {rec.check_out ? new Date(rec.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {rec.working_hours} hrs
                          {Number(rec.overtime_hours) > 0 && (
                            <span className="block text-[11px] text-indigo-600 font-bold">+{rec.overtime_hours} OT</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(rec.status, rec.is_late)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenCorrection(rec)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                            title="Admin Correction"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CORRECTION MODAL */}
      {correctionModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900">Correct Attendance Record</h3>
            <p className="text-xs text-slate-500 mt-1">
              Adjusting record for {selectedRecord.employee_name} ({selectedRecord.date})
            </p>

            <form onSubmit={handleSaveCorrection} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Correction Reason / Audit Note *
                </label>
                <textarea
                  rows="3"
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="e.g. Employee forgot to punch out; confirmed presence via manager"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
