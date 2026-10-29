import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { onboardingApi } from '../../api/onboardingApi';
import { employeeApi } from '../../api/employeeApi';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  User,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  X,
  FileText,
  Laptop,
  ShieldCheck,
  Users,
  Sparkles,
  Layers,
  ChevronRight,
  BookOpen,
  HelpCircle,
  ExternalLink,
  Award,
} from 'lucide-react';

export const OnboardingChecklist = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  // Navigation tab
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'pipeline' | 'resources'

  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    completion_percentage: 0,
  });
  const [pipeline, setPipeline] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Assign Task Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    task_name: '',
    due_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Template Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateEmployeeId, setTemplateEmployeeId] = useState('');
  const [templateSubmitting, setTemplateSubmitting] = useState(false);

  const getTaskStage = (taskName = '') => {
    const lower = taskName.toLowerCase();
    if (
      lower.includes('offer') ||
      lower.includes('contract') ||
      lower.includes('id') ||
      lower.includes('proof') ||
      lower.includes('kyc') ||
      lower.includes('bank') ||
      lower.includes('tax') ||
      lower.includes('form') ||
      lower.includes('document')
    ) {
      return {
        key: 'DOCS',
        name: 'Documentation & KYC',
        icon: FileText,
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    if (
      lower.includes('laptop') ||
      lower.includes('workstation') ||
      lower.includes('email') ||
      lower.includes('vpn') ||
      lower.includes('it ') ||
      lower.includes('software') ||
      lower.includes('hardware') ||
      lower.includes('account')
    ) {
      return {
        key: 'IT',
        name: 'IT & Workspace Setup',
        icon: Laptop,
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    }
    if (
      lower.includes('handbook') ||
      lower.includes('policy') ||
      lower.includes('posh') ||
      lower.includes('security') ||
      lower.includes('compliance') ||
      lower.includes('ethics') ||
      lower.includes('privacy')
    ) {
      return {
        key: 'COMPLIANCE',
        name: 'Compliance & Policies',
        icon: ShieldCheck,
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return {
      key: 'ORIENTATION',
      name: 'Orientation & Culture',
      icon: Users,
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedEmployeeId) params.employee_id = selectedEmployeeId;
      if (filterStatus) params.status = filterStatus;

      const promises = [
        onboardingApi.list(params),
        onboardingApi.getSummary(selectedEmployeeId ? { employee_id: selectedEmployeeId } : {}),
      ];

      if (isHrOrAdmin) {
        promises.push(onboardingApi.getPipeline().catch(() => []));
      }

      const [taskList, summaryData, pipelineData] = await Promise.all(promises);

      setTasks(taskList || []);
      setSummary(summaryData || { total_tasks: 0, completed_tasks: 0, pending_tasks: 0, completion_percentage: 0 });
      if (pipelineData) setPipeline(pipelineData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load onboarding tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEmployeeId, filterStatus]);

  useEffect(() => {
    if (isHrOrAdmin) {
      employeeApi.list().then(setEmployees).catch(console.error);
    }
  }, [isHrOrAdmin]);

  const handleToggleStatus = async (task) => {
    try {
      const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      await onboardingApi.updateStatus(task.id, newStatus);
      setSuccessMsg(`Task "${task.task_name}" marked as ${newStatus.toLowerCase()}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update task status');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setFormData({
      employee_id: selectedEmployeeId || (employees[0]?.id ? String(employees[0].id) : ''),
      task_name: '',
      due_date: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      employee_id: String(task.employee_id),
      task_name: task.task_name,
      due_date: task.due_date || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      if (editingTask) {
        await onboardingApi.update(editingTask.id, {
          task_name: formData.task_name,
          due_date: formData.due_date || null,
        });
        setSuccessMsg('Onboarding milestone updated successfully.');
      } else {
        await onboardingApi.create({
          employee_id: parseInt(formData.employee_id, 10),
          task_name: formData.task_name,
          due_date: formData.due_date || null,
        });
        setSuccessMsg('New onboarding task assigned successfully.');
      }
      setShowModal(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save onboarding task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this onboarding task?')) return;
    try {
      await onboardingApi.delete(taskId);
      setSuccessMsg('Milestone removed.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete task');
    }
  };

  const handleAssignTemplate = async (empId, all = false) => {
    try {
      setTemplateSubmitting(true);
      setError('');
      const payload = all ? { all_employees: true } : { employee_id: parseInt(empId, 10) };
      const res = await onboardingApi.assignTemplate(payload);
      setSuccessMsg(res.message || 'Standard onboarding package assigned successfully.');
      setShowTemplateModal(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign onboarding package');
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStage !== 'ALL') {
      const stage = getTaskStage(task.task_name);
      if (stage.key !== filterStage) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = task.task_name.toLowerCase().includes(q);
      const matchEmp = (task.employee_name || '').toLowerCase().includes(q);
      if (!matchName && !matchEmp) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-700 p-6 rounded-2xl text-white shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-indigo-100 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Phase 4 Employee Experience
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <CheckSquare className="h-7 w-7 text-indigo-200" />
            Employee Onboarding & Induction
          </h1>
          <p className="text-sm text-indigo-100 max-w-2xl">
            {isHrOrAdmin
              ? 'Oversee new hire roadmaps, verify compliance milestones, and track employee readiness across departments.'
              : 'Welcome to WorkSphere! Track your induction milestones, complete documentation, and get ready for your role.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchData}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isHrOrAdmin && (
            <>
              <button
                onClick={() => {
                  setTemplateEmployeeId(selectedEmployeeId || (employees[0]?.id ? String(employees[0].id) : ''));
                  setShowTemplateModal(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-indigo-500/40 hover:bg-indigo-500/60 text-white rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all shadow-sm"
              >
                <Layers className="h-4 w-4 text-amber-300" />
                Assign Package
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Plus className="h-4 w-4 text-indigo-600" />
                New Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'checklist'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          Checklist & Milestones
        </button>

        {isHrOrAdmin && (
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'pipeline'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            New Hire Pipeline
            {pipeline.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-bold">
                {pipeline.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('resources')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'resources'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Induction Guide & Resources
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2.5 text-sm animate-in fade-in">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2.5 text-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: CHECKLIST & MILESTONES */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Induction Checklist Completion</h2>
                  {selectedEmployeeId && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {employees.find((e) => String(e.id) === String(selectedEmployeeId))?.full_name || 'Selected Employee'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {summary.completed_tasks} of {summary.total_tasks} onboarding requirements fulfilled
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600">{summary.completion_percentage}%</span>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Overall</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 mt-4 overflow-hidden">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${summary.completion_percentage}%` }}
              />
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-4 mt-6 text-center border-t border-gray-100 pt-4">
              <div className="p-2 rounded-xl bg-gray-50/60">
                <span className="block text-xl font-bold text-gray-900">{summary.total_tasks}</span>
                <span className="text-xs text-gray-500 font-medium">Total Milestones</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50/60">
                <span className="block text-xl font-bold text-emerald-600">{summary.completed_tasks}</span>
                <span className="text-xs text-gray-500 font-medium">Completed</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50/60">
                <span className="block text-xl font-bold text-amber-600">{summary.pending_tasks}</span>
                <span className="text-xs text-gray-500 font-medium">Pending Action</span>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {isHrOrAdmin && (
                  <div className="min-w-[220px]">
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Employees ({employees.length})</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.employee_code}) - {emp.department}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setFilterStatus('')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterStatus === '' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    All Status
                  </button>
                  <button
                    onClick={() => setFilterStatus('PENDING')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterStatus === 'PENDING' ? 'bg-white text-amber-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus('COMPLETED')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterStatus === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search onboarding tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Stages Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-400 font-medium whitespace-nowrap">Filter Stage:</span>
              {[
                { key: 'ALL', label: 'All Stages' },
                { key: 'DOCS', label: 'Documentation & KYC' },
                { key: 'IT', label: 'IT & Workspace' },
                { key: 'COMPLIANCE', label: 'Compliance & Policies' },
                { key: 'ORIENTATION', label: 'Orientation & Culture' },
              ].map((stage) => (
                <button
                  key={stage.key}
                  onClick={() => setFilterStage(stage.key)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
                    filterStage === stage.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading onboarding milestones...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800">No Onboarding Milestones Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                {selectedEmployeeId
                  ? 'This employee has no onboarding tasks assigned yet. You can assign the standard 9-step package with one click.'
                  : 'No tasks match the active filters. Clear your filters or assign the standard induction package.'}
              </p>
              {isHrOrAdmin && (
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    onClick={() => handleAssignTemplate(selectedEmployeeId || (employees[0]?.id ? String(employees[0].id) : ''))}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"
                  >
                    <Layers className="h-4 w-4" />
                    Assign Standard Package Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isCompleted = task.status === 'COMPLETED';
                const stage = getTaskStage(task.task_name);
                const StageIcon = stage.icon;

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border transition-all p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCompleted
                        ? 'border-gray-200 bg-gray-50/40 opacity-80'
                        : 'border-gray-200 hover:border-indigo-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className={`mt-0.5 p-1 rounded-lg transition-colors flex-shrink-0 ${
                          isCompleted
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-gray-300 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <div className="h-6 w-6 rounded-lg border-2 border-gray-300 hover:border-indigo-600 bg-white" />
                        )}
                      </button>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm font-semibold ${
                              isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}
                          >
                            {task.task_name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${stage.badge}`}
                          >
                            <StageIcon className="h-3 w-3" />
                            {stage.name}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {isHrOrAdmin && task.employee_name && (
                            <span className="flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              <User className="h-3.5 w-3.5" />
                              {task.employee_name} ({task.employee_code})
                            </span>
                          )}
                          {task.due_date && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              Target: {task.due_date}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isHrOrAdmin && (
                      <div className="flex items-center gap-1 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0">
                        <button
                          onClick={() => handleOpenEditModal(task)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit milestone"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete milestone"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NEW HIRE PIPELINE (HR & ADMIN) */}
      {activeTab === 'pipeline' && isHrOrAdmin && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Company-Wide Onboarding Pipeline</h2>
            <p className="text-xs text-gray-500 mb-6">
              Track induction readiness, document submission, and training progression across all team members.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pipeline.map((item) => {
                const isComplete = item.completion_percentage === 100 && item.total_tasks > 0;
                return (
                  <div
                    key={item.employee_id}
                    className="bg-gray-50/60 rounded-2xl border border-gray-200/80 p-5 space-y-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                          {item.employee_name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">{item.employee_name}</h3>
                          <p className="text-[11px] text-gray-500">
                            {item.employee_code} • {item.department}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.completion_percentage > 50
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.completion_percentage}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-gray-500 mb-1">
                        <span>Milestones Fulfilled</span>
                        <span>
                          {item.completed_tasks} / {item.total_tasks}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isComplete ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${item.completion_percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                      <span className="text-gray-400 text-[11px]">
                        Joined: {item.joining_date || 'N/A'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedEmployeeId(String(item.employee_id));
                          setActiveTab('checklist');
                        }}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
                      >
                        View Checklist
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INDUCTION GUIDE & RESOURCES */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Welcome Roadmap */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">Standard 30-60-90 Day Onboarding Journey</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                WorkSphere's structured pathway designed to guide team members from day one to full autonomy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  Day 1
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Welcome & Setup</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Sign contracts, submit KYC and bank details, setup workstation and email, meet your team buddy.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                  Week 1
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Tools & Culture</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Review employee handbook, complete POSH and cybersecurity training, attend HR orientation.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  Day 30
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Role Alignment</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Define quarterly OKRs, schedule 1-on-1 performance sync with department manager, take on first project.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  Day 90
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Probation Review</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Complete probation assessment, share onboarding feedback, formal confirmation into ongoing role.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Resources Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">WorkSphere Employee Handbook</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Learn our code of conduct, core values, working hours, and workplace safety guidelines.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 cursor-pointer hover:underline">
                Read Handbook <ExternalLink className="h-3 w-3" />
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Security & IT Compliance</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Password hygiene, multi-factor authentication setup, and data confidentiality guidelines.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 cursor-pointer hover:underline">
                View IT Security Guide <ExternalLink className="h-3 w-3" />
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">People Operations Support</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Need help with documentation or setup? Contact People Ops at hr@worksphere.com or IT desk.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 cursor-pointer hover:underline">
                Get Support <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN / EDIT TASK */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900">
                {editingTask ? 'Edit Onboarding Milestone' : 'Assign Custom Milestone'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingTask && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Assignee Employee *
                  </label>
                  <select
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select an employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code}) - {emp.department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Milestone Task Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upload Government ID & Address Proof"
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingTask ? 'Save Changes' : 'Assign Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN STANDARD ONBOARDING PACKAGE */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-gray-900">
                  Assign Standard Onboarding Package
                </h2>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              This will automatically generate the 9 core WorkSphere onboarding requirements (Offer letter, KYC, bank details, laptop setup, employee handbook, cybersecurity, POSH, and 30-day review).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Target Employee
                </label>
                <select
                  value={templateEmployeeId}
                  onChange={(e) => setTemplateEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <span className="font-semibold block">Includes 9 Standard Requirements:</span>
                <ul className="list-disc list-inside space-y-0.5 text-indigo-700 text-[11px]">
                  <li>Submit Signed Offer Letter & Employment Agreement</li>
                  <li>Upload Government ID & Address Proof (KYC Verification)</li>
                  <li>Submit Bank Account Details for Payroll Direct Deposit</li>
                  <li>IT Setup: Configure Work Laptop, Corporate Email & VPN</li>
                  <li>Review & Acknowledge Employee Handbook & Code of Conduct</li>
                  <li>Complete POSH & Workplace Ethics Compliance Training</li>
                  <li>Complete Cyber Security & Data Privacy Training</li>
                  <li>Attend First-Day HR Orientation & Meet Assigned Buddy</li>
                  <li>Initial 30-Day Goal Setting Session with Department Lead</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={templateSubmitting}
                  onClick={() => handleAssignTemplate(null, true)}
                  className="px-3.5 py-2 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-50"
                >
                  Assign to All Employees
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!templateEmployeeId || templateSubmitting}
                    onClick={() => handleAssignTemplate(templateEmployeeId, false)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {templateSubmitting ? 'Assigning...' : 'Assign to Selected'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;
