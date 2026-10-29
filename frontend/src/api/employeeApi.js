import api from './axios';

export const employeeApi = {
  list: async () => {
    const response = await api.get('/employees/search', { params: { page: 1, page_size: 100 } });
    return response.data?.items || [];
  },

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
