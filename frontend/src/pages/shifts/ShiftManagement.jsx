import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { shiftApi } from '../../api/shiftApi';
import { payrollApi } from '../../api/payrollApi';
import {
  Clock,
  Calendar,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';

export const ShiftManagement = () => {
  const { user, hasRole } = useAuth();
  const isHrOrAdmin = hasRole(['HR', 'ADMIN']);

  const [activeTab, setActiveTab] = useState(isHrOrAdmin ? 'shifts' : 'my_schedule');
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [myShiftDetails, setMyShiftDetails] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Modals
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    start_time: '09:00:00',
    end_time: '17:00:00',
    description: '',
    is_active: true,
  });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    shift_id: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  });

  const [autoAbsentModalOpen, setAutoAbsentModalOpen] = useState(false);
  const [autoAbsentDate, setAutoAbsentDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoAbsentForce, setAutoAbsentForce] = useState(false);

  // Filters for assignments tab
  const [filterShiftId, setFilterShiftId] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const promises = [
        shiftApi.getShifts(),
        shiftApi.getMyShift().catch(() => null),
      ];

      if (isHrOrAdmin) {
        promises.push(shiftApi.getAssignments());
        promises.push(payrollApi.getEligibleEmployees().catch(() => []));
      }

      const results = await Promise.all(promises);
      setShifts(results[0] || []);
      setMyShiftDetails(results[1] || null);

      if (isHrOrAdmin) {
        setAssignments(results[2] || []);
        setEmployees(results[3] || []);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load shift information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateShift = () => {
    setEditingShift(null);
    setShiftForm({
      name: '',
      start_time: '09:00:00',
      end_time: '17:00:00',
      description: '',
      is_active: true,
    });
    setShiftModalOpen(true);
  };

  const handleOpenEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      description: shift.description || '',
      is_active: shift.is_active,
    });
    setShiftModalOpen(true);
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError('');
      setMessage('');

      // Normalize times to HH:MM:SS
      const formatTime = (t) => (t.length === 5 ? `${t}:00` : t);
      const payload = {
        ...shiftForm,
        start_time: formatTime(shiftForm.start_time),
        end_time: formatTime(shiftForm.end_time),
      };

      if (editingShift) {
        await shiftApi.updateShift(editingShift.id, payload);
        setMessage(`Shift "${payload.name}" updated successfully.`);
      } else {
        await shiftApi.createShift(payload);
        setMessage(`Shift "${payload.name}" created successfully.`);
      }

      setShiftModalOpen(false);
      setActiveTab('shifts');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteShift = async (shift) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate shift "${shift.name}"?`)) {
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      const res = await shiftApi.deleteShift(shift.id);
      setMessage(res.message);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAssign = (employeeId = '', shiftId = '') => {
    setAssignForm({
      employee_id: employeeId || '',
      shift_id: shiftId || '',
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
    });
    setAssignModalOpen(true);
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this employee shift assignment?')) {
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      const res = await shiftApi.deleteAssignment(assignmentId);
      setMessage(res.message);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError('');
      setMessage('');

      const payload = {
        employee_id: parseInt(assignForm.employee_id, 10),
        shift_id: parseInt(assignForm.shift_id, 10),
        effective_from: assignForm.effective_from,
        effective_to: assignForm.effective_to || null,
      };

      await shiftApi.assignShift(payload);
      setMessage('Shift assignment successfully established.');
      setAssignModalOpen(false);
      setActiveTab('assignments');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunAutoAbsent = async () => {
    try {
      setActionLoading(true);
      setError('');
      setMessage('');

      const res = await shiftApi.processAttendance(autoAbsentDate, autoAbsentForce);
      setMessage(res.details);
      setAutoAbsentModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Automated attendance processing failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesShift = !filterShiftId || String(a.shift_id) === String(filterShiftId);
    const searchLower = assignmentSearch.toLowerCase();
    const matchesSearch =
      !assignmentSearch ||
      (a.employee_name && a.employee_name.toLowerCase().includes(searchLower)) ||
      (a.employee_code && a.employee_code.toLowerCase().includes(searchLower)) ||
      (a.department && a.department.toLowerCase().includes(searchLower));
    return matchesShift && matchesSearch;
  });

  const getShiftIcon = (name, isOvernight) => {
    if (isOvernight) return <Moon className="w-5 h-5 text-indigo-400" />;
    const lower = name.toLowerCase();
    if (lower.includes('morning')) return <Sunrise className="w-5 h-5 text-amber-500" />;
    if (lower.includes('evening') || lower.includes('afternoon')) return <Sunset className="w-5 h-5 text-orange-500" />;
    return <Sun className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shift & Attendance Automation</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module 14
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure enterprise work shifts, assign schedules, manage overnight coverage, and run shift-aware attendance processing.
          </p>
        </div>

        {isHrOrAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setAutoAbsentModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Process Attendance</span>
            </button>
            <button
              onClick={() => handleOpenAssign()}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-2 transition-all"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Assign Shift</span>
            </button>
            <button
              onClick={handleOpenCreateShift}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-indigo-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Shift</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        {isHrOrAdmin && (
          <>
            <button
              onClick={() => setActiveTab('shifts')}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'shifts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Shift Configurations ({shifts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'assignments'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Roster Assignments ({assignments.length})</span>
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('my_schedule')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'my_schedule'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>My Assigned Schedule</span>
        </button>
      </div>

      {/* TAB 1: SHIFT CONFIGURATIONS */}
      {activeTab === 'shifts' && isHrOrAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                        {getShiftIcon(shift.name, shift.is_overnight)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{shift.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {shift.is_overnight ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Overnight (Crosses Midnight)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Day Shift
                            </span>
                          )}
                          {!shift.is_active && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditShift(shift)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                        title="Edit shift"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteShift(shift)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                        title="Delete or deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Scheduled Hours:</span>
                      <span className="font-bold text-slate-800">
                        {shift.start_time.slice(0, 5)} &rarr; {shift.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Shift Duration:</span>
                      <span className="font-bold text-indigo-600">{shift.duration_hours} Hours</span>
                    </div>
                    {shift.description && (
                      <p className="text-xs text-slate-500 pt-1 italic">{shift.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    ID #{shift.id} &bull; Created {new Date(shift.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleOpenAssign('', shift.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>Assign</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ROSTER ASSIGNMENTS */}
      {activeTab === 'assignments' && isHrOrAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search employee or dept..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <select
                value={filterShiftId}
                onChange={(e) => setFilterShiftId(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Shifts</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Showing {filteredAssignments.length} assignment(s)
              </span>
              <button
                onClick={loadData}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Assigned Shift</th>
                  <th className="px-6 py-3.5">Working Hours</th>
                  <th className="px-6 py-3.5">Effective Dates</th>
                  <th className="px-6 py-3.5">Assigned By</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                      No shift assignments match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{a.employee_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{a.employee_code}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {a.department || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{a.shift_name}</span>
                          {a.is_overnight && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Overnight
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {a.shift_start?.slice(0, 5)} &rarr; {a.shift_end?.slice(0, 5)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 text-xs">
                        {a.duration_hours} hrs/day
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-medium text-slate-800">{a.effective_from}</span>
                        {a.effective_to ? (
                          <span className="text-slate-400"> to {a.effective_to}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium"> (Active / Ongoing)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {a.assigned_by_name || 'System Initialized'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAssign(a.employee_id, a.shift_id)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(a.id)}
                            className="p-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL SCHEDULE VIEW */}
      {activeTab === 'my_schedule' && (
        <div className="space-y-6">
          {myShiftDetails?.active_shift ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  {getShiftIcon(myShiftDetails.active_shift.name, myShiftDetails.active_shift.is_overnight)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-indigo-600">
                      Currently Assigned Shift
                    </span>
                    {myShiftDetails.active_shift.is_overnight && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        Overnight Shift
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">
                    {myShiftDetails.active_shift.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Daily Schedule: {myShiftDetails.active_shift.start_time.slice(0, 5)} to{' '}
                      {myShiftDetails.active_shift.end_time.slice(0, 5)} &bull;{' '}
                      {myShiftDetails.active_shift.duration_hours} Hours per Shift
                    </span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1 w-full md:w-auto">
                <div>
                  <span className="font-semibold text-slate-700">Late Grace Period:</span> 15 Minutes
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Half-Day Cutoff:</span> Under 4.0 Hours
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Overtime Eligibility:</span> Over{' '}
                  {myShiftDetails.active_shift.duration_hours} Hours
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No Custom Shift Assigned</p>
              <p className="text-xs mt-1">You are following the standard default company work hours (09:00 - 17:00).</p>
            </div>
          )}

          {/* Shift Assignment History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Personal Shift Assignment History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Shift Name</th>
                    <th className="px-6 py-3.5">Start & End</th>
                    <th className="px-6 py-3.5">Duration</th>
                    <th className="px-6 py-3.5">Effective From</th>
                    <th className="px-6 py-3.5">Effective To</th>
                    <th className="px-6 py-3.5">Assigned By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!myShiftDetails?.history || myShiftDetails.history.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-6 text-center text-slate-400">
                        No previous shift reassignments logged.
                      </td>
                    </tr>
                  ) : (
                    myShiftDetails.history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {h.shift_name}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {h.shift_start?.slice(0, 5)} - {h.shift_end?.slice(0, 5)}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800 text-xs">
                          {h.duration_hours} hrs
                        </td>
                        <td className="px-6 py-4 text-xs">{h.effective_from}</td>
                        <td className="px-6 py-4 text-xs">
                          {h.effective_to || <span className="text-emerald-600 font-semibold">Active</span>}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{h.assigned_by_name || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT SHIFT */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {editingShift ? 'Edit Shift Configuration' : 'Create New Work Shift'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Specify the shift name, schedule times, and coverage rules.
            </p>

            <form onSubmit={handleSaveShift} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Shift, Night Shift"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </div>

              {shiftForm.start_time > shiftForm.end_time && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                  <Moon className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Overnight Shift Detected:</span> This shift ends on the next calendar day. Working hours and auto-absence will span across midnight.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Brief summary of department or coverage purpose..."
                  value={shiftForm.description}
                  onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shiftActiveToggle"
                  checked={shiftForm.is_active}
                  onChange={(e) => setShiftForm({ ...shiftForm, is_active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="shiftActiveToggle" className="text-xs font-medium text-slate-700">
                  Shift is Active and Available for Assignment
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN SHIFT */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900">Assign Employee to Shift</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an employee and their scheduled work shift. Prior open assignments will automatically close.
            </p>

            <form onSubmit={handleSaveAssignment} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee *</label>
                <select
                  required
                  value={assignForm.employee_id}
                  onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Schedule *</label>
                <select
                  required
                  value={assignForm.shift_id}
                  onChange={(e) => setAssignForm({ ...assignForm, shift_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Shift...</option>
                  {shifts
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}, {s.duration_hours}h)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Effective From *</label>
                  <input
                    type="date"
                    required
                    value={assignForm.effective_from}
                    onChange={(e) => setAssignForm({ ...assignForm, effective_from: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={assignForm.effective_to}
                    onChange={(e) => setAssignForm({ ...assignForm, effective_to: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RUN AUTOMATED ATTENDANCE */}
      {autoAbsentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Shift-Aware Attendance Automation</h2>
                <p className="text-xs text-slate-500">Scheduled absence processing engine</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">Processing Engine Rules:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>Evaluates each employee against their assigned shift schedule.</li>
                <li>Preserves overnight shifts until after next-day shift completion.</li>
                <li>Excludes employees on approved leaves and company holidays.</li>
                <li>Execution is idempotent: safe to run multiple times without duplicating records.</li>
              </ul>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Date</label>
                <input
                  type="date"
                  value={autoAbsentDate}
                  onChange={(e) => setAutoAbsentDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="forceCutoff"
                  checked={autoAbsentForce}
                  onChange={(e) => setAutoAbsentForce(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="forceCutoff" className="text-xs font-medium text-slate-700">
                  Force Execution (Override shift cutoff and weekend check)
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAutoAbsentModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunAutoAbsent}
                disabled={actionLoading}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{actionLoading ? 'Processing...' : 'Run Auto-Absence'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
