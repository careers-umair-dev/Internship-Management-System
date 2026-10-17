import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderApp, adminUser, adminDash } from '../test/utils';
import { authService } from '../services/authService';
import { dashboardService } from '../services/dashboardService';
import { notificationService } from '../services/notificationService';
import { internService } from '../services/internService';
import { taskService } from '../services/taskService';
import { submissionService } from '../services/submissionService';
import { feedbackService } from '../services/feedbackService';
import { reportService } from '../services/reportService';
import { tokenStore } from '../services/api';

vi.mock('../services/authService', () => ({ authService: { me: vi.fn() } }));
vi.mock('../services/dashboardService', () => ({ dashboardService: { admin: vi.fn(), internPerformance: vi.fn() } }));
vi.mock('../services/notificationService', () => ({ notificationService: { unreadCount: vi.fn(), list: vi.fn() } }));
vi.mock('../services/internService', () => ({ internService: { list: vi.fn(), departments: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), get: vi.fn() } }));
vi.mock('../services/taskService', () => ({ taskService: { list: vi.fn(), board: vi.fn(), categories: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), changeStatus: vi.fn(), remove: vi.fn() } }));
vi.mock('../services/submissionService', () => ({ submissionService: { list: vi.fn(), get: vi.fn(), review: vi.fn() } }));
vi.mock('../services/feedbackService', () => ({ feedbackService: { list: vi.fn(), create: vi.fn() } }));
vi.mock('../services/reportService', () => ({ reportService: { internsCSV: vi.fn(), tasksCSV: vi.fn(), progressCSV: vi.fn(), progress: vi.fn() } }));

const day = 86400000;
const pg = (total) => ({ total, page: 1, limit: 10, pages: 1 });
const ali = { _id: 'i1', name: 'Ali Raza', email: 'ali@internhub.com', department: 'Engineering', position: 'Frontend Intern', status: 'active', overallProgress: 60, joiningDate: new Date().toISOString(), taskCounts: { total: 3, completed: 1, overdue: 1 }, skills: ['React'] };
const sara = { ...ali, _id: 'i2', name: 'Sara Ahmed', email: 'sara@internhub.com', department: 'Design', status: 'inactive', overallProgress: 20, taskCounts: { total: 2, completed: 0, overdue: 0 } };
const task = { _id: 't1', title: 'Integrate REST API', category: 'Development', priority: 'Critical', status: 'In Progress', progress: 40, startDate: new Date().toISOString(), deadline: new Date(Date.now() + 2 * day).toISOString(), intern: ali, attachments: [], submissionStatus: 'none' };
const lateTask = { ...task, _id: 't2', title: 'Write docs', status: 'Overdue', priority: 'Low', deadline: new Date(Date.now() - 3 * day).toISOString() };
const submission = { _id: 's1', version: 1, status: 'pending', description: 'Done, please check', link: 'https://example.com/pr/1', files: [{ name: 'report.pdf', url: '/uploads/r.pdf', size: 2048 }], createdAt: new Date().toISOString(), intern: ali, task: { _id: 't1', title: 'Integrate REST API', priority: 'Critical', deadline: task.deadline, status: 'In Progress', category: 'Development' } };

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.set('t');
  authService.me.mockResolvedValue(adminUser);
  notificationService.unreadCount.mockResolvedValue(0);
  notificationService.list.mockResolvedValue({ items: [], unreadCount: 0 });
  dashboardService.admin.mockResolvedValue(adminDash);
  dashboardService.internPerformance.mockResolvedValue({ intern: ali, cards: { overallProgress: 60, assignedTasks: 3, completedTasks: 1, overdueTasks: 1 }, trend: adminDash.trend, statusBreakdown: adminDash.statusBreakdown });
  internService.list.mockResolvedValue({ items: [ali, sara], pagination: pg(2) });
  internService.departments.mockResolvedValue(['Design', 'Engineering']);
  taskService.list.mockResolvedValue({ items: [task, lateTask], pagination: pg(2) });
  taskService.board.mockResolvedValue({ Pending: [], 'In Progress': [task], Completed: [], Overdue: [lateTask] });
  taskService.categories.mockResolvedValue(['Development', 'Docs']);
  submissionService.list.mockResolvedValue({ items: [submission], pagination: pg(1) });
  submissionService.get.mockResolvedValue({ submission, feedback: [] });
});

