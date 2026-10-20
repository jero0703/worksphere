import api from './axios';

export const userApi = {
  getUsers: async (params) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateRole: async (userId, role) => {
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response.data;
  },

  updateStatus: async (userId, isActive) => {
    const response = await api.patch(`/users/${userId}/status`, { is_active: isActive });
    return response.data;
  },
};
