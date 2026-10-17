import api, { cleanParams } from './api';

export const feedbackService = {
  list: (params) => api.get('/feedback', { params: cleanParams(params) }).then((r) => r.data),
  create: (data) => api.post('/feedback', data).then((r) => r.data),
  remove: (id) => api.delete(`/feedback/${id}`).then((r) => r.data),
};