describe('dashboard', () => {
  it('renders charts sections and re-queries when the date range changes', async () => {
    renderApp('/admin/dashboard');
    expect(await screen.findByText('Task completion trend')).toBeInTheDocument();
    ['Completed vs pending', 'Intern performance', 'Tasks by priority', 'Individual intern performance'].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
    await waitFor(() => expect(dashboardService.admin).toHaveBeenLastCalledWith(expect.not.objectContaining({ from: expect.anything() })));

    await userEvent.selectOptions(screen.getByLabelText('Date range'), '30');
    await waitFor(() => expect(dashboardService.admin).toHaveBeenLastCalledWith(expect.objectContaining({ from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), to: expect.any(String) })));

    await userEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    await waitFor(() => expect(dashboardService.admin).toHaveBeenLastCalledWith(expect.objectContaining({ groupBy: 'week' })));
  });

  it('waits for both dates before applying a custom range', async () => {
    renderApp('/admin/dashboard');
    await screen.findByText('Task completion trend');
    const calls = dashboardService.admin.mock.calls.length;
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'custom');
    expect(screen.getByText(/choose a start and end date/i)).toBeInTheDocument();
    expect(dashboardService.admin.mock.calls.length).toBe(calls);
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-09-30' } });
    await waitFor(() => expect(dashboardService.admin).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-09-01', to: '2026-09-30' })));
  });

  it('shows an individual intern performance panel', async () => {
    renderApp('/admin/dashboard');
    await screen.findByText('Individual intern performance');
    await userEvent.selectOptions(await screen.findByLabelText('Select intern'), 'i1');
    expect(await screen.findByRole('link', { name: 'Ali Raza' })).toHaveAttribute('href', '/admin/interns/i1');
    expect(dashboardService.internPerformance).toHaveBeenCalledWith('i1', expect.any(Object));
  });
});

