import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyticsApi } from '../../api/analyticsApi';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Clock,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  X,
  PieChart,
  Briefcase,
  Layers,
} from 'lucide-react';

export const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [days, setDays] = useState(30);
  const [selectedDept, setSelectedDept] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await analyticsApi.getDashboard({
        days,
        department: selectedDept || undefined,
      });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load executive HR analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days, selectedDept]);

  const handleExport = async (type) => {
    try {
      setExportLoading(true);
      if (type === 'attendance') {
        await analyticsApi.exportAttendanceCsv({ department: selectedDept || undefined });
      } else if (type === 'leaves') {
        await analyticsApi.exportLeavesCsv({ department: selectedDept || undefined });
      } else if (type === 'payroll') {
        await analyticsApi.exportPayrollCsv();
      }
      setSuccessMsg(`Successfully generated and downloaded ${type} report.`);
    } catch (err) {
      setError(`Failed to export ${type} report: ` + (err.message || 'Error'));
    } finally {
      setExportLoading(false);
    }
  };

  const summary = data?.summary || {};
  const attendanceTrends = data?.attendance_trends || [];
  const deptMetrics = data?.department_metrics || [];
  const leaveDist = data?.leave_distribution || [];
  const perfDist = data?.performance_distribution || {};

  // Find max value in attendance trends for relative bar height
  const maxAtt = Math.max(1, ...attendanceTrends.map((t) => t.present + t.late + t.absent));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Advanced Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Executive insights into workforce attendance, leave utilization, talent appraisals, and payroll.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Quick Exports dropdown / buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('attendance')}
              disabled={exportLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Attendance CSV</span>
            </button>
            <button
              onClick={() => handleExport('leaves')}
              disabled={exportLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Leaves CSV</span>
            </button>
            <button
              onClick={() => handleExport('payroll')}
              disabled={exportLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Payroll CSV</span>
            </button>
          </div>
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

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Timeframe:</span>
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                days === d
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Last {d} Days
            </button>
          ))}
        </div>

        {deptMetrics.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Departments</option>
              {deptMetrics.map((dm) => (
                <option key={dm.department} value={dm.department}>
                  {dm.department}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Workforce
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {summary.active_employees || 0}{' '}
            <span className="text-xs font-semibold text-slate-400">/ {summary.total_employees || 0}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Active staff members</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Attendance Health
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {summary.attendance_rate || 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">On-time attendance rate</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Overtime Logged
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {summary.total_overtime_hours || 0} hrs
          </div>
          <div className="text-xs text-slate-500 mt-1">Overtime within timeframe</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Talent Performance
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {summary.average_performance ? `${summary.average_performance} / 5.0` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Company-wide rating average</div>
        </div>
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Attendance & Late Trends</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily presence and punctuality trends over the selected period
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Present
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Late
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Absent
                </span>
              </div>
            </div>

            {/* Visual Bar representation */}
            <div className="h-48 flex items-end gap-1.5 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
              {attendanceTrends.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  No attendance records logged in this timeframe
                </div>
              ) : (
                attendanceTrends.map((t) => {
                  const presentH = (t.present / maxAtt) * 100;
                  const lateH = (t.late / maxAtt) * 100;
                  const absentH = (t.absent / maxAtt) * 100;
                  return (
                    <div
                      key={t.date}
                      className="flex-1 min-w-[12px] flex flex-col justify-end items-center h-full group relative"
                    >
                      <div className="w-full flex flex-col gap-0.5 items-center">
                        {t.late > 0 && (
                          <div
                            style={{ height: `${Math.max(4, lateH)}px` }}
                            className="w-full bg-amber-400 rounded-t-sm"
                            title={`Late: ${t.late}`}
                          />
                        )}
                        {t.present > 0 && (
                          <div
                            style={{ height: `${Math.max(4, presentH)}px` }}
                            className="w-full bg-emerald-500"
                            title={`Present: ${t.present}`}
                          />
                        )}
                        {t.absent > 0 && (
                          <div
                            style={{ height: `${Math.max(4, absentH)}px` }}
                            className="w-full bg-rose-400 rounded-b-sm"
                            title={`Absent: ${t.absent}`}
                          />
                        )}
                      </div>
                      {/* Tooltip on hover */}
                      <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-10">
                        {t.date}: {t.present} Pres, {t.late} Late, {t.absent} Abs
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{attendanceTrends[0]?.date || 'Start'}</span>
            <span>{attendanceTrends[attendanceTrends.length - 1]?.date || 'Today'}</span>
          </div>
        </div>

        {/* Department Workforce & Budget Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>Department Workforce Distribution</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Headcount and salary allocation by department</p>
            </div>
          </div>

          <div className="space-y-3.5 mt-2">
            {deptMetrics.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No departments found.</div>
            ) : (
              deptMetrics.map((dm) => {
                const totalSalarySum = deptMetrics.reduce((a, b) => a + b.total_salary, 0);
                const pct = totalSalarySum > 0 ? Math.round((dm.total_salary / totalSalarySum) * 100) : 0;
                return (
                  <div key={dm.department} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{dm.department}</span>
                      <span className="text-slate-500 font-semibold">
                        {dm.headcount} employee(s) &bull; Avg ${dm.average_salary.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Leave Requests by Type */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>Leave Usage Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Time-off requested by leave category</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {leaveDist.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No leave requests logged.</div>
            ) : (
              leaveDist.map((item) => {
                const totalLeaves = leaveDist.reduce((a, b) => a + b.count, 0);
                const pct = totalLeaves > 0 ? Math.round((item.count / totalLeaves) * 100) : 0;
                return (
                  <div key={item.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-indigo-500" />
                      <span className="font-bold text-slate-700">{item.type} Leave</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">{item.count} requests</span>
                      <span className="text-slate-400 font-mono w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Performance Rating Curve</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Talent distribution across rating tiers</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {[
              { label: '5 Stars (4.5 - 5.0) - Outstanding', key: '5_star', color: 'bg-emerald-500' },
              { label: '4 Stars (3.5 - 4.4) - Exceeds Expectations', key: '4_star', color: 'bg-blue-500' },
              { label: '3 Stars (2.5 - 3.4) - Meets Expectations', key: '3_star', color: 'bg-indigo-500' },
              { label: '2 Stars (1.5 - 2.4) - Needs Improvement', key: '2_star', color: 'bg-amber-500' },
              { label: '1 Star (1.0 - 1.4) - Unsatisfactory', key: '1_star', color: 'bg-rose-500' },
            ].map((tier) => {
              const count = perfDist[tier.key] || 0;
              const totalPerfs = Object.values(perfDist).reduce((a, b) => a + b, 0);
              const pct = totalPerfs > 0 ? Math.round((count / totalPerfs) * 100) : 0;
              return (
                <div key={tier.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{tier.label}</span>
                    <span className="font-bold text-slate-900">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${tier.color} rounded-full transition-all`}
                      style={{ width: `${Math.max(count > 0 ? 5 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
