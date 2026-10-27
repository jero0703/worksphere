import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../../api/notificationApi';
import {
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Calendar,
  AlertCircle,
  RefreshCw,
  CheckCheck,
  X,
  Info,
  Trash2,
  ExternalLink,
  Award,
} from 'lucide-react';

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'SHIFT'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const [listRes, countRes] = await Promise.all([
        notificationApi.getAll(),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(listRes || []);
      setUnreadCount(countRes?.unread_count || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      setActionLoading(true);
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError('Failed to mark notification as read');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setSuccessMsg('All notifications marked as read.');
    } catch (err) {
      setError('Failed to mark all as read');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setSuccessMsg('Notification removed.');
    } catch (err) {
      setError('Failed to delete notification');
    }
  };

  const getNotificationIcon = (title = '', msg = '') => {
    const text = (title + ' ' + msg).toLowerCase();
    if (text.includes('leave')) {
      return <Calendar className="w-5 h-5 text-indigo-600" />;
    }
    if (text.includes('payroll') || text.includes('salary') || text.includes('payslip')) {
      return <CreditCard className="w-5 h-5 text-emerald-600" />;
    }
    if (text.includes('late') || text.includes('attendance') || text.includes('check-in')) {
      return <Clock className="w-5 h-5 text-amber-600" />;
    }
    if (text.includes('shift')) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    }
    if (text.includes('performance') || text.includes('review') || text.includes('rating')) {
      return <Award className="w-5 h-5 text-purple-600" />;
    }
    return <Info className="w-5 h-5 text-indigo-600" />;
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'ATTENDANCE') {
      const text = (n.title + ' ' + n.message).toLowerCase();
      return text.includes('late') || text.includes('attendance') || text.includes('check-in');
    }
    if (filter === 'LEAVE') {
      const text = (n.title + ' ' + n.message).toLowerCase();
      return text.includes('leave');
    }
    if (filter === 'PAYROLL') {
      const text = (n.title + ' ' + n.message).toLowerCase();
      return text.includes('payroll') || text.includes('salary') || text.includes('payslip');
    }
    if (filter === 'SHIFT') {
      const text = (n.title + ' ' + n.message).toLowerCase();
      return text.includes('shift');
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Notification & Smart Alert Center</span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                {unreadCount} New
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time alerts for late arrivals, leave decisions, shift roster updates, and released payslips.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl border border-indigo-200 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all read</span>
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { label: `All (${notifications.length})`, value: 'ALL' },
          { label: `Unread (${unreadCount})`, value: 'UNREAD' },
          { label: 'Late Attendance', value: 'ATTENDANCE' },
          { label: 'Leaves', value: 'LEAVE' },
          { label: 'Payroll', value: 'PAYROLL' },
          { label: 'Shifts', value: 'SHIFT' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              filter === tab.value
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">You're all caught up!</h3>
            <p className="text-xs text-slate-500 mt-1">No alerts match the selected filter.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                notif.is_read
                  ? 'bg-white border-slate-200/80 hover:border-slate-300'
                  : 'bg-indigo-50/40 border-indigo-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    notif.is_read ? 'bg-slate-100 border-slate-200' : 'bg-white border-indigo-200'
                  }`}
                >
                  {getNotificationIcon(notif.title, notif.message)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-bold ${
                        notif.is_read ? 'text-slate-800' : 'text-slate-900'
                      }`}
                    >
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span>{new Date(notif.created_at).toLocaleString()}</span>
                    {notif.link && (
                      <>
                        <span>&bull;</span>
                        <Link
                          to={notif.link}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <span>Open details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!notif.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(notif.id)}
                    disabled={actionLoading}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/60 rounded-lg transition-colors"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(notif.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