describe('interns page', () => {
  it('lists interns with progress and overdue counts', async () => {
    renderApp('/admin/interns');
    expect(await screen.findByText('Ali Raza')).toBeInTheDocument();
    expect(screen.getByText('Sara Ahmed')).toBeInTheDocument();
    expect(screen.getByText('1 overdue')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('1-2');
  });

  it('debounces search and applies filters through the URL', async () => {
    renderApp('/admin/interns');
    await screen.findByText('Ali Raza');
    await userEvent.type(screen.getByLabelText('Search interns'), 'sara');
    await waitFor(() => expect(internService.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'sara', page: 1 })));
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'inactive');
    await waitFor(() => expect(internService.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'inactive', search: 'sara' })));
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(internService.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: '', status: '' })));
  });

  it('sorts when a sortable header is clicked', async () => {
    renderApp('/admin/interns');
    await screen.findByText('Ali Raza');
    await userEvent.click(screen.getByRole('button', { name: /progress/i }));
    await waitFor(() => expect(internService.list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'overallProgress:asc' })));
    await userEvent.click(screen.getByRole('button', { name: /progress/i }));
    await waitFor(() => expect(internService.list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'overallProgress:desc' })));
  });

  it('validates the add-intern form, creates the intern and reveals the temporary password once', async () => {
    internService.create.mockResolvedValue({ intern: { ...ali, _id: 'i9', email: 'zed@internhub.com' }, temporaryPassword: 'abc123XYZ9A1' });
    renderApp('/admin/interns');
    await userEvent.click(await screen.findByRole('button', { name: /add intern/i }));
    const dialog = await screen.findByRole('dialog', { name: /add new intern/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /^add intern$/i }));
    expect(await within(dialog).findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(within(dialog).getByText('Email is required')).toBeInTheDocument();
    expect(internService.create).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/full name/i), 'Zed Khan');
    await userEvent.type(within(dialog).getByLabelText(/^email/i), 'zed@internhub.com');
    await userEvent.type(within(dialog).getByLabelText(/^skills/i), 'Node{Enter}');
    await userEvent.click(within(dialog).getByRole('button', { name: /^add intern$/i }));

    await waitFor(() => expect(internService.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Zed Khan', email: 'zed@internhub.com', skills: ['Node'], durationMonths: 3 })));
    expect(internService.create.mock.calls[0][0]).not.toHaveProperty('password');
    expect(await screen.findByText('abc123XYZ9A1')).toBeInTheDocument();
    expect(screen.getByText(/shown only once/i)).toBeInTheDocument();
  });

  it('maps server validation errors onto the form fields', async () => {
    internService.create.mockRejectedValue({ response: { status: 409, data: { message: 'A record with this email already exists' } } });
    renderApp('/admin/interns');
    await userEvent.click(await screen.findByRole('button', { name: /add intern/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/full name/i), 'Dup User');
    await userEvent.type(within(dialog).getByLabelText(/^email/i), 'ali@internhub.com');
    await userEvent.click(within(dialog).getByRole('button', { name: /^add intern$/i }));
    expect(await within(dialog).findByText('A record with this email already exists')).toBeInTheDocument();
  });

  it('deactivates an intern after confirmation', async () => {
    internService.remove.mockResolvedValue({});
    renderApp('/admin/interns');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Ali Raza' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog', { name: /deactivate intern/i });
    expect(dialog).toHaveTextContent(/no longer be able to sign in/i);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(internService.remove).toHaveBeenCalledWith('i1', false));
  });

  it('requires an explicit confirmation for permanent deletion', async () => {
    internService.remove.mockResolvedValue({});
    renderApp('/admin/interns');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Sara Ahmed' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /delete permanently/i }));
    const dialog = await screen.findByRole('dialog', { name: /delete permanently/i });
    expect(dialog).toHaveTextContent(/cannot be undone/i);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(internService.remove).not.toHaveBeenCalled();
  });

  it('offers reactivation for inactive interns and blocks task assignment', async () => {
    internService.update.mockResolvedValue({});
    renderApp('/admin/interns');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Sara Ahmed' }));
    expect(screen.getByRole('menuitem', { name: 'Assign task' })).toBeDisabled();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Reactivate' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reactivate' }));
    await waitFor(() => expect(internService.update).toHaveBeenCalledWith('i2', { status: 'active' }));
  });

  it('shows a filtered empty state with a way back', async () => {
    internService.list.mockResolvedValue({ items: [], pagination: pg(0) });
    renderApp('/admin/interns?search=zzz');
    expect(await screen.findByText('No interns match your filters')).toBeInTheDocument();
  });

  it('exports CSV', async () => {
    renderApp('/admin/interns');
    await userEvent.click(await screen.findByRole('button', { name: /export csv/i }));
    expect(reportService.internsCSV).toHaveBeenCalled();
  });
});

