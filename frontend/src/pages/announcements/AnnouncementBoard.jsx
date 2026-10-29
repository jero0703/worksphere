import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { announcementApi } from '../../api/announcementApi';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Flame,
  Info,
} from 'lucide-react';

const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'HIGH', label: 'High', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export const AnnouncementBoard = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'MEDIUM',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const data = await announcementApi.list(params);
      setAnnouncements(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAnnouncements();
  };

  const handleOpenCreateModal = () => {
    setEditingAnn(null);
    setFormData({
      title: '',
      message: '',
      priority: 'MEDIUM',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (ann) => {
    setEditingAnn(ann);
    setFormData({
      title: ann.title,
      message: ann.message,
      priority: ann.priority,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      if (editingAnn) {
        await announcementApi.update(editingAnn.id, formData);
        setSuccessMsg('Announcement updated successfully.');
      } else {
        await announcementApi.create(formData);
        setSuccessMsg('Announcement posted to company bulletin.');
      }
      setShowModal(false);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementApi.delete(id);
      setSuccessMsg('Announcement deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete announcement');
    }
  };

  const getPriorityBadge = (priority) => {
    const config = PRIORITIES.find((p) => p.value === priority) || PRIORITIES[2];
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${config.color}`}>
        {priority === 'URGENT' && <Flame className="h-3 w-3 fill-red-600 text-red-600 animate-pulse" />}
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-indigo-600" />
            Company Announcements
          </h1>
          <p className="text-sm text-gray-500">
            Internal communication board, updates, notices, and townhall information.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnnouncements}
            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {isHrOrAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Announcement
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        {/* Priority Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setPriorityFilter('')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              priorityFilter === '' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All
          </button>
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPriorityFilter(p.value)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                priorityFilter === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Stream */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <Megaphone className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-700">No Announcements Found</h3>
          <p className="text-sm mt-1">There are no announcements currently published matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`bg-white rounded-xl border p-6 transition-all shadow-sm hover:shadow-md ${
                ann.priority === 'URGENT'
                  ? 'border-red-200 bg-red-50/20'
                  : ann.priority === 'HIGH'
                  ? 'border-amber-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(ann.priority)}
                    <h2 className="text-lg font-bold text-gray-900">{ann.title}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-medium text-gray-700">
                      <User className="h-3.5 w-3.5" />
                      {ann.author_name} ({ann.author_role || 'Staff'})
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(ann.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {isHrOrAdmin && (
                  <div className="flex items-center gap-1.5 self-end sm:self-start">
                    <button
                      onClick={() => handleOpenEditModal(ann)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed pt-2 border-t border-gray-100">
                {ann.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingAnn ? 'Edit Announcement' : 'Post New Announcement'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Company Offsite & Schedule"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Priority Level *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOW">Low - General Information</option>
                  <option value="MEDIUM">Medium - Standard Notice</option>
                  <option value="HIGH">High - Important Update</option>
                  <option value="URGENT">Urgent - Critical / Broadcast Notification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Message Content *
                </label>
                <textarea
                  required
                  rows="5"
                  placeholder="Type the full announcement message..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : editingAnn ? 'Save Changes' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementBoard;
