export const TOKEN_KEY = 'iph_token';
export const THEME_KEY = 'iph_theme';
export const SIDEBAR_KEY = 'iph_sidebar_collapsed';

export const ROLES = { ADMIN: 'admin', INTERN: 'intern' };
export const homeFor = (role) => (role === ROLES.ADMIN ? '/admin/dashboard' : '/intern/dashboard');

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue'];

// Badge variant per task status / priority / submission status
export const STATUS_VARIANT = { Pending: 'neutral', 'In Progress': 'info', Completed: 'success', Overdue: 'danger' };
export const PRIORITY_VARIANT = { Low: 'neutral', Medium: 'info', High: 'warning', Critical: 'danger' };
export const SUBMISSION_VARIANT = { pending: 'warning', approved: 'success', rejected: 'danger', revision_requested: 'info' };
export const SUBMISSION_LABEL = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected', revision_requested: 'Revision requested' };
