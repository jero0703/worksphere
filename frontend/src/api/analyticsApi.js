import api from './axios';

const downloadBlob = (data, defaultFilename) => {
  const blob = new Blob([data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const analyticsApi = {
  getDashboard: async (params = {}) => {
    const response = await api.get('/analytics/dashboard', { params });
    return response.data;
  },

  exportAttendanceCsv: async (params = {}) => {
    const response = await api.get('/analytics/export/attendance', {
      params,
      responseType: 'blob',
    });
    downloadBlob(response.data, `attendance_export_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  exportLeavesCsv: async (params = {}) => {
    const response = await api.get('/analytics/export/leaves', {
      params,
      responseType: 'blob',
    });
    downloadBlob(response.data, `leaves_export_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  exportPayrollCsv: async (params = {}) => {
    const response = await api.get('/analytics/export/payroll', {
      params,
      responseType: 'blob',
    });
    downloadBlob(response.data, `payroll_export_${new Date().toISOString().slice(0, 10)}.csv`);
  },
};

export default analyticsApi;
