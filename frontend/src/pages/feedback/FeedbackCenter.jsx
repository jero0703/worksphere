import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { feedbackApi } from '../../api/feedbackApi';
import {
  MessageSquareHeart,
  Star,
  Shield,
  Send,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  MessageSquare,
  BarChart2,
  Clock,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  'Work Environment',
  'Leadership & Management',
  'Compensation & Benefits',
  'Culture & Collaboration',
  'Career Growth & Learning',
  'General Suggestions',
];

export const FeedbackCenter = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  const [feedbacks, setFeedbacks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Submit form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Response modal state (HR/Admin)
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseStatus, setResponseStatus] = useState('ACKNOWLEDGED');
  const [hrResponse, setHrResponse] = useState('');
  const [responding, setResponding] = useState(false);

  const fetchFeedbackData = async () => {
    try {
      setLoading(true);
      setError('');
      if (isHrOrAdmin) {
        const [fbList, metricsData] = await Promise.all([
          feedbackApi.list(),
          feedbackApi.getMetrics(),
        ]);
        setFeedbacks(fbList);
        setMetrics(metricsData);
      } else {
        const fbList = await feedbackApi.list();
        setFeedbacks(fbList);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackData();
  }, [isHrOrAdmin]);

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await feedbackApi.submit({
        rating,
        category,
        message: message.trim(),
        is_anonymous: isAnonymous,
      });
      setSuccessMsg('Your feedback has been submitted successfully. Thank you for helping us improve!');
      setMessage('');
      setRating(5);
      setIsAnonymous(false);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchFeedbackData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    try {
      setResponding(true);
      setError('');
      await feedbackApi.updateStatus(selectedFeedback.id, {
        status: responseStatus,
        hr_response: hrResponse.trim() || null,
      });
      setSuccessMsg('Feedback response recorded.');
      setSelectedFeedback(null);
      setHrResponse('');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchFeedbackData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save feedback response');
    } finally {
      setResponding(false);
    }
  };

  const renderStars = (count, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((starVal) => {
          const filled = interactive
            ? starVal <= (hoverRating || rating)
            : starVal <= count;
          return (
            <button
              type={interactive ? 'button' : undefined}
              key={starVal}
              disabled={!interactive}
              onMouseEnter={() => interactive && setHoverRating(starVal)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              onClick={() => interactive && setRating(starVal)}
              className={interactive ? 'cursor-pointer p-0.5 transition-transform hover:scale-110' : 'cursor-default'}
            >
              <Star
                className={`h-5 w-5 ${
                  filled ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquareHeart className="h-7 w-7 text-indigo-600" />
            Employee Feedback & Pulse
          </h1>
          <p className="text-sm text-gray-500">
            {isHrOrAdmin
              ? 'Review employee sentiment, feedback trends, and respond to suggestions.'
              : 'Share your thoughts, suggestions, and workplace experience with HR.'}
          </p>
        </div>

        <button
          onClick={fetchFeedbackData}
          className="self-start sm:self-center p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
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

      {/* HR Analytics Banner */}
      {isHrOrAdmin && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Star className="h-6 w-6 fill-amber-400" />
            </div>
            <div>
              <span className="block text-2xl font-black text-gray-900">{metrics.average_rating} / 5.0</span>
              <span className="text-xs text-gray-500">Average Sentiment Rating</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-gray-900">{metrics.total_feedbacks}</span>
              <span className="text-xs text-gray-500">Total Feedback Submissions</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm col-span-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Rating Distribution</h4>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[5, 4, 3, 2, 1].map((r) => (
                <div key={r} className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <span className="block text-xs font-semibold text-gray-700">{r} ★</span>
                  <span className="block text-sm font-bold text-indigo-600">
                    {metrics.rating_breakdown[r] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Employee Submit Form */}
      {!isHrOrAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Share Your Feedback</h2>
          </div>

          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-3">
                  {renderStars(rating, true)}
                  <span className="text-sm font-semibold text-gray-700">{rating} of 5 stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Your Thoughts or Suggestions *
              </label>
              <textarea
                required
                rows="4"
                placeholder="What is working well? What could be improved in the workplace?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <Shield className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">Submit anonymously</span>
                <span className="text-xs text-gray-400">(Your name and identity will not be visible to HR)</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feedbacks Stream / List */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">
          {isHrOrAdmin ? 'All Feedback Submissions' : 'My Previous Submissions'}
        </h3>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading feedback records...
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
            <MessageSquareHeart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-semibold text-gray-700">No Feedback Submitted Yet</h3>
            <p className="text-sm mt-1">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    {renderStars(fb.rating)}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {fb.category}
                    </span>
                    {fb.is_anonymous && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Shield className="h-3 w-3" /> Anonymous
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{fb.submitter_display}</span>
                    <span>•</span>
                    <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        fb.status === 'ACKNOWLEDGED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : fb.status === 'REVIEWED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {fb.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                  {fb.message}
                </p>

                {fb.hr_response && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                      HR Acknowledgment & Response:
                    </div>
                    <p className="italic text-gray-700">{fb.hr_response}</p>
                  </div>
                )}

                {isHrOrAdmin && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setSelectedFeedback(fb);
                        setResponseStatus(fb.status === 'NEW' ? 'ACKNOWLEDGED' : fb.status);
                        setHrResponse(fb.hr_response || '');
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {fb.hr_response ? 'Edit Response' : 'Respond / Acknowledge'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal (HR/Admin) */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                Respond to Feedback ({selectedFeedback.category})
              </h2>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>{renderStars(selectedFeedback.rating)}</div>
                <span className="text-xs text-gray-500 font-medium">
                  {selectedFeedback.submitter_display}
                </span>
              </div>
              <p className="italic text-gray-800 bg-white p-3 rounded border border-gray-100">
                "{selectedFeedback.message}"
              </p>
            </div>

            <form onSubmit={handleRespond} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Status *
                </label>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="NEW">New</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="ACKNOWLEDGED">Acknowledged & Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  HR Response / Action Taken
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter remarks or steps taken to address this feedback..."
                  value={hrResponse}
                  onChange={(e) => setHrResponse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={responding}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {responding ? 'Saving...' : 'Save Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackCenter;
