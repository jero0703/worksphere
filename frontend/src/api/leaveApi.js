import api from './axios';

export const leaveApi = {
  getPolicies: async () => {
    const response = await api.get('/leaves/policies');
    return response.data;
  },

  updatePolicy: async (policyId, data) => {
    const response = await api.put(`/leaves/policies/${policyId}`, data);
    return response.data;
  },

  getMyBalances: async () => {
    const response = await api.get('/leaves/balances/me');
    return response.data;
  },

  getAllBalances: async (params = {}) => {
    const response = await api.get('/leaves/balances', { params });
    return response.data;
  },

  apply: async (data) => {
    const response = await api.post('/leaves', data);
    return response.data;
  },

  getMyLeaves: async (params = {}) => {
    const response = await api.get('/leaves/me', { params });
    return response.data;
  },

  getAllLeaves: async (params = {}) => {
    const response = await api.get('/leaves', { params });
    return response.data;
  },

  approve: async (leaveId, comment) => {
    const response = await api.patch(`/leaves/${leaveId}/approve`, {
      status: 'APPROVED',
      review_comment: comment,
    });
    return response.data;
  },

  reject: async (leaveId, comment) => {
    const response = await api.patch(`/leaves/${leaveId}/reject`, {
      status: 'REJECTED',
      review_comment: comment,
    });
    return response.data;
  },

  cancel: async (leaveId) => {
    const response = await api.patch(`/leaves/${leaveId}/cancel`);
    return response.data;
  },

  getCalendar: async (params = {}) => {
    const response = await api.get('/leaves/calendar', { params });
    return response.data;
  },
};
