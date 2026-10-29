import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { payrollApi } from '../../api/payrollApi';
import { integrationApi } from '../../api/integrationApi';
import {
  CreditCard,
  Download,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calendar,
  FileText,
  X,
  TrendingUp,
  Building,
  Check,
  FileSpreadsheet,
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

export const PayrollDashboard = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  // Current year-month string "YYYY-MM"
  const getCurrentMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [activeTab, setActiveTab] = useState(isHrOrAdmin ? 'all-payroll' : 'my-payroll');
  const [myPayrolls, setMyPayrolls] = useState([]);
  const [allPayrolls, setAllPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Generate Payroll Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateModalError, setGenerateModalError] = useState('');
  const [generateForm, setGenerateForm] = useState({
    employee_id: '',
    month: getCurrentMonth(),
    basic_salary: '',
    allowances: 0,
    bonus: 0,
    deductions: 0,
    payment_method: 'Direct Deposit',
    notes: '',
  });

  // Switch default tab when user role is ready
  useEffect(() => {
    if (isHrOrAdmin) {
      setActiveTab('all-payroll');
    } else {
      setActiveTab('my-payroll');
    }
  }, [isHrOrAdmin]);

  // Fetch Payroll Data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const myRes = await payrollApi.getMyPayroll();
      setMyPayrolls(Array.isArray(myRes) ? myRes : []);

      if (isHrOrAdmin) {
        const [allRes, sumRes, eligibleEmps] = await Promise.all([
          payrollApi.getAll({ month: selectedMonth }),
          payrollApi.getSummary(selectedMonth),
          payrollApi.getEligibleEmployees(),
        ]);
        setAllPayrolls(Array.isArray(allRes) ? allRes : []);
        setSummary(sumRes || null);
        setEmployees(Array.isArray(eligibleEmps) ? eligibleEmps : []);
      }
    } catch (err) {
      setError(formatError(err, 'Failed to load payroll information'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isHrOrAdmin, selectedMonth]);

  // Handle Employee Selection in Modal to auto-fill basic salary
  const handleEmployeeChange = (empId) => {
    const emp = employees.find((e) => e.id === Number(empId));
    setGenerateForm({
      ...generateForm,
      employee_id: empId,
      basic_salary: emp?.salary ? String(emp.salary) : '',
    });
  };

  // Calculate dynamic Net Salary for Generate Modal
  const calculatedNetSalary = () => {
    const basic = parseFloat(generateForm.basic_salary) || 0;
    const allowances = parseFloat(generateForm.allowances) || 0;
    const bonus = parseFloat(generateForm.bonus) || 0;
    const deductions = parseFloat(generateForm.deductions) || 0;
    return Math.max(0, basic + allowances + bonus - deductions).toFixed(2);
  };

  // Submit Generate Payroll
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setGenerateModalError('');

    if (!generateForm.employee_id) {
      setGenerateModalError('Please select an employee.');
      return;
    }

    if (!generateForm.month) {
      setGenerateModalError('Please specify the payroll month (YYYY-MM).');
      return;
    }

    const basicSalary = parseFloat(generateForm.basic_salary);
    if (isNaN(basicSalary) || basicSalary < 0) {
      setGenerateModalError('Please enter a valid basic salary amount (>= 0).');
      return;
    }

    const allowances = parseFloat(generateForm.allowances) || 0;
    const bonus = parseFloat(generateForm.bonus) || 0;
    const deductions = parseFloat(generateForm.deductions) || 0;

    if (deductions > basicSalary + allowances + bonus) {
      setGenerateModalError('Deductions cannot exceed Gross Earnings (Basic + Allowances + Bonus).');
      return;
    }

    try {
      setActionLoading(true);
      const newRecord = await payrollApi.generate({
        employee_id: Number(generateForm.employee_id),
        month: generateForm.month,
        basic_salary: basicSalary,
        allowances,
        bonus,
        deductions,
        payment_method: generateForm.payment_method,
        notes: generateForm.notes,
      });

      setSuccessMsg(`Payroll generated successfully for ${generateForm.month}!`);
      setShowGenerateModal(false);
      setGenerateModalError('');
      setGenerateForm({
        employee_id: '',
        month: getCurrentMonth(),
        basic_salary: '',
        allowances: 0,
        bonus: 0,
        deductions: 0,
        payment_method: 'Direct Deposit',
        notes: '',
      });

      // Optimistic update
      if (newRecord && newRecord.id) {
        setAllPayrolls((prev) => [newRecord, ...prev.filter((p) => p.id !== newRecord.id)]);
        if (user?.employee && Number(generateForm.employee_id) === user.employee.id) {
          setMyPayrolls((prev) => [newRecord, ...prev.filter((p) => p.id !== newRecord.id)]);
        }
      }

      await fetchData();
    } catch (err) {
      setGenerateModalError(formatError(err, 'Failed to generate payroll record'));
    } finally {
      setActionLoading(false);
    }
  };

  // Update Status to PAID
  const handleMarkPaid = async (payrollId) => {
    try {
      setActionLoading(true);
      setError('');
      await payrollApi.updateStatus(payrollId, { status: 'PAID' });
      setSuccessMsg('Payroll status updated to PAID.');
      fetchData();
    } catch (err) {
      setError(formatError(err, 'Failed to update payroll status'));
    } finally {
      setActionLoading(false);
    }
  };

  // Download PDF Payslip
  const handleDownloadPdf = async (payroll) => {
    try {
      setDownloadingId(payroll.id);
      setError('');
      const filename = `Payslip_${payroll.employee?.employee_code || 'EMP'}_${payroll.month}.pdf`;
      await payrollApi.downloadPayslip(payroll.id, filename);
    } catch (err) {
      setError('Failed to download PDF payslip. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Paid
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payroll & Payslips</h1>
          <p className="text-sm text-slate-500 mt-1">
            Access monthly compensation summaries, generate payroll dispatches, and download certified payslips.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 shadow-xs"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isHrOrAdmin && (
            <>
              <button
                onClick={() => integrationApi.downloadPayrollCsv({ month: selectedMonth || undefined })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-colors"
                title="Export Payroll Report to CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => {
                  setGenerateModalError('');
                  setShowGenerateModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Payroll</span>
              </button>
            </>
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

      {/* KPI Summary Cards */}
      {isHrOrAdmin && summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Disbursed Net Pay
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              ${Number(summary.total_net_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">For period {summary.month}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Basic Pay
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              ${Number(summary.total_basic || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Base organizational salaries</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Allowances & Bonus
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              ${(Number(summary.total_allowances || 0) + Number(summary.total_bonus || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Deductions: ${Number(summary.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payslips Processed
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {summary.total_records || 0} Record{(summary.total_records || 0) === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Status: {allPayrolls.filter(p => p.status === 'PAID').length} Paid</p>
          </div>
        </div>
      ) : (
        /* Employee Personal KPI Preview */
        myPayrolls.length > 0 && (
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-semibold text-indigo-300 tracking-wider">
                Latest Compensation ({myPayrolls[0].month})
              </span>
              <h2 className="text-3xl font-black mt-1">
                ${Number(myPayrolls[0].net_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <div className="flex items-center gap-3 text-xs text-indigo-200 mt-2">
                <span>Basic: ${Number(myPayrolls[0].basic_salary).toLocaleString()}</span>
                <span>&bull;</span>
                <span>Allowances: ${Number(myPayrolls[0].allowances).toLocaleString()}</span>
                <span>&bull;</span>
                <span>Deductions: ${Number(myPayrolls[0].deductions).toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => handleDownloadPdf(myPayrolls[0])}
              disabled={downloadingId === myPayrolls[0].id}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingId === myPayrolls[0].id ? 'Downloading...' : 'Download Latest Payslip'}</span>
            </button>
          </div>
        )
      )}

      {/* Tabs */}
      {isHrOrAdmin && (
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab('all-payroll')}
              className={`pb-3 text-sm font-semibold transition-all relative ${
                activeTab === 'all-payroll'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Organization Payroll ({allPayrolls.length})
            </button>
            <button
              onClick={() => setActiveTab('my-payroll')}
              className={`pb-3 text-sm font-semibold transition-all relative ${
                activeTab === 'my-payroll'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Personal Payslips ({myPayrolls.length})
            </button>
          </nav>
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Month</th>
                {activeTab === 'all-payroll' && <th className="px-6 py-3.5">Employee</th>}
                <th className="px-6 py-3.5">Basic</th>
                <th className="px-6 py-3.5">Allowances & Bonus</th>
                <th className="px-6 py-3.5">Deductions</th>
                <th className="px-6 py-3.5">Net Salary</th>
                <th className="px-6 py-3.5">Method</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Payslip PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'all-payroll' ? 9 : 8} className="px-6 py-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading payroll records...
                  </td>
                </tr>
              ) : (activeTab === 'all-payroll' ? allPayrolls : myPayrolls).length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'all-payroll' ? 9 : 8} className="px-6 py-10 text-center text-slate-400">
                    No payroll entries found for this selection.
                  </td>
                </tr>
              ) : (
                (activeTab === 'all-payroll' ? allPayrolls : myPayrolls).map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{pay.month}</td>
                    {activeTab === 'all-payroll' && (
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {pay.employee_name || pay.employee?.full_name || `Emp #${pay.employee_id}`}
                        </div>
                        <div className="text-xs text-slate-400">
                          {pay.employee_code || pay.employee?.employee_code} &bull; {pay.department || pay.employee?.department}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 font-medium text-slate-800">
                      ${Number(pay.basic_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      +${(Number(pay.allowances) + Number(pay.bonus)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-rose-600">
                      -${Number(pay.deductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-black text-indigo-700">
                      ${Number(pay.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                      {pay.payment_method?.replace('_', ' ') || 'Direct Deposit'}
                    </td>
                    <td className="px-6 py-4">
                      {isHrOrAdmin && pay.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(pay.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                          title="Click to mark as Paid"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Paid</span>
                        </button>
                      ) : (
                        getStatusBadge(pay.status)
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(pay)}
                        disabled={downloadingId === pay.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                      >
                        {downloadingId === pay.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && isHrOrAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Generate Employee Payroll</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generateModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{generateModalError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select Employee
                  </label>
                  <select
                    required
                    value={generateForm.employee_id}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Payroll Month
                  </label>
                  <input
                    type="month"
                    required
                    value={generateForm.month}
                    onChange={(e) => setGenerateForm({ ...generateForm, month: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Basic Salary ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={generateForm.basic_salary}
                    onChange={(e) => setGenerateForm({ ...generateForm, basic_salary: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Allowances ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={generateForm.allowances}
                    onChange={(e) => setGenerateForm({ ...generateForm, allowances: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Bonus ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={generateForm.bonus}
                    onChange={(e) => setGenerateForm({ ...generateForm, bonus: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Deductions ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={generateForm.deductions}
                    onChange={(e) => setGenerateForm({ ...generateForm, deductions: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Net Pay Banner */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-indigo-900">
                <span className="text-xs font-semibold uppercase">Computed Net Salary:</span>
                <span className="text-lg font-black">${calculatedNetSalary()}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Disbursement Method
                  </label>
                  <select
                    value={generateForm.payment_method}
                    onChange={(e) => setGenerateForm({ ...generateForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Direct Deposit">Direct Bank Deposit</option>
                    <option value="Corporate Cheque">Corporate Cheque</option>
                    <option value="Cash Voucher">Cash Voucher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Internal Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Regular monthly payroll"
                    value={generateForm.notes}
                    onChange={(e) => setGenerateForm({ ...generateForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
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
                  <span>Issue Payroll</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollDashboard;
