import api, { cleanParams } from './api';

// `data` may be a plain object or FormData (when attachments are included)
export const taskService = {
  list: (params) => api.get('/tasks', { params: cleanParams(params) }).then((r) => r.data),
  board: (params) => api.get('/tasks/board', { params: cleanParams(params) }).then((r) => r.data.board),
  categories: () => api.get('/tasks/categories').then((r) => r.data.categories),
  get: (id) => api.get(`/tasks/${id}`).then((r) => r.data),
  create: (data) => api.post('/tasks', data).then((r) => r.data),
  update: (id, data) => api.put(`/tasks/${id}`, data).then((r) => r.data),
  changeStatus: (id, status, progress) => api.patch(`/tasks/${id}/status`, { status, progress }).then((r) => r.data),
  updateProgress: (id, data) => api.patch(`/tasks/${id}/progress`, data).then((r) => r.data),
  remove: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
};
