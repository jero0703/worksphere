import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveApi } from '../../api/leaveApi';
import { LeaveCalendar } from './LeaveCalendar';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  ShieldCheck,
  Ban,
  Check,
  X,
  Calendar,
  Layers,
} from 'lucide-react';

const formatError = (err, fallback = 'Operation failed') => {
  const detail = err.response?.data?.detail;
  if (!detail) return err.message || fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.message || detail.msg || JSON.stringify(detail);
  }
  return String(detail);
};

export const LeaveDashboard = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  // State
  const [activeTab, setActiveTab] = useState('my-leaves'); // 'my-leaves' | 'approvals' | 'policies'
  const [balances, setBalances] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyModalError, setApplyModalError] = useState('');
  const [applyForm, setApplyForm] = useState({
    leave_type: 'CASUAL',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Review Modal State
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    leaveId: null,
    action: 'APPROVE', // 'APPROVE' | 'REJECT'
    comment: '',
    applicantName: '',
  });

  // Calculate requested days
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (s > e) return 0;
    const diffTime = e - s;
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const requestedDays = calculateDays(applyForm.start_date, applyForm.end_date);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [balanceRes, myLeaveRes] = await Promise.all([
        leaveApi.getMyBalances(),
        leaveApi.getMyLeaves(),
      ]);
      setBalances(Array.isArray(balanceRes) ? balanceRes : []);
      setMyLeaves(Array.isArray(myLeaveRes) ? myLeaveRes : (myLeaveRes ? [myLeaveRes] : []));

      if (isHrOrAdmin) {
        const [allLeaveRes, policyRes] = await Promise.all([
          leaveApi.getAllLeaves(),
          leaveApi.getPolicies(),
        ]);
        setAllLeaves(Array.isArray(allLeaveRes) ? allLeaveRes : (allLeaveRes ? [allLeaveRes] : []));
        setPolicies(Array.isArray(policyRes) ? policyRes : []);
      }
    } catch (err) {
      setError(formatError(err, 'Failed to load leave records'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isHrOrAdmin]);

  // Handle Apply Submission
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyModalError('');

    if (!applyForm.start_date || !applyForm.end_date) {
      setApplyModalError('Please specify both start and end dates.');
      return;
    }

    if (requestedDays <= 0) {
      setApplyModalError('End date must be greater than or equal to start date.');
      return;
    }

    if (!applyForm.reason.trim()) {
      setApplyModalError('Please provide a reason for your leave.');
      return;
    }

    const currentBal = balances.find((b) => b.leave_type === applyForm.leave_type);
    const available = currentBal ? Number(currentBal.remaining_days ?? currentBal.available_days ?? 0) : 0;
    if (currentBal && requestedDays > available) {
      setApplyModalError(`Insufficient leave balance. You have ${available} days available for ${applyForm.leave_type} leave.`);
      return;
    }

    try {
      setActionLoading(true);
      const newLeave = await leaveApi.apply(applyForm);
      setSuccessMsg('Leave application submitted successfully!');
      setShowApplyModal(false);
      setApplyModalError('');
      setApplyForm({
        leave_type: 'CASUAL',
        start_date: '',
        end_date: '',
        reason: '',
      });

      // Optimistic update so the record appears immediately
      if (newLeave && newLeave.id) {
        setMyLeaves((prev) => [newLeave, ...prev.filter((l) => l.id !== newLeave.id)]);
      }

      await fetchData();
    } catch (err) {
      setApplyModalError(formatError(err, 'Failed to submit leave application'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel Leave
  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      setActionLoading(true);
      setError('');
      await leaveApi.cancel(leaveId);
      setSuccessMsg('Leave application cancelled successfully.');
      fetchData();
    } catch (err) {
      setError(formatError(err, 'Failed to cancel leave application'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Review (Approve / Reject)
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError('');
      if (reviewModal.action === 'APPROVE') {
        await leaveApi.approve(reviewModal.leaveId, reviewModal.comment);
        setSuccessMsg('Leave approved successfully and balance updated.');
      } else {
        await leaveApi.reject(reviewModal.leaveId, reviewModal.comment);
        setSuccessMsg('Leave application rejected.');
      }
      setReviewModal({ isOpen: false, leaveId: null, action: 'APPROVE', comment: '', applicantName: '' });
      fetchData();
    } catch (err) {
      setError(formatError(err, 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Ban className="w-3.5 h-3.5 text-slate-400" />
            Cancelled
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track leave balances, apply for time off, and review organizational requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setApplyModalError('');
              setShowApplyModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
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

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Leave Balance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {balances.map((bal) => {
          const totalAllowed = Number(bal.total_allowed ?? bal.total_days ?? 0);
          const remainingDays = Number(bal.remaining_days ?? bal.available_days ?? 0);
          const usedDays = totalAllowed > 0 ? Math.max(0, totalAllowed - remainingDays) : Number(bal.used_days || 0);
          const usedPct = totalAllowed > 0 ? Math.min(100, Math.round((usedDays / totalAllowed) * 100)) : 0;
          return (
            <div
              key={bal.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {bal.leave_type} LEAVE
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {totalAllowed} Days / Year
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-extrabold text-slate-900">{remainingDays}</span>
                  <span className="text-sm font-medium text-slate-500">days available</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Used: {usedDays} / {totalAllowed} days</span>
                  <span>{usedPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      bal.leave_type === 'SICK'
                        ? 'bg-amber-500'
                        : bal.leave_type === 'CASUAL'
                        ? 'bg-blue-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('my-leaves')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'my-leaves'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Applications ({myLeaves.length})
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Team Leave Calendar</span>
          </button>

          {isHrOrAdmin && (
            <>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`pb-3 text-sm font-semibold transition-all relative ${
                  activeTab === 'approvals'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Review & Approvals ({allLeaves.filter((l) => l.status === 'PENDING').length} Pending)
              </button>
              <button
                onClick={() => setActiveTab('policies')}
                className={`pb-3 text-sm font-semibold transition-all relative ${
                  activeTab === 'policies'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Leave Policies ({policies.length})
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Tab 1: My Leave Applications */}
      {activeTab === 'my-leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Days</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Review Remarks</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading leave applications...
                    </td>
                  </tr>
                ) : myLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-slate-400">
                      No leave applications submitted yet.
                    </td>
                  </tr>
                ) : (
                  myLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{leave.leave_type}</td>
                      <td className="px-6 py-4">
                        <div className="text-slate-800 font-medium">
                          {leave.start_date} to {leave.end_date}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {leave.days_requested} {Number(leave.days_requested) === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-600">{leave.reason}</td>
                      <td className="px-6 py-4">{getStatusBadge(leave.status)}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {leave.review_comment || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {leave.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => handleCancelLeave(leave.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: HR Approvals */}
      {activeTab === 'approvals' && isHrOrAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Dates</th>
                  <th className="px-6 py-3.5">Days</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-slate-400">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  allLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {leave.employee_name || leave.employee?.full_name || `Employee #${leave.employee_id}`}
                        </div>
                        <div className="text-xs text-slate-400">
                          {leave.employee_code || leave.employee?.employee_code} &bull; {leave.department || leave.employee?.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{leave.leave_type}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {leave.start_date} &rarr; {leave.end_date}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {leave.days_requested} {Number(leave.days_requested) === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-600">{leave.reason}</td>
                      <td className="px-6 py-4">{getStatusBadge(leave.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {leave.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setReviewModal({
                                  isOpen: true,
                                  leaveId: leave.id,
                                  action: 'APPROVE',
                                  comment: '',
                                  applicantName: leave.employee_name || leave.employee?.full_name || 'Employee',
                                })
                              }
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setReviewModal({
                                  isOpen: true,
                                  leaveId: leave.id,
                                  action: 'REJECT',
                                  comment: '',
                                  applicantName: leave.employee_name || leave.employee?.full_name || 'Employee',
                                })
                              }
                              className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Policies */}
      {activeTab === 'policies' && isHrOrAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {policies.map((p) => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  {p.leave_type} Policy
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Active
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">{Number(p.total_days_allowed ?? p.total_days ?? 0)} Days / Year</h3>
              <p className="text-sm text-slate-500 mt-2">{p.description || `Standard corporate policy for ${p.leave_type} leave.`}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Annual Allocation:</span>
                <span className="font-semibold text-slate-800">{Number(p.total_days_allowed ?? p.total_days ?? 0)} days</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Team Leave Calendar */}
      {activeTab === 'calendar' && (
        <div className="mt-2">
          <LeaveCalendar />
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Apply for Time Off</h2>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{applyModalError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Leave Category
                </label>
                <select
                  value={applyForm.leave_type}
                  onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="PAID">Paid / Annual Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.start_date}
                    onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.end_date}
                    onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Days preview & balance notice */}
              {requestedDays > 0 && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-900">Requested Duration:</span>
                  <span className="font-bold text-indigo-700">{requestedDays} Calendar Day(s)</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Reason for Leave
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Please state the reason for your time off..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Confirmation Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">
              {reviewModal.action === 'APPROVE' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Applicant: <span className="font-semibold text-slate-700">{reviewModal.applicantName}</span>
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Review Comment / Remarks
                </label>
                <textarea
                  rows="3"
                  placeholder="Optional review notes or decision rationale..."
                  value={reviewModal.comment}
                  onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: false, leaveId: null, action: 'APPROVE', comment: '', applicantName: '' })}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 ${
                    reviewModal.action === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Confirm {reviewModal.action === 'APPROVE' ? 'Approval' : 'Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveDashboard;
