import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveApi } from '../../api/leaveApi';
import { integrationApi } from '../../api/integrationApi';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
  UserCheck,
  UserX,
  Shield,
  Eye,
  Info,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

export const LeaveCalendar = () => {
  const { user, hasRole } = useAuth();
  const isHrOrAdmin = hasRole(['HR', 'ADMIN']);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({
    events: [],
    conflicts: [],
    total_active_employees: 0,
    on_leave_today: 0,
    available_today: 0,
    department_summary: {},
  });
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const loadCalendar = async () => {
    try {
      setLoading(true);
      // Interval covering previous week of month and next week
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const start_date = new Date(firstDay.getTime() - 7 * 86400000).toISOString().split('T')[0];
      const end_date = new Date(lastDay.getTime() + 7 * 86400000).toISOString().split('T')[0];

      const data = await leaveApi.getCalendar({
        start_date,
        end_date,
        department: selectedDept || undefined,
      });
      setCalendarData(data);
    } catch (err) {
      console.error('Failed to load team calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [year, month, selectedDept]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build grid days
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Padding days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    calendarDays.push({
      dateStr: d.toISOString().split('T')[0],
      dayNum: prevMonthDays - i,
      isCurrentMonth: false,
    });
  }

  // Days in current month
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    calendarDays.push({
      dateStr: d.toISOString().split('T')[0],
      dayNum: day,
      isCurrentMonth: true,
      isToday: d.toDateString() === new Date().toDateString(),
    });
  }

  // Next month padding to make full 5 or 6 weeks (multiple of 7)
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      calendarDays.push({
        dateStr: d.toISOString().split('T')[0],
        dayNum: i,
        isCurrentMonth: false,
      });
    }
  }

  const getEventsForDate = (dateStr) => {
    return calendarData.events.filter((e) => {
      return dateStr >= e.start_date && dateStr <= e.end_date;
    });
  };

  const getLeaveTypeStyle = (type) => {
    switch (type) {
      case 'SICK':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CASUAL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Leave Calendar</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module 15
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time organizational leave schedule, team availability, and overlap conflict detection.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="HR">HR</option>
            <option value="Design">Design</option>
            <option value="Executive">Executive</option>
            <option value="Operations">Operations</option>
          </select>

          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module 25: Calendar & Leaves Exports */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => integrationApi.downloadIcsCalendar(user?.employee?.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors"
              title="Export iCalendar (.ics) for Google Calendar, Outlook, Apple Calendar"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .ics</span>
            </button>
            {isHrOrAdmin && (
              <button
                onClick={() => integrationApi.downloadLeavesCsv({ department: selectedDept || undefined })}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
                title="Export Leave Report as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards: Team Availability Today */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-500">Active Workforce</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{calendarData.total_active_employees}</p>
          <span className="text-xs text-slate-400">Total active team members</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-emerald-600">Available Today</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{calendarData.available_today}</p>
          <span className="text-xs text-emerald-600">On duty & scheduled</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-rose-600">On Leave Today</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{calendarData.on_leave_today}</p>
          <span className="text-xs text-rose-600">Approved leaves active</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-amber-600">Overlap Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{calendarData.conflicts.length}</p>
          <span className="text-xs text-amber-600">Department peer overlaps</span>
        </div>
      </div>

      {/* Conflict Alert Banner if any */}
      {calendarData.conflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block">Department Leave Conflict Alert</span>
            <p className="text-amber-800 mt-0.5">
              Multiple team members in the same department have approved leaves on overlapping dates.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {calendarData.conflicts.slice(0, 4).map((c, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 font-medium"
                >
                  {c.department}: {c.overlapping_count} members on {c.conflict_date} (
                  {c.employees.map((e) => e.name).join(', ')})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Calendar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Calendar Month Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {monthNames[month]} {year}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Sick
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Casual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Paid
            </span>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center py-2.5 text-xs font-semibold text-slate-500">
          {weekDayNames.map((w, idx) => (
            <div key={idx} className={idx === 0 || idx === 6 ? 'text-rose-500' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[500px]">
          {calendarDays.map((item, idx) => {
            const dateEvents = getEventsForDate(item.dateStr);
            const isWeekend = idx % 7 === 0 || idx % 7 === 6;

            return (
              <div
                key={idx}
                className={`p-2 min-h-[105px] flex flex-col justify-between transition-colors ${
                  !item.isCurrentMonth
                    ? 'bg-slate-50/40 text-slate-300'
                    : isWeekend
                    ? 'bg-slate-50/20 text-slate-700'
                    : 'bg-white text-slate-800'
                } ${item.isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      item.isToday
                        ? 'bg-indigo-600 text-white'
                        : item.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.dayNum}
                  </span>
                  {dateEvents.length > 0 && item.isCurrentMonth && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      {dateEvents.length} away
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                  {dateEvents.slice(0, 3).map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`w-full text-left px-2 py-0.5 rounded text-[11px] font-medium border truncate block transition-transform hover:scale-[1.02] ${getLeaveTypeStyle(
                        ev.leave_type
                      )}`}
                      title={`${ev.employee_name} (${ev.department}) - ${ev.leave_type}`}
                    >
                      {ev.employee_name.split(' ')[0]} ({ev.leave_type[0]})
                    </button>
                  ))}
                  {dateEvents.length > 3 && (
                    <button
                      onClick={() => setSelectedEvent(dateEvents[0])}
                      className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 block pl-1"
                    >
                      +{dateEvents.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: View Leave Details */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-semibold text-indigo-600 tracking-wider">
                  Leave Record Detail
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedEvent.employee_name}</h3>
                <span className="text-xs text-slate-500">
                  {selectedEvent.employee_code} &bull; {selectedEvent.department}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLeaveTypeStyle(
                  selectedEvent.leave_type
                )}`}
              >
                {selectedEvent.leave_type} LEAVE
              </span>
            </div>

            <div className="mt-5 space-y-3 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-bold text-slate-800">
                  {selectedEvent.start_date} to {selectedEvent.end_date} ({selectedEvent.days_count} business days)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedEvent.status}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Stated Reason:</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 italic">
                  {selectedEvent.reason}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveCalendar;
