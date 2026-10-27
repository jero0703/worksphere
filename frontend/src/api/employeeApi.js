import api from './axios';

export const employeeApi = {
  searchEmployees: async (params = {}) => {
    const response = await api.get('/employees/search', { params });
    return response.data;
  },

  getProfile: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/profile`);
    return response.data;
  },
};

export default employeeApi;
