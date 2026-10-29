import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { resignationApi } from '../../api/resignationApi';
import {
  LogOut,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  User,
  MessageSquare,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';

export const ResignationCenter = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  const [resignations, setResignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Submit modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [reason, setReason] = useState('');
  const [noticePeriod, setNoticePeriod] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  // Review modal (HR/Admin)
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchResignations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await resignationApi.list();
      setResignations(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load resignation requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResignations();
  }, []);

  const handleSubmitResignation = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await resignationApi.submit({
        reason: reason.trim(),
        notice_period: parseInt(noticePeriod, 10),
      });
      setSuccessMsg('Resignation request submitted successfully for HR review.');
      setShowSubmitModal(false);
      setReason('');
      setNoticePeriod(30);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchResignations();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit resignation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!selectedResignation) return;
    try {
      setReviewing(true);
      setError('');
      await resignationApi.review(selectedResignation.id, {
        status: reviewStatus,
        review_comment: reviewComment.trim() || null,
      });
      setSuccessMsg(`Resignation request has been marked as ${reviewStatus.toLowerCase()}.`);
      setSelectedResignation(null);
      setReviewComment('');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchResignations();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to review resignation');
    } finally {
      setReviewing(false);
    }
  };

  const calculateLastDay = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(days || 0, 10));
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle className="h-3.5 w-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="h-3.5 w-3.5" /> Under Review
          </span>
        );
    }
  };

  const hasPending = resignations.some((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LogOut className="h-7 w-7 text-rose-600" />
            Resignation & Exit Management
          </h1>
          <p className="text-sm text-gray-500">
            {isHrOrAdmin
              ? 'Review employee resignation requests, track notice periods, and manage exits.'
              : 'Submit formal resignation requests and monitor review status.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResignations}
            className="p-2 text-gray-600 hover:text-rose-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {!isHrOrAdmin && (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={hasPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {hasPending ? 'Request Under Review' : 'Submit Resignation'}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Notice Banner */}
      <div className="bg-gradient-to-r from-rose-50 to-amber-50 rounded-xl p-5 border border-rose-100 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-700 space-y-1">
          <h4 className="font-semibold text-gray-900">WorkSphere Exit Policy</h4>
          <p>
            Standard notice period is 30 to 90 days. Approving a resignation does not automatically deactivate the employee account, allowing normal system access throughout the handover period until final separation.
          </p>
        </div>
      </div>

      {/* Resignations Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-rose-500" />
          Loading requests...
        </div>
      ) : resignations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <FileCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-700">No Resignation Requests</h3>
          <p className="text-sm mt-1">There are no active or past resignation records to display.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-700 border-b border-gray-100">
                <tr>
                  {isHrOrAdmin && <th className="px-6 py-4">Employee</th>}
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Notice Period</th>
                  <th className="px-6 py-4">Expected Last Day</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Remarks</th>
                  {isHrOrAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resignations.map((resig) => (
                  <tr key={resig.id} className="hover:bg-gray-50/50 transition-colors">
                    {isHrOrAdmin && (
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{resig.employee_name || 'N/A'}</div>
                        <div className="text-xs text-gray-400">
                          {resig.employee_code} • {resig.department}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 max-w-xs truncate" title={resig.reason}>
                      {resig.reason}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {resig.notice_period} days
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {resig.expected_last_working_day || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(resig.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(resig.status)}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={resig.review_comment}>
                      {resig.review_comment || '—'}
                    </td>
                    {isHrOrAdmin && (
                      <td className="px-6 py-4 text-right">
                        {resig.status === 'PENDING' ? (
                          <button
                            onClick={() => {
                              setSelectedResignation(resig);
                              setReviewStatus('APPROVED');
                              setReviewComment('');
                            }}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Resignation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <LogOut className="h-5 w-5 text-rose-600" />
                Submit Resignation Request
              </h2>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResignation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Notice Period (Days) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expected last working day: <strong className="text-gray-800">{calculateLastDay(noticePeriod)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Reason for Resignation *
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Please state your reasons for leaving and any transition details..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal (HR/Admin) */}
      {selectedResignation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                Review Resignation: {selectedResignation.employee_name}
              </h2>
              <button
                onClick={() => setSelectedResignation(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-700 border border-gray-200">
              <div>
                <strong>Notice Period:</strong> {selectedResignation.notice_period} days
              </div>
              <div>
                <strong>Expected Last Working Day:</strong>{' '}
                {selectedResignation.expected_last_working_day || 'N/A'}
              </div>
              <div>
                <strong>Submitted Reason:</strong>
                <p className="mt-1 text-gray-600 italic bg-white p-2.5 rounded border border-gray-100">
                  "{selectedResignation.reason}"
                </p>
              </div>
            </div>

            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                  Decision *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('APPROVED')}
                    className={`py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-all ${
                      reviewStatus === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Resignation
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('REJECTED')}
                    className={`py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-all ${
                      reviewStatus === 'REJECTED'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Resignation
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  HR Review Comments & Transition Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide remarks or instructions for the handover process..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedResignation(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {reviewing ? 'Saving...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResignationCenter;
