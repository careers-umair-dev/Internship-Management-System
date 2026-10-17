import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderApp, internUser, internDash, internTasks, taskPage, taskBoardOf, taskDetail } from '../test/utils';
import { authService } from '../services/authService';
import { dashboardService } from '../services/dashboardService';
import { notificationService } from '../services/notificationService';
import { taskService } from '../services/taskService';
import { submissionService } from '../services/submissionService';
import { feedbackService } from '../services/feedbackService';
import { reportService } from '../services/reportService';
import { tokenStore } from '../services/api';

vi.mock('../services/authService', () => ({ authService: { me: vi.fn() } }));
vi.mock('../services/dashboardService', () => ({ dashboardService: { intern: vi.fn(), activity: vi.fn() } }));
vi.mock('../services/notificationService', () => ({ notificationService: { unreadCount: vi.fn(), list: vi.fn() } }));
vi.mock('../services/taskService', () => ({ taskService: { list: vi.fn(), board: vi.fn(), categories: vi.fn(), get: vi.fn(), updateProgress: vi.fn() } }));
vi.mock('../services/submissionService', () => ({ submissionService: { list: vi.fn(), create: vi.fn() } }));
vi.mock('../services/feedbackService', () => ({ feedbackService: { list: vi.fn() } }));
vi.mock('../services/reportService', () => ({ reportService: { tasksCSV: vi.fn(), progressCSV: vi.fn() } }));

const fb = (id, type, message, rating) => ({ _id: id, type, message, rating, createdAt: new Date().toISOString(), task: { _id: 't1', title: 'Integrate REST API' }, admin: { name: 'Ayesha Khan' } });

beforeEach(() => {
  vi.resetAllMocks();
  tokenStore.set('t');
  authService.me.mockResolvedValue(internUser);
  notificationService.unreadCount.mockResolvedValue(0);
  notificationService.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
  dashboardService.intern.mockResolvedValue(internDash);
  dashboardService.activity.mockResolvedValue({ items: [{ _id: 'a1', action: 'submission.created', description: 'You submitted work', createdAt: new Date().toISOString() }] });
  taskService.list.mockResolvedValue(taskPage());
  taskService.board.mockResolvedValue(taskBoardOf());
  taskService.categories.mockResolvedValue(['Design', 'Development', 'QA']);
  taskService.updateProgress.mockResolvedValue({ task: { ...internTasks[0], progress: 60 } });
  submissionService.list.mockResolvedValue({ items: [], pagination: { page: 1, pages: 1, total: 0, limit: 10 } });
  feedbackService.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
});
afterEach(() => tokenStore.clear?.());

describe('intern dashboard', () => {
  it('shows progress, trend, deadlines as links and recent submissions', async () => {
    renderApp('/intern/dashboard');
    expect(await screen.findByText(/welcome back, ali/i)).toBeInTheDocument();
    expect(await screen.findByRole('progressbar', { name: /overall progress/i })).toHaveAttribute('aria-valuenow', '62');
    expect(await screen.findByText('Progress over time')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /write unit tests/i })).toHaveAttribute('href', '/intern/tasks/t2');
    expect(await screen.findByText('Recent submissions')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /1 overdue task/i })).toHaveAttribute('href', '/intern/tasks?overdue=true');
  });
});

