// Runs the real UI against a real API + database. Skipped unless E2E_API is set:
//   (start backend on a freshly seeded DB with CLIENT_URL=http://localhost:3000)
//   E2E_API=1 VITE_API_URL=http://localhost:5000/api npm test
import { screen, waitFor, configure, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/utils';
import { toDateTimeLocal } from '../utils/dates';
import { tokenStore } from '../services/api';
import { authService } from '../services/authService';

// Real network + bcrypt hashing make logins slower than mocked tests
configure({ asyncUtilTimeout: 5000 });

const run = process.env.E2E_API ? describe : describe.skip;

// Obtain a real session token directly from the API (the test setup clears storage between tests)
const startSession = async (email, password, role) => {
  const { token } = await authService.login(email, password, role);
  tokenStore.set(token);
};

const signIn = async (email, password, role = 'admin') => {
  if (role === 'intern') await userEvent.click(await screen.findByRole('tab', { name: /intern/i }));
  await userEvent.type(await screen.findByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/^password/i), password);
  await userEvent.click(screen.getByRole('button', { name: /^sign in as/i }));
};

run('UI against the real API', () => {
  it('rejects wrong credentials with the server message', async () => {
    renderApp('/login');
    await signIn('admin@internhub.com', 'WrongPass123');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(tokenStore.get()).toBeNull();
  });

  it('admin: signs in and sees real dashboard numbers', async () => {
    renderApp('/login');
    await signIn('admin@internhub.com', 'Admin@123');
    expect(await screen.findByRole('heading', { name: /welcome back, ayesha/i })).toBeInTheDocument();
    const card = async (label) => (await screen.findByText(label)).parentElement;
    await waitFor(async () => expect(await card('Total interns')).toHaveTextContent('4'));
    expect(await card('Total tasks')).toHaveTextContent('10');
    expect(await card('Completed tasks')).toHaveTextContent('3');
    expect(await card('Overdue tasks')).toHaveTextContent('2');
    expect((await screen.findAllByText(/ayesha khan logged in/i)).length).toBeGreaterThan(0); // recent activity from the real log
    expect(tokenStore.get()).toBeTruthy();
  });

  it('admin: restores a saved session and is redirected away from intern routes', async () => {
    await startSession('admin@internhub.com', 'Admin@123', 'admin');
    renderApp('/intern/dashboard');
    expect(await screen.findByRole('heading', { name: /welcome back, ayesha/i })).toBeInTheDocument();
  });

  it('admin: notification bell opens and lists real notifications', async () => {
    await startSession('admin@internhub.com', 'Admin@123', 'admin');
    renderApp('/admin/dashboard');
    await userEvent.click(await screen.findByLabelText(/^notifications/i));
    // seed: overdue tasks produce no notifications while the scheduler is off, so the empty state is expected
    expect(await screen.findByText(/you're all caught up/i)).toBeInTheDocument();
  });

  it('intern: sees their own notification and can mark it read', async () => {
    await startSession('ali@internhub.com', 'Intern@123', 'intern');
    renderApp('/intern/dashboard');
    const bell = await screen.findByLabelText(/notifications, \d+ unread/i);
    await userEvent.click(bell);
    expect(await screen.findByText('New feedback received')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /mark all read/i }));
    await waitFor(() => expect(screen.getByLabelText(/^notifications$/i)).toBeInTheDocument());
  });

  it('intern: signs in, sees personal progress, is kept out of admin routes, can sign out', async () => {
    tokenStore.clear();
    renderApp('/login');
    await signIn('ali@internhub.com', 'Intern@123', 'intern');
    expect(await screen.findByRole('heading', { name: /welcome back, ali/i })).toBeInTheDocument();
    expect(await screen.findByText('Assigned tasks')).toBeInTheDocument();
    expect(await screen.findByText('Excellent work! Clean layout and great responsiveness.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /overall progress/i })).toHaveAttribute('aria-valuenow');

    await userEvent.click(screen.getByLabelText('Account menu'));
    await userEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('intern: a revoked/invalid token ends the session with a warning', async () => {
    tokenStore.set('not-a-real-token');
    renderApp('/intern/dashboard');
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });
});

const API = (process.env.VITE_API_URL || 'http://127.0.0.1:5055/api').replace(/\/$/, '');
const rawCall = async (method, path, token, body) => {
  const res = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  return { status: res.status, json: await res.json() };
};
const statCard = async (label) => (await screen.findByText(label)).parentElement;

run('Admin pages against the real API', () => {
  it('interns: search narrows the real list', async () => {
    await startSession('admin@internhub.com', 'Admin@123', 'admin');
    renderApp('/admin/interns');
    expect(await screen.findByText('Ali Raza')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search interns'), 'sara');
    await waitFor(() => expect(screen.queryByText('Ali Raza')).not.toBeInTheDocument());
    expect(screen.getByText('Sara Ahmed')).toBeInTheDocument();
  });

  it('tasks: overdue filter and board view reflect real data', async () => {
    await startSession('admin@internhub.com', 'Admin@123', 'admin');
    renderApp('/admin/tasks?overdue=true');
    expect(await screen.findByText('Write API documentation')).toBeInTheDocument();
    expect(screen.getByText('Keyword research report')).toBeInTheDocument();
    expect(screen.queryByText('Build responsive landing page')).not.toBeInTheDocument();
  });

  it('tasks: board groups tasks into status columns', async () => {
    await startSession('admin@internhub.com', 'Admin@123', 'admin');
    renderApp('/admin/tasks?view=board');
    const overdue = await screen.findByRole('region', { name: 'Overdue tasks' });
    await waitFor(() => expect(within(overdue).getAllByRole('article')).toHaveLength(2));
    expect(within(screen.getByRole('region', { name: 'Completed tasks' })).getAllByRole('article')).toHaveLength(3);
  });

  it('dashboard: charts render with real data', async () => {
    await startSession('admin@internhub.com', 'Admin@123', 'admin');
    renderApp('/admin/dashboard');
    expect(await screen.findByText('Task completion trend')).toBeInTheDocument();
    expect(screen.getByText('Intern performance')).toBeInTheDocument();
    await waitFor(async () => expect(await statCard('Total tasks')).toHaveTextContent('10'));
  });

  it('full workflow through the UI: add intern -> assign task -> intern submits -> admin approves -> analytics update', async () => {
    await startSession('admin@internhub.com', 'Admin@123', 'admin');
    renderApp('/admin/interns');

    // 1. Add an intern
    await userEvent.click(await screen.findByRole('button', { name: /add intern/i }));
    let dialog = await screen.findByRole('dialog', { name: /add new intern/i });
    await userEvent.type(within(dialog).getByLabelText(/full name/i), 'E2E Intern');
    await userEvent.type(within(dialog).getByLabelText(/^email/i), 'e2e.intern@internhub.com');
    await userEvent.type(within(dialog).getByLabelText(/^department/i), 'QA');
    await userEvent.click(within(dialog).getByRole('button', { name: /^add intern$/i }));
    expect(await screen.findByText(/shown only once/i)).toBeInTheDocument();
    const tempPassword = screen.getByText(/^[a-f0-9]{10}A1$/).textContent;
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('E2E Intern')).toBeInTheDocument();

    // 2. Assign a task
    await userEvent.click(screen.getByRole('link', { name: 'Tasks' }));
    await screen.findByRole('heading', { name: 'Tasks' });
    await userEvent.click(await screen.findByRole('button', { name: /new task/i }));
    dialog = await screen.findByRole('dialog', { name: /create & assign task/i });
    await userEvent.type(within(dialog).getByLabelText(/^title/i), 'E2E real task');
    const option = await within(dialog).findByRole('option', { name: /E2E Intern/ });
    await userEvent.selectOptions(within(dialog).getByLabelText(/assign to/i), option);
    await userEvent.selectOptions(within(dialog).getByLabelText(/priority/i), 'High');
    fireEvent.change(within(dialog).getByLabelText(/^deadline/i), { target: { value: toDateTimeLocal(new Date(Date.now() + 3.5 * 86400000).toISOString()) } });
    await userEvent.click(within(dialog).getByRole('button', { name: /create task/i }));
    expect(await screen.findByText('Task created and assigned')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('E2E real task')).toBeInTheDocument();

    // 3. The intern (via API) logs in with the temporary password, works on and submits the task
    const login = await rawCall('POST', '/auth/login', null, { email: 'e2e.intern@internhub.com', password: tempPassword, role: 'intern' });
    expect(login.status).toBe(200);
    const internToken = login.json.token;
    const tasks = await rawCall('GET', '/tasks', internToken);
    expect(tasks.json.items).toHaveLength(1);
    const taskId = tasks.json.items[0]._id;
    expect((await rawCall('PATCH', `/tasks/${taskId}/progress`, internToken, { progress: 50 })).status).toBe(200);
    expect((await rawCall('POST', '/submissions', internToken, { task: taskId, description: 'All done', link: 'https://example.com/e2e' })).status).toBe(201);

    // 4. Admin reviews it in the UI and approves
    await userEvent.click(screen.getByRole('link', { name: 'Submissions' }));
    await screen.findByRole('heading', { name: 'Submissions' }); // wait for the route change (the old page may still be mounted)
    await userEvent.click(await screen.findByRole('button', { name: 'Review' }));
    expect(await screen.findByText('All done')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /approve/i }));
    await userEvent.type(screen.getByLabelText('Feedback'), 'Looks great');
    await userEvent.click(screen.getByRole('button', { name: /approve submission/i }));
    expect(await screen.findByText('Review outcome')).toBeInTheDocument();
    expect(await screen.findByText('Looks great')).toBeInTheDocument();

    // 5. The data is really updated
    const after = await rawCall('GET', `/tasks/${taskId}`, internToken);
    expect(after.json.task).toMatchObject({ status: 'Completed', progress: 100 });
    const notes = await rawCall('GET', '/notifications', internToken);
    expect(notes.json.items.map((n) => n.type)).toEqual(expect.arrayContaining(['task_assigned', 'task_completed']));

    // 6. Dashboard analytics reflect the new intern and completed task
    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    await screen.findByText('Task completion trend');
    await waitFor(async () => expect(await statCard('Total interns')).toHaveTextContent('5'));
    await waitFor(async () => expect(await statCard('Completed tasks')).toHaveTextContent('4'));
    expect(await statCard('Total tasks')).toHaveTextContent('11');
  });
});

run('Intern pages against the real API', () => {
  let adminToken; let aliId;
  const adminCall = (method, path, body) => rawCall(method, path, adminToken, body);

  const prepare = async () => {
    const login = await rawCall('POST', '/auth/login', null, { email: 'admin@internhub.com', password: 'Admin@123', role: 'admin' });
    adminToken = login.json.token;
    const interns = await adminCall('GET', '/interns?search=ali');
    aliId = interns.json.items.find((i) => i.email === 'ali@internhub.com')._id;
  };
  const newTask = async (title) => {
    const res = await adminCall('POST', '/tasks', { title, intern: aliId, deadline: new Date(Date.now() + 4 * 86400000).toISOString(), priority: 'High', category: 'E2E' });
    expect(res.status).toBe(201);
    return res.json.task._id;
  };

  it('intern: sees only their own tasks, can filter, switch to board and open a task', async () => {
    await prepare();
    await startSession('ali@internhub.com', 'Intern@123', 'intern');
    renderApp('/intern/tasks');
    await screen.findByRole('heading', { name: 'My tasks' });
    expect(await screen.findAllByRole('row')).not.toHaveLength(0);
    await waitFor(() => expect(screen.queryAllByText(/^(Sara|Hamza|Fatima)/)).toHaveLength(0));
    await userEvent.click(screen.getByRole('button', { name: /overdue only/i }));
    expect(await screen.findByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /^clear filters$/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /^board$/i }));
    expect(await screen.findByRole('region', { name: 'Pending tasks' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Overdue tasks' })).toBeInTheDocument();
  });

  it('intern: full loop - update progress, submit, mentor requests revision, resubmit, mentor approves', async () => {
    await prepare();
    const title = `Intern UI loop ${Date.now()}`;
    const taskId = await newTask(title);
    await startSession('ali@internhub.com', 'Intern@123', 'intern');

    // progress via the modal on the tasks page
    renderApp('/intern/tasks');
    await userEvent.type(await screen.findByLabelText('Search tasks'), title);
    await userEvent.click(await screen.findByRole('button', { name: `Update progress for ${title}` }));
    let dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '50%' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /save progress/i }));
    expect(await screen.findByText('Progress updated to 50%')).toBeInTheDocument();
    let t = await rawCall('GET', `/tasks/${taskId}`, (await rawCall('POST', '/auth/login', null, { email: 'ali@internhub.com', password: 'Intern@123', role: 'intern' })).json.token);
    expect(t.json.task).toMatchObject({ progress: 50, status: 'In Progress' });

    // open the task and submit work through the form
    await userEvent.click(await screen.findByText(title));
    await screen.findByRole('heading', { name: title });
    await userEvent.type(screen.getByLabelText('What did you do?'), 'First attempt');
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));
    expect(await screen.findByText('Work submitted for review')).toBeInTheDocument();
    expect(await screen.findByText('Awaiting review', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit for review/i })).toBeNull();

    // mentor requests a revision
    const subs = await adminCall('GET', `/submissions?task=${taskId}`);
    const review = await adminCall('PATCH', `/submissions/${subs.json.items[0]._id}/review`, { status: 'revision_requested', feedback: 'Please add more detail', rating: 3 });
    expect(review.status).toBe(200);

    // intern sees the revision banner + feedback after reloading the page, then resubmits v2
    renderApp('/intern/tasks/' + taskId);
    expect(await screen.findByText('Revision requested', { selector: 'p' })).toBeInTheDocument();
    expect(await screen.findByText('Please add more detail')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('What did you do?'), 'Second attempt with more detail');
    await userEvent.click(screen.getByRole('button', { name: /submit revision \(v2\)/i }));
    expect(await screen.findByText('Work submitted for review')).toBeInTheDocument();
    expect(await screen.findByText('Version 2')).toBeInTheDocument();

    // mentor approves; task completes
    const subs2 = await adminCall('GET', `/submissions?task=${taskId}&status=pending`);
    expect((await adminCall('PATCH', `/submissions/${subs2.json.items[0]._id}/review`, { status: 'approved', feedback: 'Well done', rating: 5 })).status).toBe(200);
    t = await adminCall('GET', `/tasks/${taskId}`);
    expect(t.json.task).toMatchObject({ status: 'Completed', progress: 100 });
  });

  it('intern: submissions, feedback and progress pages show real data', async () => {
    await startSession('ali@internhub.com', 'Intern@123', 'intern');
    renderApp('/intern/submissions');
    await screen.findByRole('heading', { name: 'Submissions' });
    expect((await screen.findAllByRole('button', { name: /^(View|Resubmit)$/ })).length).toBeGreaterThan(0);
  });

  it('intern: feedback page lists real feedback', async () => {
    await startSession('ali@internhub.com', 'Intern@123', 'intern');
    renderApp('/intern/feedback');
    expect(await screen.findByText('Excellent work! Clean layout and great responsiveness.')).toBeInTheDocument();
  });

  it('intern: progress page renders charts and history', async () => {
    await startSession('ali@internhub.com', 'Intern@123', 'intern');
    renderApp('/intern/progress');
    expect(await screen.findByText('Weekly and monthly activity')).toBeInTheDocument();
    expect(await screen.findByText('Performance history')).toBeInTheDocument();
    expect(await screen.findByRole('progressbar', { name: /overall progress/i })).toHaveAttribute('aria-valuenow');
    expect(await screen.findByText('Activity timeline')).toBeInTheDocument();
  });

  it('intern: cannot open another intern\'s task', async () => {
    await prepare();
    const interns = await adminCall('GET', '/interns?search=sara');
    const sara = interns.json.items.find((i) => i.email === 'sara@internhub.com')._id;
    const res = await adminCall('POST', '/tasks', { title: 'Sara only task', intern: sara, deadline: new Date(Date.now() + 86400000 * 3).toISOString() });
    await startSession('ali@internhub.com', 'Intern@123', 'intern');
    renderApp(`/intern/tasks/${res.json.task._id}`);
    expect(await screen.findByText(/task not found/i)).toBeInTheDocument();
  });
});
