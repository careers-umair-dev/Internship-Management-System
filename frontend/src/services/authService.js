import api from './api';

export const authService = {
  login: (email, password, role) => api.post('/auth/login', { email, password, role }).then((r) => r.data),
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.user),
  updateProfile: (data) => api.put('/auth/profile', data).then((r) => r.data.user),
  changePassword: (data) => api.put('/auth/change-password', data).then((r) => r.data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.put('/auth/avatar', form).then((r) => r.data.user);
  },
};
