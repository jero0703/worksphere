import axiosInstance from './axios';

export const announcementApi = {
  list: async (params) => {
    const response = await axiosInstance.get('/announcements', { params });
    return response.data;
  },
  get: async (id) => {
    const response = await axiosInstance.get(`/announcements/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await axiosInstance.post('/announcements', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await axiosInstance.put(`/announcements/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await axiosInstance.delete(`/announcements/${id}`);
    return response.data;
  },
};

export default announcementApi;
