import axiosInstance from './axios';

export const taskApi = {
  list: async (params) => {
    const response = await axiosInstance.get('/tasks', { params });
    return response.data;
  },
  getMetrics: async (params) => {
    const response = await axiosInstance.get('/tasks/metrics', { params });
    return response.data;
  },
  get: async (id) => {
    const response = await axiosInstance.get(`/tasks/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await axiosInstance.post('/tasks', data);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await axiosInstance.patch(`/tasks/${id}/status`, { status });
    return response.data;
  },
  update: async (id, data) => {
    const response = await axiosInstance.put(`/tasks/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await axiosInstance.delete(`/tasks/${id}`);
    return response.data;
  },
};

export default taskApi;
