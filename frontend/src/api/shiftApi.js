import api from './axios';

export const shiftApi = {
  getShifts: async (activeOnly = false) => {
    const response = await api.get('/shifts', { params: { active_only: activeOnly } });
    return response.data;
  },

  createShift: async (data) => {
    const response = await api.post('/shifts', data);
    return response.data;
  },

  getShift: async (shiftId) => {
    const response = await api.get(`/shifts/${shiftId}`);
    return response.data;
  },

  updateShift: async (shiftId, data) => {
    const response = await api.put(`/shifts/${shiftId}`, data);
    return response.data;
  },

  deleteShift: async (shiftId) => {
    const response = await api.delete(`/shifts/${shiftId}`);
    return response.data;
  },

  getAssignments: async (params = {}) => {
    const response = await api.get('/shifts/assignments', { params });
    return response.data;
  },

  assignShift: async (data) => {
    const response = await api.post('/shifts/assign', data);
    return response.data;
  },

  deleteAssignment: async (assignmentId) => {
    const response = await api.delete(`/shifts/assignments/${assignmentId}`);
    return response.data;
  },

  getMyShift: async () => {
    const response = await api.get('/shifts/my-shift');
    return response.data;
  },

  getEmployeeShift: async (employeeId) => {
    const response = await api.get(`/shifts/employee/${employeeId}`);
    return response.data;
  },

  processAttendance: async (targetDate, force = false) => {
    const params = { force };
    if (targetDate) params.target_date = targetDate;
    const response = await api.post('/shifts/process-attendance', null, { params });
    return response.data;
  },
};
