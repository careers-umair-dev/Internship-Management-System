import api, { cleanParams } from './api';
import { saveBlob, filenameFromResponse } from '../utils/download';

const download = async (url, params, fallbackName) => {
  const res = await api.get(url, { params: cleanParams(params), responseType: 'blob' });
  saveBlob(res.data, filenameFromResponse(res, fallbackName));
};

export const reportService = {
  internsCSV: () => download('/reports/interns.csv', {}, 'interns.csv'),
  tasksCSV: (params) => download('/reports/tasks.csv', params, 'tasks.csv'),
  progressCSV: (internId) => download(`/reports/progress/${internId}`, { format: 'csv' }, 'progress.csv'),
  progress: (internId) => api.get(`/reports/progress/${internId}`).then((r) => r.data),
};
