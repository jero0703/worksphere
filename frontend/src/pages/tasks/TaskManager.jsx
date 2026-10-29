import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskApi } from '../../api/taskApi';
import { employeeApi } from '../../api/employeeApi';
import {
  ListTodo,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Trash2,
  Edit,
  Search,
  Filter,
  RefreshCw,
  X,
  PlayCircle,
  AlertCircle,
} from 'lucide-react';

export const TaskManager = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    overdue_tasks: 0,
  });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    assigned_to: '',
    title: '',
    description: '',
    due_date: '',
    priority: 'MEDIUM',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedEmployeeId) params.employee_id = selectedEmployeeId;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const [taskList, metricsData] = await Promise.all([
        taskApi.list(params),
        taskApi.getMetrics(selectedEmployeeId ? { employee_id: selectedEmployeeId } : {}),
      ]);

      setTasks(taskList);
      setMetrics(metricsData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load internal tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedEmployeeId, statusFilter]);

  useEffect(() => {
    if (isHrOrAdmin) {
      employeeApi.list().then(setEmployees).catch(console.error);
    }
  }, [isHrOrAdmin]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskApi.updateStatus(taskId, newStatus);
      setSuccessMsg(`Task status updated to ${newStatus.replace('_', ' ').toLowerCase()}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update task status');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setFormData({
      assigned_to: selectedEmployeeId || (employees[0]?.id ? String(employees[0].id) : ''),
      title: '',
      description: '',
      due_date: '',
      priority: 'MEDIUM',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      assigned_to: String(task.assigned_to),
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      priority: task.priority,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      if (editingTask) {
        await taskApi.update(editingTask.id, {
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date || null,
          priority: formData.priority,
          assigned_to: parseInt(formData.assigned_to, 10),
        });
        setSuccessMsg('Task updated successfully.');
      } else {
        await taskApi.create({
          assigned_to: parseInt(formData.assigned_to, 10),
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date || null,
          priority: formData.priority,
        });
        setSuccessMsg('Task assigned successfully.');
      }
      setShowModal(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskApi.delete(taskId);
      setSuccessMsg('Task deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete task');
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 uppercase">High Priority</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">Medium Priority</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">Low Priority</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="h-7 w-7 text-indigo-600" />
            Internal Task Management
          </h1>
          <p className="text-sm text-gray-500">
            {isHrOrAdmin
              ? 'Assign, track, and monitor operational tasks across the team.'
              : 'View your assigned tasks, deadlines, and update your progress.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTasks}
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
              Assign Task
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <span className="block text-2xl font-bold text-gray-900">{metrics.total_tasks}</span>
          <span className="text-xs text-gray-500">Total Tasks</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <span className="block text-2xl font-bold text-amber-600">{metrics.pending_tasks}</span>
          <span className="text-xs text-gray-500">Pending</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <span className="block text-2xl font-bold text-blue-600">{metrics.in_progress_tasks}</span>
          <span className="text-xs text-gray-500">In Progress</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <span className="block text-2xl font-bold text-emerald-600">{metrics.completed_tasks}</span>
          <span className="text-xs text-gray-500">Completed</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center col-span-2 sm:col-span-1">
          <span className="block text-2xl font-bold text-red-600">{metrics.overdue_tasks}</span>
          <span className="text-xs text-gray-500">Overdue</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {isHrOrAdmin && (
            <div className="min-w-[200px]">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Assignees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === '' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'PENDING' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'IN_PROGRESS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'COMPLETED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchTasks(); }} className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>
      </div>

      {/* Task Cards */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <ListTodo className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-700">No Tasks Found</h3>
          <p className="text-sm mt-1">There are no tasks matching the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
                  task.is_overdue
                    ? 'border-red-200 bg-red-50/15'
                    : isDone
                    ? 'border-gray-200 bg-gray-50/40 opacity-80'
                    : 'border-gray-200 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(task.priority)}
                      {task.is_overdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                          <AlertTriangle className="h-3 w-3" /> Overdue
                        </span>
                      )}
                    </div>

                    {isHrOrAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(task)}
                          className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                          title="Edit task"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className={`text-base font-bold text-gray-900 ${isDone ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    {task.assignee_name && (
                      <span className="flex items-center gap-1 text-gray-700 font-medium">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {task.assignee_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${task.is_overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        <Calendar className="h-3.5 w-3.5" />
                        Due: {task.due_date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Status:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStatusChange(task.id, 'PENDING')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        task.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        task.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Assign New Task'}
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
                  Assignee Employee *
                </label>
                <select
                  required
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct compliance audit on employee records"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Task Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide task instructions, deliverables, or checklist details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {submitting ? 'Saving...' : editingTask ? 'Save Changes' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
