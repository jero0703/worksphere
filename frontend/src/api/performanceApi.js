import api from './axios';

export const performanceApi = {
  getReviews: async (params = {}) => {
    const response = await api.get('/performance', { params });
    return response.data;
  },

  getSummary: async (params = {}) => {
    const response = await api.get('/performance/summary', { params });
    return response.data;
  },

  getReview: async (reviewId) => {
    const response = await api.get(`/performance/${reviewId}`);
    return response.data;
  },

  createReview: async (data) => {
    const response = await api.post('/performance', data);
    return response.data;
  },

  updateReview: async (reviewId, data) => {
    const response = await api.put(`/performance/${reviewId}`, data);
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await api.delete(`/performance/${reviewId}`);
    return response.data;
  },
};

export default performanceApi;