describe('my tasks', () => {
  it('lists tasks, filters by status via the API and clears filters', async () => {
    renderApp('/intern/tasks');
    expect(await screen.findByText('Integrate REST API')).toBeInTheDocument();
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Overdue');
    await waitFor(() => expect(taskService.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Overdue' })));
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('shows an empty state when the intern has no tasks', async () => {
    taskService.list.mockResolvedValue(taskPage([]));
    renderApp('/intern/tasks');
    expect(await screen.findByText(/no tasks assigned yet/i)).toBeInTheDocument();
  });

  it('opens the progress modal, saves a new value and refetches', async () => {
    renderApp('/intern/tasks');
    await userEvent.click(await screen.findByRole('button', { name: /update progress for integrate rest api/i }));
    const dialog = await screen.findByRole('dialog');
    const slider = within(dialog).getByLabelText(/completed so far/i);
    expect(slider).toHaveAttribute('max', '99');
    await userEvent.click(within(dialog).getByRole('button', { name: '75%' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /save progress/i }));
    await waitFor(() => expect(taskService.updateProgress).toHaveBeenCalledWith('t1', { progress: 75 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(taskService.list.mock.calls.length).toBeGreaterThan(1);
  });

  it('does not offer progress updates for completed tasks', async () => {
    renderApp('/intern/tasks');
    await screen.findByText('Landing page');
    expect(screen.queryByRole('button', { name: /update progress for landing page/i })).toBeNull();
  });

  it('board view groups tasks into status columns', async () => {
    renderApp('/intern/tasks?view=board');
    const inProgress = await screen.findByRole('region', { name: 'In Progress tasks' });
    expect(within(inProgress).getByText('Integrate REST API')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Overdue tasks' })).getByText('Fix login bug')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Completed tasks' })).queryByRole('button', { name: /update/i })).toBeNull();
  });

  it('exports CSV with the active filters', async () => {
    renderApp('/intern/tasks?priority=High');
    await screen.findByText('Integrate REST API');
    await userEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => expect(reportService.tasksCSV).toHaveBeenCalledWith(expect.objectContaining({ priority: 'High' })));
  });
});

describe('task detail', () => {
  const renderDetail = (data) => { taskService.get.mockResolvedValue(data); return renderApp('/intern/tasks/t1'); };

  it('submits work (description + link) as FormData and refetches', async () => {
    submissionService.create.mockResolvedValue({ submission: { _id: 's9' } });
    renderDetail(taskDetail());
    await screen.findByRole('heading', { name: 'Integrate REST API' });
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));
    expect(await screen.findByText(/add a description, a link or at least one file/i)).toBeInTheDocument();
    expect(submissionService.create).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('What did you do?'), 'Implemented the endpoints');
    await userEvent.type(screen.getByLabelText('External link'), 'https://github.com/x/y/pull/1');
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));
    await waitFor(() => expect(submissionService.create).toHaveBeenCalled());
    const fd = submissionService.create.mock.calls[0][0];
    expect(fd.get('task')).toBe('t1');
    expect(fd.get('description')).toBe('Implemented the endpoints');
    expect(fd.get('link')).toBe('https://github.com/x/y/pull/1');
    await waitFor(() => expect(taskService.get.mock.calls.length).toBeGreaterThan(1));
  });

  it('rejects an invalid link', async () => {
    renderDetail(taskDetail());
    await screen.findByRole('heading', { name: 'Integrate REST API' });
    await userEvent.type(screen.getByLabelText('External link'), 'ftp://nope');
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));
    expect(await screen.findByText(/valid link starting with http/i)).toBeInTheDocument();
    expect(submissionService.create).not.toHaveBeenCalled();
  });

  it('shows the revision banner, feedback, history and a v2 submit button', async () => {
    renderDetail(taskDetail({ submissionStatus: 'revision_requested' },
      [{ _id: 's1', version: 1, status: 'revision_requested', description: 'First try', createdAt: new Date().toISOString(), files: [] }],
      [fb('f1', 'revision', 'Please add error handling')]));
    expect(await screen.findByText('Revision requested', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Please add error handling')).toBeInTheDocument();
    expect(screen.getByText('First try')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit revision \(v2\)/i })).toBeInTheDocument();
  });

  it('hides the submit form while a submission is awaiting review', async () => {
    renderDetail(taskDetail({ submissionStatus: 'pending_review' }, [{ _id: 's1', version: 1, status: 'pending', createdAt: new Date().toISOString(), files: [] }]));
    expect(await screen.findByText('Awaiting review', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit for review/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /update progress/i })).toBeNull();
  });

  it('shows a completed banner and no actions for completed tasks', async () => {
    renderDetail(taskDetail({ status: 'Completed', progress: 100, submissionStatus: 'approved' }));
    expect(await screen.findByText('Task completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
  });

  it('starts a pending task', async () => {
    taskService.updateProgress.mockResolvedValue({ task: {} });
    renderDetail(taskDetail({ status: 'Pending', progress: 0 }));
    await userEvent.click(await screen.findByRole('button', { name: /start task/i }));
    await waitFor(() => expect(taskService.updateProgress).toHaveBeenCalledWith('t1', { status: 'In Progress' }));
  });

  it('shows an error state for a missing task', async () => {
    taskService.get.mockRejectedValue({ response: { status: 404, data: { message: 'Task not found' } } });
    renderApp('/intern/tasks/zzz');
    expect(await screen.findByText(/task not found/i)).toBeInTheDocument();
  });
});

