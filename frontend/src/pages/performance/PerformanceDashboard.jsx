import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { performanceApi } from '../../api/performanceApi';
import { employeeApi } from '../../api/employeeApi';
import {
  Award,
  Star,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  TrendingUp,
  Target,
  Edit2,
  Trash2,
  User,
  Filter,
  Search,
} from 'lucide-react';

export const PerformanceDashboard = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  // State
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  // Review Modal State (Create & Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [employeesList, setEmployeesList] = useState([]);

  const [formData, setFormData] = useState({
    employee_id: '',
    review_period: 'Q1 2026',
    rating: 4.0,
    feedback: '',
    goals: '',
  });

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [reviewsData, summaryData] = await Promise.all([
        performanceApi.getReviews({
          department: selectedDept || undefined,
          review_period: selectedPeriod || undefined,
        }),
        performanceApi.getSummary({
          department: selectedDept || undefined,
        }),
      ]);

      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setSummary(summaryData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load performance evaluations.');
    } finally {
      setLoading(false);
    }
  };

  // Preload employees for dropdown
  const fetchEmployees = async () => {
    if (!isHrOrAdmin) return;
    try {
      const res = await employeeApi.searchEmployees({ page: 1, page_size: 100 });
      setEmployeesList(res.items || []);
    } catch (err) {
      console.error('Failed to load employees for review modal:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDept, selectedPeriod]);

  useEffect(() => {
    fetchEmployees();
  }, [isHrOrAdmin]);

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!isEditing && !formData.employee_id) {
      setModalError('Please select an employee.');
      return;
    }

    if (formData.rating < 1.0 || formData.rating > 5.0) {
      setModalError('Rating must be between 1.0 and 5.0.');
      return;
    }

    if (!formData.feedback.trim()) {
      setModalError('Please provide qualitative feedback.');
      return;
    }

    try {
      setModalLoading(true);
      if (isEditing) {
        await performanceApi.updateReview(editingId, {
          review_period: formData.review_period,
          rating: Number(formData.rating),
          feedback: formData.feedback,
          goals: formData.goals,
        });
        setSuccessMsg('Performance review updated successfully.');
      } else {
        await performanceApi.createReview({
          employee_id: Number(formData.employee_id),
          review_period: formData.review_period,
          rating: Number(formData.rating),
          feedback: formData.feedback,
          goals: formData.goals,
        });
        setSuccessMsg('Performance review published successfully.');
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to save performance review.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleEdit = (rev) => {
    setIsEditing(true);
    setEditingId(rev.id);
    setFormData({
      employee_id: rev.employee_id,
      review_period: rev.review_period,
      rating: rev.rating,
      feedback: rev.feedback || '',
      goals: rev.goals || '',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete this performance review for ${name}?`)) {
      return;
    }
    try {
      await performanceApi.deleteReview(id);
      setSuccessMsg('Review deleted successfully.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete review.');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      employee_id: '',
      review_period: 'Q1 2026',
      rating: 4.0,
      feedback: '',
      goals: '',
    });
  };

  // Helper for star color badge
  const getRatingBadge = (rating) => {
    if (rating >= 4.5) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (rating >= 3.5) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (rating >= 2.5) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track employee reviews, performance ratings, KPI goals, and talent milestones.
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
          {isHrOrAdmin && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Review</span>
            </button>
          )}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Average Rating
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {summary ? `${summary.average_rating} / 5.0` : '0.0 / 5.0'}
            </div>
          </div>
          <div className="w-11 h-11 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-500">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Reviews
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {summary?.total_reviews || reviews.length}
            </div>
          </div>
          <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Top Performers
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {summary?.top_performers_count || 0}
            </div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Benchmark
            </span>
            <div className="text-sm font-bold text-slate-800 mt-2">1.0 to 5.0 Scale</div>
          </div>
          <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <Target className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Review List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading performance reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <Award className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            No performance evaluations recorded yet.
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Header card info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {rev.employee_code || 'EMP'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{rev.employee_name}</h3>
                      <p className="text-xs text-slate-400">
                        {rev.designation} &bull; {rev.department}
                      </p>
                    </div>
                  </div>

                  {/* Rating badge */}
                  <div
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-extrabold border ${getRatingBadge(
                      rev.rating
                    )}`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{rev.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>

                {/* Review Period & Reviewer Info */}
                <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {rev.review_period}
                  </span>
                  <span>Evaluated by {rev.reviewer_name}</span>
                  <span>&bull;</span>
                  <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>

                {/* Feedback */}
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Feedback & Appraisal
                  </h4>
                  <p className="text-sm text-slate-700 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                    {rev.feedback}
                  </p>
                </div>

                {/* Goals */}
                {rev.goals && (
                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Key Goals & Objectives
                    </h4>
                    <p className="text-xs text-slate-600 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60 leading-relaxed">
                      {rev.goals}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions for HR/Admin */}
              {isHrOrAdmin && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(rev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(rev.id, rev.employee_name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Review Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Performance Review' : 'New Performance Evaluation'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selector (create mode) */}
              {!isEditing && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Employee
                  </label>
                  <select
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Employee...</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code} &bull; {emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Review Period & Rating */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Review Period
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q1 2026"
                    value={formData.review_period}
                    onChange={(e) => setFormData({ ...formData, review_period: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Rating (1.0 to 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    required
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Qualitative Feedback */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Manager Feedback & Observations
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Detail key achievements, strengths, and areas for improvement..."
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Goals */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Development Goals & Targets (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Specific objectives for the upcoming review cycle..."
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {modalLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>{isEditing ? 'Save Changes' : 'Publish Evaluation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
