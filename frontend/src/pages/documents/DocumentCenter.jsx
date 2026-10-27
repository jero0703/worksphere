import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { documentApi } from '../../api/documentApi';
import { employeeApi } from '../../api/employeeApi';
import {
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck,
  FolderOpen,
  User,
  Calendar,
  HardDrive,
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'ID Proof',
  'Certificate',
  'Contract',
  'Resume',
  'Tax Form',
  'Other',
];

export const DocumentCenter = () => {
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';

  // State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('ID Proof');
  const [description, setDescription] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [employeesList, setEmployeesList] = useState([]);

  // Fetch Documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await documentApi.getDocuments({
        document_type: selectedType || undefined,
        search: searchTerm || undefined,
      });
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load employee documents.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Employees for dropdown if HR/Admin
  const fetchEmployees = async () => {
    if (!isHrOrAdmin) return;
    try {
      const res = await employeeApi.searchEmployees({ page: 1, page_size: 100 });
      setEmployeesList(res.items || []);
    } catch (err) {
      console.error('Failed to load employee list:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedType]);

  useEffect(() => {
    fetchEmployees();
  }, [isHrOrAdmin]);

  // Handle Search Submission
  const handleSearch = (e) => {
    e.preventDefault();
    fetchDocuments();
  };

  // Handle File Upload Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds maximum allowed size of 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', docType);
    if (description.trim()) {
      formData.append('description', description.trim());
    }
    if (isHrOrAdmin && targetEmployeeId) {
      formData.append('employee_id', targetEmployeeId);
    }

    try {
      setUploadLoading(true);
      await documentApi.uploadDocument(formData);
      setSuccessMsg('Document successfully uploaded and secured.');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDescription('');
      fetchDocuments();
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle Download
  const handleDownload = async (doc) => {
    try {
      await documentApi.downloadDocument(doc.id, doc.file_name);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to download document.');
    }
  };

  // Handle Delete
  const handleDelete = async (docId, fileName) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${fileName}'?`)) {
      return;
    }
    try {
      await documentApi.deleteDocument(docId);
      setSuccessMsg('Document deleted successfully.');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete document.');
    }
  };

  // Calculate stats
  const totalDocs = documents.length;
  const totalSizeBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);
  const totalSizeFormatted =
    totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(totalSizeBytes / 1024)} KB`;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Document Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Securely store, organize, and access certificates, IDs, and employee compliance records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setUploadError('');
              setSelectedFile(null);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isHrOrAdmin ? 'Total System Files' : 'My Documents'}
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalDocs}</div>
          </div>
          <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Encrypted Storage
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalSizeFormatted}</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Allowed Formats
            </span>
            <div className="text-sm font-bold text-slate-800 mt-2">PDF, PNG, JPG, DOCX</div>
          </div>
          <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="w-full md:w-96 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents or employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <button
            onClick={() => setSelectedType('')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedType === ''
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Types
          </button>
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                selectedType === type
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Document Name</th>
                <th className="px-6 py-3.5">Category</th>
                {isHrOrAdmin && <th className="px-6 py-3.5">Employee</th>}
                <th className="px-6 py-3.5">File Size</th>
                <th className="px-6 py-3.5">Uploaded</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isHrOrAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading secure documents...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={isHrOrAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No documents found matching the criteria.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm truncate max-w-xs" title={doc.file_name}>
                            {doc.file_name}
                          </div>
                          {doc.description && (
                            <div className="text-xs text-slate-400 truncate max-w-xs">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {doc.document_type}
                      </span>
                    </td>

                    {isHrOrAdmin && (
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{doc.employee_name || 'N/A'}</div>
                        <div className="text-xs text-slate-400">
                          {doc.employee_code} &bull; {doc.department}
                        </div>
                      </td>
                    )}

                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {formatFileSize(doc.file_size)}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div>{new Date(doc.uploaded_at).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-400">by {doc.uploader_name}</div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Upload Employee Document</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Choose Document (PDF, PNG, JPG, DOCX - max 10MB)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.doc,.txt,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 rounded-xl p-1.5 bg-slate-50 cursor-pointer"
                />
              </div>

              {/* Target Employee selector for HR/Admin */}
              {isHrOrAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Assign to Employee
                  </label>
                  <select
                    value={targetEmployeeId}
                    onChange={(e) => setTargetEmployeeId(e.target.value)}
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

              {/* Document Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Document Category
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Government ID issued 2024..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {uploadLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Upload Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentCenter;