describe('tasks page', () => {
  it('renders the table, highlights overdue work and applies filters', async () => {
    renderApp('/admin/tasks');
    expect(await screen.findByText('Integrate REST API')).toBeInTheDocument();
    expect(screen.getByText('Write docs').closest('tr')).toHaveClass('bg-danger/[0.04]');
    expect(screen.getByText(/Overdue by 3 days/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'Critical');
    await waitFor(() => expect(taskService.list).toHaveBeenLastCalledWith(expect.objectContaining({ priority: 'Critical' })));
    await userEvent.click(screen.getByRole('button', { name: /overdue only/i }));
    await waitFor(() => expect(taskService.list).toHaveBeenLastCalledWith(expect.objectContaining({ overdue: 'true', priority: 'Critical' })));
    fireEvent.change(screen.getByLabelText('Deadline from'), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(taskService.list).toHaveBeenLastCalledWith(expect.objectContaining({ deadlineFrom: '2026-10-01' })));
  });

  it('sorts by priority using the API sort key', async () => {
    renderApp('/admin/tasks');
    await screen.findByText('Integrate REST API');
    await userEvent.click(screen.getByRole('button', { name: /priority/i }));
    await waitFor(() => expect(taskService.list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'priority:asc' })));
  });

  it('switches to the board and drag-drops a card to change its status', async () => {
    taskService.changeStatus.mockResolvedValue({});
    renderApp('/admin/tasks');
    await screen.findByText('Integrate REST API');
    await userEvent.click(screen.getByRole('button', { name: /board/i }));
    const card = (await screen.findByText('Integrate REST API')).closest('article');
    ['Pending', 'In Progress', 'Completed', 'Overdue'].forEach((s) => expect(screen.getByRole('region', { name: `${s} tasks` })).toBeInTheDocument());

    const store = {};
    const dataTransfer = { setData: (k, v) => { store[k] = v; }, getData: (k) => store[k], effectAllowed: '' };
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(screen.getByRole('region', { name: 'Completed tasks' }), { dataTransfer });
    await waitFor(() => expect(taskService.changeStatus).toHaveBeenCalledWith('t1', 'Completed'));
  });

  it('surfaces the server message when a board move is rejected', async () => {
    taskService.changeStatus.mockRejectedValue({ response: { data: { message: 'The deadline has passed. Extend the deadline first.' } } });
    renderApp('/admin/tasks?view=board');
    const card = (await screen.findByText('Write docs')).closest('article');
    const store = {};
    const dataTransfer = { setData: (k, v) => { store[k] = v; }, getData: (k) => store[k], effectAllowed: '' };
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(screen.getByRole('region', { name: 'In Progress tasks' }), { dataTransfer });
    expect(await screen.findByText(/deadline has passed/i)).toBeInTheDocument();
  });

  it('validates and submits the new-task form as multipart data', async () => {
    taskService.create.mockResolvedValue({ task });
    renderApp('/admin/tasks');
    await userEvent.click(await screen.findByRole('button', { name: /new task/i }));
    const dialog = await screen.findByRole('dialog', { name: /create & assign task/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /create task/i }));
    expect(await within(dialog).findByText('Title must be at least 3 characters')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Select an intern').some((el) => el.getAttribute('role') === 'alert')).toBe(true);
    expect(within(dialog).getByText('Deadline is required')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText(/^title/i), 'Ship the release');
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Ali Raza/ })).toBeInTheDocument());
    await userEvent.selectOptions(within(dialog).getByLabelText(/assign to/i), 'i1');
    await userEvent.selectOptions(within(dialog).getByLabelText(/priority/i), 'High');
    fireEvent.change(within(dialog).getByLabelText(/^deadline/i), { target: { value: '2030-05-01T10:00' } });
    const file = new File(['spec'], 'spec.txt', { type: 'text/plain' });
    await userEvent.upload(within(dialog).getByLabelText('Attach files'), file);
    expect(within(dialog).getByText('spec.txt')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /create task/i }));

    await waitFor(() => expect(taskService.create).toHaveBeenCalled());
    const fd = taskService.create.mock.calls[0][0];
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('title')).toBe('Ship the release');
    expect(fd.get('intern')).toBe('i1');
    expect(fd.get('priority')).toBe('High');
    expect(new Date(fd.get('deadline')).getFullYear()).toBe(2030);
    expect(fd.getAll('attachments')).toHaveLength(1);
  });

  it('rejects a deadline before the start date', async () => {
    renderApp('/admin/tasks');
    await userEvent.click(await screen.findByRole('button', { name: /new task/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/start date/i), { target: { value: '2030-06-10' } });
    fireEvent.change(within(dialog).getByLabelText(/^deadline/i), { target: { value: '2030-06-01T09:00' } });
    await userEvent.click(within(dialog).getByRole('button', { name: /create task/i }));
    expect(await within(dialog).findByText('Deadline cannot be before the start date')).toBeInTheDocument();
    expect(taskService.create).not.toHaveBeenCalled();
  });

  it('deletes a task after confirmation', async () => {
    taskService.remove.mockResolvedValue({});
    renderApp('/admin/tasks');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Integrate REST API' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: /delete task/i })).getByRole('button', { name: /delete task/i }));
    await waitFor(() => expect(taskService.remove).toHaveBeenCalledWith('t1'));
  });
});

