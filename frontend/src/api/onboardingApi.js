import axiosInstance from './axios';

export const onboardingApi = {
  list: async (params) => {
    const response = await axiosInstance.get('/onboarding', { params });
    return response.data;
  },
  getSummary: async (params) => {
    const response = await axiosInstance.get('/onboarding/summary', { params });
    return response.data;
  },
  getPipeline: async (params) => {
    const response = await axiosInstance.get('/onboarding/pipeline', { params });
    return response.data;
  },
  assignTemplate: async (data) => {
    const response = await axiosInstance.post('/onboarding/assign-template', data);
    return response.data;
  },
  create: async (data) => {
    const response = await axiosInstance.post('/onboarding', data);
    return response.data;
  },
  updateStatus: async (taskId, status) => {
    const response = await axiosInstance.patch(`/onboarding/${taskId}/status`, { status });
    return response.data;
  },
  update: async (taskId, data) => {
    const response = await axiosInstance.put(`/onboarding/${taskId}`, data);
    return response.data;
  },
  delete: async (taskId) => {
    const response = await axiosInstance.delete(`/onboarding/${taskId}`);
    return response.data;
  },
};

export default onboardingApi;
