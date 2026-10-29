import axiosInstance from './axios';

export const feedbackApi = {
  list: async (params) => {
    const response = await axiosInstance.get('/feedback', { params });
    return response.data;
  },
  getMetrics: async () => {
    const response = await axiosInstance.get('/feedback/metrics');
    return response.data;
  },
  submit: async (data) => {
    const response = await axiosInstance.post('/feedback', data);
    return response.data;
  },
  updateStatus: async (id, data) => {
    const response = await axiosInstance.patch(`/feedback/${id}/status`, data);
    return response.data;
  },
};

export default feedbackApi;