describe('task detail', () => {
  const detail = { task: { ...task, description: 'Wire the dashboard to the API', assignedBy: { name: 'Ayesha Khan' }, createdAt: new Date().toISOString(), submissionStatus: 'pending_review' },
    submissions: [{ ...submission, status: 'pending' }], feedback: [{ _id: 'f1', type: 'revision', message: 'Add tests', rating: 3, createdAt: new Date().toISOString(), admin: { name: 'Ayesha Khan' } }] };

  it('shows details, submission history and feedback, and sends new feedback', async () => {
    taskService.get.mockResolvedValue(detail);
    feedbackService.create.mockResolvedValue({});
    renderApp('/admin/tasks/t1');
    expect(await screen.findByRole('heading', { name: 'Integrate REST API' })).toBeInTheDocument();
    expect(screen.getByText('Wire the dashboard to the API')).toBeInTheDocument();
    expect(screen.getByText('Awaiting review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review submission/i })).toBeInTheDocument();
    expect(screen.getByText('Add tests')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(await screen.findByText('Write some feedback first')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Add feedback'), 'Nice progress');
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    await waitFor(() => expect(feedbackService.create).toHaveBeenCalledWith({ task: 't1', message: 'Nice progress', rating: 4 }));
  });

  it('changes the task status from the menu', async () => {
    taskService.get.mockResolvedValue(detail);
    taskService.changeStatus.mockResolvedValue({});
    renderApp('/admin/tasks/t1');
    await userEvent.click(await screen.findByRole('button', { name: /change status/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Completed' }));
    await waitFor(() => expect(taskService.changeStatus).toHaveBeenCalledWith('t1', 'Completed'));
  });

  it('shows an error state for a task that does not exist', async () => {
    taskService.get.mockRejectedValue({ response: { status: 404, data: { message: 'Task not found' } } });
    renderApp('/admin/tasks/nope');
    expect(await screen.findByText('Task not found')).toBeInTheDocument();
  });
});

describe('submissions', () => {
  it('defaults to submissions awaiting review and switches tabs', async () => {
    renderApp('/admin/submissions');
    expect(await screen.findByText('Integrate REST API')).toBeInTheDocument();
    expect(submissionService.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' }));
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'All' }));
    await waitFor(() => expect(submissionService.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: '' })));
    await userEvent.click(screen.getByRole('tab', { name: 'Approved' }));
    await waitFor(() => expect(submissionService.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'approved' })));
  });

  it('review: requires a decision and feedback for revisions', async () => {
    submissionService.review.mockResolvedValue({});
    renderApp('/admin/submissions/s1');
    expect(await screen.findByText('Done, please check')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /example.com\/pr\/1/ })).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText('report.pdf')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /submit review/i }));
    expect(await screen.findByText('Choose a decision')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /request revision/i }));
    await userEvent.click(screen.getByRole('button', { name: /request revision/i, hidden: false }));
    expect(await screen.findByText(/feedback is required when rejecting/i)).toBeInTheDocument();
    expect(submissionService.review).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Feedback'), 'Please add unit tests');
    await userEvent.click(screen.getByRole('radio', { name: '3 stars' }));
    submissionService.get.mockResolvedValue({ submission: { ...submission, status: 'revision_requested', reviewedBy: { name: 'Ayesha Khan' }, reviewedAt: new Date().toISOString() }, feedback: [] });
    await userEvent.click(screen.getAllByRole('button', { name: /request revision/i }).pop());
    await waitFor(() => expect(submissionService.review).toHaveBeenCalledWith('s1', { status: 'revision_requested', feedback: 'Please add unit tests', rating: 3 }));
    expect(await screen.findByText('Review outcome')).toBeInTheDocument();
  });

  it('review: approval needs no feedback', async () => {
    submissionService.review.mockResolvedValue({});
    renderApp('/admin/submissions/s1');
    await userEvent.click(await screen.findByRole('radio', { name: /approve/i }));
    await userEvent.click(screen.getByRole('button', { name: /approve submission/i }));
    await waitFor(() => expect(submissionService.review).toHaveBeenCalledWith('s1', { status: 'approved' }));
  });

  it('already reviewed submissions are read-only', async () => {
    submissionService.get.mockResolvedValue({ submission: { ...submission, status: 'approved', reviewedBy: { name: 'Ayesha Khan' }, reviewedAt: new Date().toISOString() }, feedback: [{ _id: 'f9', type: 'approval', message: 'Great job', createdAt: new Date().toISOString(), admin: { name: 'Ayesha Khan' } }] });
    renderApp('/admin/submissions/s1');
    expect(await screen.findByText('Review outcome')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByText('Great job')).toBeInTheDocument();
  });
});

