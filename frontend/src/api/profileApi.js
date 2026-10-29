import axiosInstance from './axios';

export const profileApi = {
  getProfile: async () => {
    const response = await axiosInstance.get('/profile');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await axiosInstance.put('/profile', data);
    return response.data;
  },
  changePassword: async (data) => {
    const response = await axiosInstance.post('/profile/change-password', data);
    return response.data;
  },
  getSettings: async () => {
    const response = await axiosInstance.get('/profile/settings');
    return response.data;
  },
  updateSettings: async (data) => {
    const response = await axiosInstance.put('/profile/settings', data);
    return response.data;
  },
};

export default profileApi;
