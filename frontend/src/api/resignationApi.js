import axiosInstance from './axios';

export const resignationApi = {
  list: async (params) => {
    const response = await axiosInstance.get('/resignations', { params });
    return response.data;
  },
  get: async (id) => {
    const response = await axiosInstance.get(`/resignations/${id}`);
    return response.data;
  },
  submit: async (data) => {
    const response = await axiosInstance.post('/resignations', data);
    return response.data;
  },
  review: async (id, data) => {
    const response = await axiosInstance.patch(`/resignations/${id}/review`, data);
    return response.data;
  },
};

export default resignationApi;
