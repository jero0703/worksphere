import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { profileApi } from '../../api/profileApi';
import { integrationApi } from '../../api/integrationApi';
import { applyTheme } from '../../utils/theme';
import {
  UserCog,
  User,
  Shield,
  KeyRound,
  Bell,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  FileSpreadsheet,
  Palette,
  Phone,
  MapPin,
  HeartHandshake,
  Briefcase,
  Building,
  RefreshCw,
} from 'lucide-react';

export const ProfileSettings = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Contact Form
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Settings
  const [settings, setSettings] = useState({
    email_notifications: true,
    in_app_notifications: true,
    task_reminders: true,
    announcement_alerts: true,
    theme: 'light',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Google Calendar Status
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [downloading, setDownloading] = useState('');

  const handleDownload = async (type, downloadFn, label) => {
    try {
      setDownloading(type);
      setError('');
      await downloadFn();
      setSuccessMsg(`${label} downloaded successfully.`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(`Failed to download ${label.toLowerCase()}: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDownloading('');
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError('');
      const [profileData, calStatus] = await Promise.all([
        profileApi.getProfile(),
        integrationApi.getGoogleCalendarStatus().catch(() => null),
      ]);

      setProfile(profileData);
      setPhone(profileData.phone || '');
      setAddress(profileData.address || '');
      setEmergencyContact(profileData.emergency_contact || '');
      if (profileData.settings) {
        setSettings(profileData.settings);
        if (profileData.settings.theme) {
          applyTheme(profileData.settings.theme);
        }
      }
      setCalendarStatus(calStatus);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    try {
      setSavingContact(true);
      setError('');
      await profileApi.updateProfile({
        phone: phone.trim() || null,
        address: address.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
      });
      setSuccessMsg('Contact information updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchProfileData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update contact info');
    } finally {
      setSavingContact(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setSavingPassword(true);
      setError('');
      await profileApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccessMsg('Your account password was successfully changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleSetting = async (key) => {
    try {
      const updated = { ...settings, [key]: !settings[key] };
      setSettings(updated);
      await profileApi.updateSettings({ [key]: updated[key] });
      setSuccessMsg('Preferences saved.');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      setError('Failed to update setting');
    }
  };

  const handleThemeChange = async (newTheme) => {
    try {
      applyTheme(newTheme);
      setSettings((prev) => ({ ...prev, theme: newTheme }));
      await profileApi.updateSettings({ theme: newTheme });
      setSuccessMsg(`Theme switched to ${newTheme} mode.`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setError('Failed to update theme preference');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
        Loading account settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserCog className="h-7 w-7 text-indigo-600" />
          Profile & Settings Management
        </h1>
        <p className="text-sm text-gray-500">
          Manage your personal details, credentials, notification preferences, and export records.
        </p>
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

      {/* Profile Overview Pill */}
      {profile && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-xl flex items-center justify-center shadow-md">
              {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile.full_name || profile.username}</h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                  {profile.role}
                </span>
                {profile.employee_code && (
                  <span className="px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                    {profile.employee_code}
                  </span>
                )}
                {profile.department && (
                  <span className="px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                    {profile.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-xs text-gray-600">
            <div>
              <span className="text-gray-400 block">Designation</span>
              <strong className="text-gray-800 text-sm">{profile.designation || 'Staff'}</strong>
            </div>
            <div>
              <span className="text-gray-400 block">Joining Date</span>
              <strong className="text-gray-800 text-sm">{profile.joining_date || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-gray-400 block">Account Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Base Compensation</span>
              <strong className="text-gray-800 text-sm">
                {profile.salary ? `$${Number(profile.salary).toLocaleString()}` : 'Confidential'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-8">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <User className="h-4 w-4" />
          Contact Details
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-4 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Shield className="h-4 w-4" />
          Security & Password
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-4 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'preferences'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Bell className="h-4 w-4" />
          Preferences & Theme
        </button>

        <button
          onClick={() => setActiveTab('exports')}
          className={`pb-4 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'exports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Download className="h-4 w-4" />
          Data Exports & Calendar
        </button>
      </div>

      {/* Tab 1: Contact Details */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
            <p className="text-xs text-gray-500">
              Update your personal contact details, residential address, and designated emergency contact.
            </p>
          </div>

          <form onSubmit={handleUpdateContact} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="+1 (555) 012-3456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Address / Residence
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Street address, City, State, ZIP"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Emergency Contact Person & Phone
              </label>
              <div className="relative">
                <HeartHandshake className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. John Doe (Spouse) - +1 555-0199"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingContact}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingContact ? 'Saving...' : 'Save Contact Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
            <p className="text-xs text-gray-500">
              Ensure your account stays secure by using a strong password of at least 6 characters.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Current Password *
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                New Password *
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Preferences & Theme */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Notification Preferences</h3>
            <p className="text-xs text-gray-500">
              Customize which notifications and alerts you receive across channels.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <strong className="block text-sm text-gray-900">Email Notifications</strong>
                <span className="text-xs text-gray-500">Receive email alerts for task assignments, approvals, and announcements.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('email_notifications')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.email_notifications ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.email_notifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <strong className="block text-sm text-gray-900">In-App Notifications</strong>
                <span className="text-xs text-gray-500">Display notifications in the bell center and app header.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('in_app_notifications')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.in_app_notifications ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.in_app_notifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <strong className="block text-sm text-gray-900">Task Reminders</strong>
                <span className="text-xs text-gray-500">Receive reminders for upcoming and overdue internal tasks.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('task_reminders')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.task_reminders ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.task_reminders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <strong className="block text-sm text-gray-900">Announcement Alerts</strong>
                <span className="text-xs text-gray-500">Notify immediately when high priority announcements are published.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting('announcement_alerts')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.announcement_alerts ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.announcement_alerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Palette className="h-4 w-4 text-indigo-600" />
              Interface Theme
            </h4>
            <div className="flex items-center gap-3">
              {['light', 'dark', 'system'].map((th) => (
                <button
                  key={th}
                  onClick={() => handleThemeChange(th)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                    settings.theme === th
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {th}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Data Exports & Calendar */}
      {activeTab === 'exports' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Data Exports & Calendar Feeds</h3>
            <p className="text-xs text-gray-500">
              Download sanitized reports in CSV format or synchronize your schedule with external calendar apps.
            </p>
          </div>

          {/* Calendar Sync Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-indigo-950 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                iCalendar (.ics) Schedule Feed
              </h4>
              <p className="text-xs text-indigo-800">
                Sync your assigned shifts and approved leaves into Google Calendar, Outlook, or Apple Calendar.
              </p>
              {calendarStatus && (
                <div className="text-[11px] text-indigo-700 mt-1">
                  OAuth Integration Status:{' '}
                  <strong>{calendarStatus.configured ? 'Configured' : 'Local ICS Direct Export'}</strong>
                </div>
              )}
            </div>

            <button
              disabled={downloading === 'ics'}
              onClick={() => handleDownload('ics', () => integrationApi.downloadIcsCalendar(profile?.id), 'iCalendar (.ics) Schedule')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className={`h-4 w-4 ${downloading === 'ics' ? 'animate-bounce' : ''}`} />
              {downloading === 'ics' ? 'Exporting...' : 'Download .ics Calendar'}
            </button>
          </div>

          {/* Sanitized CSV Exports */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export Records as Sanitized CSV
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div>
                  <strong className="block text-sm text-gray-900">Attendance Log</strong>
                  <span className="text-xs text-gray-500">Export daily check-ins, check-outs, and work hours.</span>
                </div>
                <button
                  disabled={downloading === 'attendance'}
                  onClick={() => handleDownload('attendance', () => integrationApi.downloadAttendanceCsv(), 'Attendance Log')}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Download className={`h-3.5 w-3.5 text-emerald-600 ${downloading === 'attendance' ? 'animate-bounce' : ''}`} />
                  {downloading === 'attendance' ? 'Generating CSV...' : 'Download Attendance CSV'}
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div>
                  <strong className="block text-sm text-gray-900">Payroll Records</strong>
                  <span className="text-xs text-gray-500">Export monthly salary computations and payslip records.</span>
                </div>
                <button
                  disabled={downloading === 'payroll'}
                  onClick={() => handleDownload('payroll', () => integrationApi.downloadPayrollCsv(), 'Payroll Records')}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Download className={`h-3.5 w-3.5 text-emerald-600 ${downloading === 'payroll' ? 'animate-bounce' : ''}`} />
                  {downloading === 'payroll' ? 'Generating CSV...' : 'Download Payroll CSV'}
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div>
                  <strong className="block text-sm text-gray-900">Leave History</strong>
                  <span className="text-xs text-gray-500">Export applied leaves, approval status, and dates.</span>
                </div>
                <button
                  disabled={downloading === 'leaves'}
                  onClick={() => handleDownload('leaves', () => integrationApi.downloadLeavesCsv(), 'Leave History')}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Download className={`h-3.5 w-3.5 text-emerald-600 ${downloading === 'leaves' ? 'animate-bounce' : ''}`} />
                  {downloading === 'leaves' ? 'Generating CSV...' : 'Download Leaves CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
