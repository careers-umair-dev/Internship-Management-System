import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppProviders from '../AppProviders';
import App from '../App';

export const renderApp = (route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders><App /></AppProviders>
    </MemoryRouter>
  );

export const adminUser = { _id: 'a1', name: 'Ayesha Khan', email: 'admin@internhub.com', role: 'admin', designation: 'Program Manager' };
export const internUser = { _id: 'i1', name: 'Ali Raza', email: 'ali@internhub.com', role: 'intern', department: 'Engineering', position: 'Frontend Intern', skills: ['React'] };

export const adminDash = {
  success: true,
  range: { from: new Date(Date.now() - 29 * 86400000).toISOString(), to: new Date().toISOString(), groupBy: 'day' },
  trend: [{ period: '2026-10-01', assigned: 2, completed: 1 }, { period: '2026-10-02', assigned: 1, completed: 2 }],
  performance: [{ intern: { _id: 'i1', name: 'Ali Raza' }, total: 3, completed: 1, avgProgress: 62, onTimeRate: 100 }],
  priorityBreakdown: [{ name: 'High', value: 3 }, { name: 'Low', value: 1 }],
  cards: { totalInterns: 5, activeInterns: 4, totalTasks: 12, completedTasks: 4, pendingTasks: 6, overdueTasks: 2, completionRate: 33, avgProgress: 47 },
  statusBreakdown: [{ name: 'Completed', value: 4 }, { name: 'In Progress', value: 3 }, { name: 'Pending', value: 3 }, { name: 'Overdue', value: 2 }],
  upcomingDeadlines: [{ _id: 't1', title: 'Integrate REST API', priority: 'Critical', status: 'In Progress', deadline: new Date(Date.now() + 2 * 86400000).toISOString(), intern: { name: 'Ali Raza' } }],
  recentActivity: [{ _id: 'x1', action: 'task.created', description: 'Ayesha Khan assigned "Integrate REST API" to Ali Raza', createdAt: new Date().toISOString() }],
};
export const internDash = {
  success: true,
  cards: { overallProgress: 62, assignedTasks: 3, completedTasks: 1, pendingTasks: 1, overdueTasks: 1, completionRate: 33 },
  statusBreakdown: [{ name: 'Completed', value: 1 }, { name: 'In Progress', value: 1 }, { name: 'Pending', value: 0 }, { name: 'Overdue', value: 1 }],
  upcomingDeadlines: [{ _id: 't2', title: 'Write unit tests', priority: 'Medium', status: 'Pending', progress: 20, deadline: new Date(Date.now() + 5 * 86400000).toISOString() }],
  recentFeedback: [{ _id: 'f1', type: 'approval', message: 'Excellent work!', rating: 5, createdAt: new Date().toISOString(), task: { title: 'Landing page' }, admin: { name: 'Ayesha Khan' } }],
  trend: [{ period: '2026-10-01', assigned: 2, completed: 1 }, { period: '2026-10-08', assigned: 1, completed: 2 }],
  priorityBreakdown: [{ name: 'High', value: 2 }, { name: 'Low', value: 1 }],
  recentSubmissions: [{ _id: 's1', version: 1, status: 'pending', createdAt: new Date().toISOString(), task: { _id: 't1', title: 'Integrate REST API' } }],
  performanceHistory: [{ _id: 't9', title: 'Landing page', completedAt: new Date(Date.now() - 86400000).toISOString(), deadline: new Date(Date.now() + 86400000).toISOString(), priority: 'High' }],
  range: { groupBy: 'week' },
};

const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();
export const internTasks = [
  { _id: 't1', title: 'Integrate REST API', category: 'Development', priority: 'High', status: 'In Progress', progress: 40, deadline: iso(2), submissionStatus: 'none', attachments: [] },
  { _id: 't2', title: 'Write unit tests', category: 'QA', priority: 'Medium', status: 'Pending', progress: 0, deadline: iso(6), submissionStatus: 'none', attachments: [] },
  { _id: 't3', title: 'Landing page', category: 'Design', priority: 'Low', status: 'Completed', progress: 100, deadline: iso(-3), submissionStatus: 'approved', attachments: [] },
  { _id: 't4', title: 'Fix login bug', category: 'Development', priority: 'Critical', status: 'Overdue', progress: 20, deadline: iso(-1), submissionStatus: 'none', attachments: [] },
];
export const taskPage = (items = internTasks) => ({ success: true, items, pagination: { page: 1, pages: 1, total: items.length, limit: 10 } });
export const taskBoardOf = (items = internTasks) => ({ Pending: items.filter((t) => t.status === 'Pending'), 'In Progress': items.filter((t) => t.status === 'In Progress'), Completed: items.filter((t) => t.status === 'Completed'), Overdue: items.filter((t) => t.status === 'Overdue') });
export const taskDetail = (task = {}, submissions = [], feedback = []) => ({
  success: true, task: { ...internTasks[0], description: 'Connect the UI to the API', assignedBy: { name: 'Ayesha Khan' }, startDate: iso(-5), ...task }, submissions, feedback,
});