describe('reports', () => {
  it('downloads exports with the selected filters', async () => {
    renderApp('/admin/reports');
    await userEvent.click(await screen.findByRole('button', { name: /download csv/i }));
    expect(reportService.internsCSV).toHaveBeenCalled();
    await userEvent.selectOptions(screen.getAllByLabelText('Priority')[0], 'High');
    await userEvent.click(screen.getByRole('button', { name: /download tasks csv/i }));
    expect(reportService.tasksCSV).toHaveBeenCalledWith(expect.objectContaining({ priority: 'High' }));
  });

  it('previews and prints an intern progress report', async () => {
    reportService.progress.mockResolvedValue({ generatedAt: new Date().toISOString(), intern: { ...ali, mentor: { name: 'Ayesha Khan' } }, stats: { total: 3, completed: 1, inProgress: 1, overdue: 1 }, submissionCount: 2, tasks: [task, lateTask], feedback: [] });
    renderApp('/admin/reports?intern=i1');
    expect(await screen.findByText('Progress report preview')).toBeInTheDocument();
    expect(reportService.progress).toHaveBeenCalledWith('i1');
    expect(screen.getByText('Write docs')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(window.print).toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole('button', { name: /download csv/i }).pop());
    expect(reportService.progressCSV).toHaveBeenCalledWith('i1');
  });
});

describe('intern profile', () => {
  it('shows the profile, stats and tabs', async () => {
    internService.get.mockResolvedValue({ intern: { ...ali, mentor: { name: 'Ayesha Khan' }, durationMonths: 3, internshipEndDate: new Date().toISOString(), phone: '+92 300 1234567' }, stats: { total: 3, completed: 1, pending: 1, inProgress: 0, overdue: 1, completionRate: 33 }, submissionCount: 2, feedbackCount: 1, recentActivity: [{ _id: 'a1', description: 'Ayesha assigned a task', createdAt: new Date().toISOString() }] });
    feedbackService.list.mockResolvedValue({ items: [], pagination: pg(0) });
    renderApp('/admin/interns/i1');
    expect(await screen.findByRole('heading', { name: 'Ali Raza' })).toBeInTheDocument();
    expect(screen.getByText('Mentor: Ayesha Khan')).toBeInTheDocument();
    expect(screen.getByText('33% completion rate')).toBeInTheDocument();
    expect(screen.getByText('Ayesha assigned a task')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /task history/i }));
    expect(await screen.findByText('Write docs')).toBeInTheDocument();
    expect(taskService.list).toHaveBeenCalledWith(expect.objectContaining({ intern: 'i1' }));
    await userEvent.click(screen.getByRole('tab', { name: /feedback/i }));
    expect(await screen.findByText('No feedback yet')).toBeInTheDocument();
  });
});
