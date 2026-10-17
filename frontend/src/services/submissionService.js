import api, { cleanParams } from './api';

export const submissionService = {
  list: (params) => api.get('/submissions', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => api.get(`/submissions/${id}`).then((r) => r.data),
  create: (formData) => api.post('/submissions', formData).then((r) => r.data),
  review: (id, data) => api.patch(`/submissions/${id}/review`, data).then((r) => r.data),
};
