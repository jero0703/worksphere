import api from './axios';

export const payrollApi = {
  getEligibleEmployees: async () => {
    const response = await api.get('/payroll/employees/list');
    return response.data;
  },

  generate: async (data) => {
    const response = await api.post('/payroll/generate', data);
    return response.data;
  },

  getMyPayroll: async () => {
    const response = await api.get('/payroll/me');
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await api.get('/payroll', { params });
    return response.data;
  },

  getSummary: async (month) => {
    const response = await api.get('/payroll/summary', { params: { month } });
    return response.data;
  },

  getById: async (payrollId) => {
    const response = await api.get(`/payroll/${payrollId}`);
    return response.data;
  },

  updateStatus: async (payrollId, data) => {
    const response = await api.patch(`/payroll/${payrollId}/status`, data);
    return response.data;
  },

  downloadPayslip: async (payrollId, filename = 'payslip.pdf') => {
    const response = await api.get(`/payroll/${payrollId}/payslip`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
