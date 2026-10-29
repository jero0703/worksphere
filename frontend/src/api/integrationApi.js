import axiosInstance from './axios';

const saveBlob = (data, defaultFilename, mimeType) => {
  const blob = new Blob([data], { type: mimeType });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
};

export const integrationApi = {
  getGoogleCalendarStatus: async () => {
    const response = await axiosInstance.get('/calendar/google/status');
    return response.data;
  },
  downloadIcsCalendar: async (employeeId) => {
    const params = employeeId ? { employee_id: employeeId } : {};
    const response = await axiosInstance.get('/calendar/export.ics', {
      params,
      responseType: 'blob',
    });
    const filename = `worksphere_schedule_${new Date().toISOString().slice(0, 10)}.ics`;
    saveBlob(response.data, filename, 'text/calendar');
    return true;
  },
  downloadAttendanceCsv: async (params = {}) => {
    const response = await axiosInstance.get('/exports/attendance.csv', {
      params,
      responseType: 'blob',
    });
    const filename = `worksphere_attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    saveBlob(response.data, filename, 'text/csv');
    return true;
  },
  downloadPayrollCsv: async (params = {}) => {
    const response = await axiosInstance.get('/exports/payroll.csv', {
      params,
      responseType: 'blob',
    });
    const filename = `worksphere_payroll_${new Date().toISOString().slice(0, 10)}.csv`;
    saveBlob(response.data, filename, 'text/csv');
    return true;
  },
  downloadLeavesCsv: async (params = {}) => {
    const response = await axiosInstance.get('/exports/leaves.csv', {
      params,
      responseType: 'blob',
    });
    const filename = `worksphere_leaves_${new Date().toISOString().slice(0, 10)}.csv`;
    saveBlob(response.data, filename, 'text/csv');
    return true;
  },
};

export default integrationApi;
