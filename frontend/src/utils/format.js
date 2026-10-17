const API_URL = import.meta.env.VITE_API_URL || '';

// Uploaded files are served by the API origin (`/uploads/..`). In dev the Vite proxy handles it.
export const assetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_URL.replace(/\/api\/?$/, '');
  return `${origin}${path}`;
};

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

export const formatDate = (d, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Intl.DateTimeFormat('en-GB', options).format(new Date(d)) : '-';

export const formatDateTime = (d) =>
  d ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '-';

export const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 45) return 'just now';
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, secs] of units) {
    if (s >= secs) {
      const n = Math.floor(s / secs);
      return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

// Human deadline label + urgency tone ('danger' | 'warning' | 'default')
export const deadlineInfo = (deadline, status) => {
  if (!deadline) return { label: 'No deadline', tone: 'default' };
  if (status === 'Completed') return { label: `Done - due ${formatDate(deadline)}`, tone: 'default' };
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) {
    const lateDays = Math.floor(-diff / 86400000);
    return { label: lateDays >= 1 ? `Overdue by ${lateDays} day${lateDays > 1 ? 's' : ''}` : 'Overdue', tone: 'danger' };
  }
  const hours = Math.ceil(diff / 3600000);
  if (hours <= 24) return { label: hours <= 1 ? 'Due within the hour' : `Due in ${hours} hours`, tone: 'danger' };
  const days = Math.ceil(diff / 86400000);
  return { label: `Due in ${days} days`, tone: days <= 3 ? 'warning' : 'default' };
};


// Extracts a readable message from an axios error
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') return 'Cannot reach the server. Check your connection.';
  return err?.message || fallback;
};

// Maps backend validation details ([{field,message}]) to { field: message }
export const serverFieldErrors = (err) => {
  const list = err?.response?.data?.errors;
  if (!Array.isArray(list)) return {};
  return list.reduce((acc, e) => (e.field && !acc[e.field] ? { ...acc, [e.field]: e.message } : acc), {});
};
