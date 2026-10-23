import api from './axios';

export const attendanceApi = {
  checkIn: async () => {
    const response = await api.post('/attendance/check-in');
    return response.data;
  },

  checkOut: async () => {
    const response = await api.post('/attendance/check-out');
    return response.data;
  },

  getTodayStatus: async () => {
    const response = await api.get('/attendance/today');
    return response.data;
  },

  getPersonalHistory: async (params = {}) => {
    const response = await api.get('/attendance/me', { params });
    return response.data;
  },

  getAllAttendance: async (params = {}) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  getSummary: async (dateStr) => {
    const params = dateStr ? { date: dateStr } : {};
    const response = await api.get('/attendance/summary', { params });
    return response.data;
  },

  correctRecord: async (attendanceId, data) => {
    const response = await api.patch(`/attendance/${attendanceId}/correct`, data);
    return response.data;
  },

  processAutoAbsent: async (targetDate, force = false) => {
    const params = { force };
    if (targetDate) params.target_date = targetDate;
    const response = await api.post('/attendance/process-daily-absent', null, { params });
    return response.data;
  },
};
