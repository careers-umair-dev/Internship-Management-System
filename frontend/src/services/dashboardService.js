import api, { cleanParams } from './api';

export const dashboardService = {
  admin: (params) => api.get('/dashboard/admin', { params: cleanParams(params) }).then((r) => r.data),
  intern: (params) => api.get('/dashboard/intern', { params: cleanParams(params) }).then((r) => r.data),
  internPerformance: (id, params) => api.get(`/dashboard/interns/${id}`, { params: cleanParams(params) }).then((r) => r.data),
  activity: (params) => api.get('/activity', { params: cleanParams(params) }).then((r) => r.data),
};
