import api, { cleanParams } from './api';

export const internService = {
  list: (params) => api.get('/interns', { params: cleanParams(params) }).then((r) => r.data),
  departments: () => api.get('/interns/departments').then((r) => r.data.departments),
  get: (id) => api.get(`/interns/${id}`).then((r) => r.data),
  create: (data) => api.post('/interns', data).then((r) => r.data),
  update: (id, data) => api.put(`/interns/${id}`, data).then((r) => r.data),
  uploadAvatar: (id, file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.put(`/interns/${id}/avatar`, form).then((r) => r.data);
  },
  remove: (id, permanent = false) => api.delete(`/interns/${id}`, { params: permanent ? { permanent: true } : {} }).then((r) => r.data),
};
