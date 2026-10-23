import api from './axios';

export const dashboardApi = {
  getEmployeeDashboard: async () => {
    const response = await api.get('/dashboard/employee');
    return response.data;
  },

  getHrDashboard: async () => {
    const response = await api.get('/dashboard/hr');
    return response.data;
  },

  getAdminDashboard: async () => {
    const response = await api.get('/dashboard/admin');
    return response.data;
  },
};