describe('submissions page', () => {
  const rows = [
    { _id: 's1', version: 1, status: 'pending', createdAt: new Date().toISOString(), task: { _id: 't1', title: 'Integrate REST API', category: 'Development' } },
    { _id: 's2', version: 2, status: 'revision_requested', createdAt: new Date().toISOString(), task: { _id: 't2', title: 'Write unit tests', category: 'QA' } },
  ];
  it('lists submissions, filters via tabs and links revisions to the submit form', async () => {
    submissionService.list.mockResolvedValue({ items: rows, pagination: { page: 1, pages: 1, total: 2, limit: 10 } });
    renderApp('/intern/submissions');
    expect(await screen.findByText('Write unit tests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resubmit' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Approved' }));
    await waitFor(() => expect(submissionService.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'approved' })));
  });
  it('shows an empty state', async () => {
    renderApp('/intern/submissions');
    expect(await screen.findByText(/no submissions here/i)).toBeInTheDocument();
  });
});

describe('feedback page', () => {
  it('shows stats and filters by type', async () => {
    feedbackService.list.mockResolvedValue({ items: [fb('f1', 'approval', 'Excellent work!', 5), fb('f2', 'revision', 'Add tests please', 3)], pagination: { total: 2 } });
    renderApp('/intern/feedback');
    expect(await screen.findByText('Excellent work!')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Revisions' }));
    expect(screen.queryByText('Excellent work!')).toBeNull();
    expect(screen.getByText('Add tests please')).toBeInTheDocument();
  });
  it('shows an empty state', async () => {
    renderApp('/intern/feedback');
    expect(await screen.findByText(/no feedback to show/i)).toBeInTheDocument();
  });
});

describe('progress page', () => {
  it('renders charts, performance history and re-queries when the range changes', async () => {
    renderApp('/intern/progress');
    expect(await screen.findByText('Weekly and monthly activity')).toBeInTheDocument();
    expect(screen.getByText('On time')).toBeInTheDocument();
    expect(screen.getByText('You submitted work')).toBeInTheDocument();
    expect(dashboardService.intern).toHaveBeenLastCalledWith(expect.objectContaining({ groupBy: 'week' }));
    await userEvent.selectOptions(screen.getByLabelText('Date range'), '30');
    await waitFor(() => expect(dashboardService.intern.mock.calls.length).toBeGreaterThan(1));
  });
  it('exports CSV and prints', async () => {
    renderApp('/intern/progress');
    await screen.findByText('Weekly and monthly activity');
    await userEvent.click(screen.getByRole('button', { name: /export csv/i }));
    expect(reportService.progressCSV).toHaveBeenCalledWith('i1');
    await userEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(window.print).toHaveBeenCalled();
  });
});

describe('role isolation', () => {
  it('interns cannot open admin routes', async () => {
    renderApp('/admin/tasks');
    await waitFor(() => expect(screen.queryByText(/new task/i)).toBeNull());
    expect(await screen.findByText(/welcome back, ali/i)).toBeInTheDocument();
  });
});
