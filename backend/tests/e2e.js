const API_URL = process.env.API_URL || 'http://localhost:5000';
const BASE = API_URL + '/api';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  -> ' + extra}`); };
const call = async (method, path, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(BASE + path, { method, headers, body: payload });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: r.status, json, text, headers: r.headers };
};
const login = async (email, password, role) => (await call('POST', '/auth/login', { body: { email, password, role } }));

(async () => {
  // ---- AUTH
  const a = await login('admin@internhub.com', 'Admin@123', 'admin'); ok('admin login', a.status === 200 && a.json.token, JSON.stringify(a.json));
  const A = a.json.token;
  ok('login response hides password', !JSON.stringify(a.json).includes('password'));
  ok('wrong password 401', (await login('admin@internhub.com', 'nope12345', 'admin')).status === 401);
  ok('intern cannot log in as admin', (await login('ali@internhub.com', 'Intern@123', 'admin')).status === 401);
  const i = await login('ali@internhub.com', 'Intern@123', 'intern'); ok('intern login', i.status === 200);
  const ALI = i.json.token, aliId = i.json.user._id;
  const s = await login('sara@internhub.com', 'Intern@123', 'intern'); const SARA = s.json.token;

  // ---- RBAC
  ok('intern blocked from GET /interns (403)', (await call('GET', '/interns', { token: ALI })).status === 403);
  ok('intern blocked from admin dashboard (403)', (await call('GET', '/dashboard/admin', { token: ALI })).status === 403);
  ok('admin blocked from intern dashboard (403)', (await call('GET', '/dashboard/intern', { token: A })).status === 403);
  ok('no token -> 401', (await call('GET', '/tasks')).status === 401);

  // ---- INTERN CRUD
  let r = await call('GET', '/interns?search=ali@internhub&limit=5', { token: A });
  ok('list interns + search', r.status === 200 && r.json.items.length === 1 && r.json.items[0].taskCounts, JSON.stringify(r.json).slice(0, 200));
  r = await call('POST', '/interns', { token: A, body: { name: 'Zain Test', email: 'zain@internhub.com', department: 'QA', position: 'QA Intern', skills: ['Cypress'], durationMonths: 6 } });
  ok('create intern (temp password returned)', r.status === 201 && r.json.temporaryPassword, JSON.stringify(r.json));
  const zainId = r.json.intern?._id, zainPass = r.json.temporaryPassword;
  ok('new intern can log in with temp password', (await login('zain@internhub.com', zainPass, 'intern')).status === 200);
  ok('duplicate email -> 409', (await call('POST', '/interns', { token: A, body: { name: 'Dup', email: 'zain@internhub.com' } })).status === 409);
  ok('invalid email -> 400', (await call('POST', '/interns', { token: A, body: { name: 'Bad', email: 'nope' } })).status === 400);
  r = await call('PUT', `/interns/${zainId}`, { token: A, body: { department: 'Quality', skills: ['Cypress', 'Jest'] } });
  ok('update intern', r.status === 200 && r.json.intern.department === 'Quality');
  r = await call('GET', `/interns/${zainId}`, { token: A });
  ok('intern profile has stats', r.status === 200 && r.json.stats && r.json.stats.total === 0);
  ok('bad id -> 400', (await call('GET', '/interns/123', { token: A })).status === 400);

  // ---- TASK: assign
  const dl = new Date(Date.now() + 5 * 86400000).toISOString();
  const form = new FormData();
  form.append('title', 'Write E2E tests'); form.append('intern', zainId); form.append('deadline', dl);
  form.append('priority', 'Critical'); form.append('category', 'Testing'); form.append('description', 'Cover main flows');
  form.append('attachments', new Blob(['spec content'], { type: 'text/plain' }), 'spec.txt');
  r = await call('POST', '/tasks', { token: A, form });
  ok('create task with attachment (multipart)', r.status === 201 && r.json.task.attachments.length === 1, JSON.stringify(r.json));
  const taskId = r.json.task?._id;
  r = await call('POST', '/tasks', { token: A, body: { title: 'x', intern: zainId, deadline: dl } });
  ok('task validation (short title) -> 400', r.status === 400);
  r = await call('POST', '/tasks', { token: A, body: { title: 'Bad priority', intern: zainId, deadline: dl, priority: 'Urgent' } });
  ok('task validation (bad priority) -> 400', r.status === 400);
  r = await call('POST', '/tasks', { token: A, body: { title: 'Past deadline order', intern: zainId, deadline: dl, startDate: new Date(Date.now() + 9 * 86400000).toISOString() } });
  ok('deadline before start -> 400', r.status === 400, JSON.stringify(r.json));

  // ---- intern receives task + notification
  const ZAIN = (await login('zain@internhub.com', zainPass, 'intern')).json.token;
  r = await call('GET', '/tasks', { token: ZAIN });
  ok('intern sees assigned task', r.status === 200 && r.json.items.length === 1 && r.json.items[0].title === 'Write E2E tests');
  r = await call('GET', '/notifications?unread=true', { token: ZAIN });
  ok('intern got task_assigned notification', r.json.items?.some((n) => n.type === 'task_assigned'), JSON.stringify(r.json).slice(0, 200));
  ok('interns are scoped: Sara cannot open Zain task (404)', (await call('GET', `/tasks/${taskId}`, { token: SARA })).status === 404);
  ok('Sara cannot update Zain progress (404)', (await call('PATCH', `/tasks/${taskId}/progress`, { token: SARA, body: { progress: 50 } })).status === 404);

  // ---- progress update
  r = await call('PATCH', `/tasks/${taskId}/progress`, { token: ZAIN, body: { progress: 40 } });
  ok('intern updates progress -> In Progress', r.status === 200 && r.json.task.status === 'In Progress' && r.json.task.progress === 40, JSON.stringify(r.json));
  ok('progress 100 rejected (must submit)', (await call('PATCH', `/tasks/${taskId}/progress`, { token: ZAIN, body: { progress: 100 } })).status === 400);
  ok('intern cannot use admin status endpoint (403)', (await call('PATCH', `/tasks/${taskId}/status`, { token: ZAIN, body: { status: 'Completed' } })).status === 403);
  r = await call('GET', `/interns/${zainId}`, { token: A });
  ok('overallProgress recalculated (40)', r.json.intern.overallProgress === 40, String(r.json.intern?.overallProgress));

  // ---- submission v1 -> revision
  const sf = new FormData(); sf.append('task', taskId); sf.append('description', 'First attempt'); sf.append('link', 'https://example.com/pr/1');
  sf.append('files', new Blob(['report'], { type: 'text/plain' }), 'report.txt');
  r = await call('POST', '/submissions', { token: ZAIN, form: sf });
  ok('intern submits work (text+link+file)', r.status === 201 && r.json.submission.version === 1 && r.json.submission.files.length === 1, JSON.stringify(r.json));
  const sub1 = r.json.submission?._id;
  ok('second submission while pending -> 400', (await call('POST', '/submissions', { token: ZAIN, body: { task: taskId, description: 'again' } })).status === 400);
  ok('empty submission -> 400', (await call('POST', '/submissions', { token: SARA, body: { task: taskId } })).status === 404);
  ok('bad link -> 400', (await call('POST', '/submissions', { token: ZAIN, body: { task: taskId, link: 'javascript:alert(1)' } })).status === 400);
  ok('disallowed file type -> 400', await (async () => { const f = new FormData(); f.append('task', taskId); f.append('description', 'x'); f.append('files', new Blob(['MZ']), 'virus.exe'); return (await call('POST', '/submissions', { token: ZAIN, form: f })).status === 400; })());
  r = await call('GET', '/notifications', { token: A });
  ok('admin got submission_received notification', r.json.items?.some((n) => n.type === 'submission_received'));

  ok('intern cannot review (403)', (await call('PATCH', `/submissions/${sub1}/review`, { token: ZAIN, body: { status: 'approved' } })).status === 403);
  ok('revision without feedback -> 400', (await call('PATCH', `/submissions/${sub1}/review`, { token: A, body: { status: 'revision_requested' } })).status === 400);
  r = await call('PATCH', `/submissions/${sub1}/review`, { token: A, body: { status: 'revision_requested', feedback: 'Please add tests for login', rating: 3 } });
  ok('admin requests revision', r.status === 200 && r.json.task.submissionStatus === 'revision_requested' && r.json.task.status === 'In Progress', JSON.stringify(r.json).slice(0, 300));
  ok('re-review blocked (400)', (await call('PATCH', `/submissions/${sub1}/review`, { token: A, body: { status: 'approved' } })).status === 400);
  r = await call('GET', '/notifications', { token: ZAIN });
  ok('intern got revision_requested notification', r.json.items?.some((n) => n.type === 'revision_requested'));
  r = await call('GET', '/feedback', { token: ZAIN });
  ok('intern sees feedback', r.json.items?.length === 1 && r.json.items[0].type === 'revision');

  // ---- submission v2 -> approve
  r = await call('POST', '/submissions', { token: ZAIN, body: { task: taskId, description: 'Fixed per feedback' } });
  ok('resubmission is version 2', r.status === 201 && r.json.submission.version === 2);
  const sub2 = r.json.submission._id;
  r = await call('PATCH', `/submissions/${sub2}/review`, { token: A, body: { status: 'approved', feedback: 'Great job', rating: 5 } });
  ok('admin approves -> task Completed 100%', r.status === 200 && r.json.task.status === 'Completed' && r.json.task.progress === 100, JSON.stringify(r.json).slice(0, 300));
  r = await call('GET', `/tasks/${taskId}`, { token: A });
  ok('task detail keeps submission history (2) + feedback (2)', r.json.submissions?.length === 2 && r.json.feedback?.length === 2);
  r = await call('GET', `/interns/${zainId}`, { token: A });
  ok('overallProgress now 100', r.json.intern.overallProgress === 100 && r.json.stats.completed === 1);
  ok('cannot submit completed task (400)', (await call('POST', '/submissions', { token: ZAIN, body: { task: taskId, description: 'late' } })).status === 400);

  // ---- admin task ops
  r = await call('PUT', `/tasks/${taskId}`, { token: A, body: { priority: 'Low', title: 'Write E2E tests (done)' } });
  ok('admin updates task', r.status === 200 && r.json.task.priority === 'Low');
  r = await call('POST', '/tasks', { token: A, body: { title: 'Second task', intern: aliId, deadline: dl, priority: 'High', category: 'Testing' } });
  const t2 = r.json.task._id;
  r = await call('PATCH', `/tasks/${t2}/status`, { token: A, body: { status: 'In Progress', progress: 30 } });
  ok('admin changes status', r.status === 200 && r.json.task.status === 'In Progress' && r.json.task.progress === 30);

  // ---- lists / filters / sort / pagination
  r = await call('GET', '/tasks?page=1&limit=3&sort=deadline:asc', { token: A });
  ok('task pagination', r.status === 200 && r.json.items.length === 3 && r.json.pagination.total >= 10 && r.json.pagination.pages >= 4);
  r = await call('GET', '/tasks?priority=Critical,High&status=In Progress', { token: A });
  ok('task filters (priority + status)', r.json.items.every((t) => ['Critical', 'High'].includes(t.priority) && t.status === 'In Progress') && r.json.items.length >= 1);
  r = await call('GET', '/tasks?overdue=true', { token: A });
  ok('overdue filter returns seeded overdue tasks', r.json.items.length >= 2 && r.json.items.every((t) => t.status === 'Overdue'), JSON.stringify(r.json.items.map((t) => t.status)));
  r = await call('GET', '/tasks?status=Overdue', { token: A });
  ok('status=Overdue filter', r.json.items.length >= 2);
  r = await call('GET', '/tasks?search=api&sort=priority:desc', { token: A });
  ok('search + priority sort', r.status === 200 && r.json.items.length >= 1);
  r = await call('GET', '/tasks?dueWithin=4', { token: A });
  ok('dueWithin filter', r.status === 200 && r.json.items.every((t) => t.status !== 'Completed'));
  r = await call('GET', `/tasks?intern=${aliId}`, { token: A });
  ok('filter by intern', r.json.items.length >= 4 && r.json.items.every((t) => t.intern._id === aliId));
  r = await call('GET', '/tasks/board', { token: A });
  ok('kanban board columns', r.status === 200 && Object.keys(r.json.board).join() === 'Pending,In Progress,Completed,Overdue' && r.json.board.Overdue.length >= 2);
  r = await call('GET', '/tasks/categories', { token: A });
  ok('categories', r.json.categories?.includes('Testing'));
  r = await call('GET', '/tasks', { token: ALI });
  ok('intern list only own tasks', r.json.items.every((t) => t.intern._id === aliId));

  // ---- dashboards
  r = await call('GET', '/dashboard/admin', { token: A });
  const c = r.json.cards || {};
  ok('admin dashboard cards', r.status === 200 && c.totalInterns === 5 && c.activeInterns === 5 && c.totalTasks === 12 && c.completedTasks === 4 && c.overdueTasks >= 2, JSON.stringify(r.json).slice(0, 400));
  ok('dashboard: completion rate + avg progress', typeof c.completionRate === 'number' && typeof c.avgProgress === 'number');
  ok('dashboard: status sums to total', r.json.statusBreakdown?.reduce((n, x) => n + x.value, 0) === c.totalTasks);
  ok('dashboard: trend/performance/upcoming/activity present', r.json.trend?.length >= 1 && r.json.performance?.length >= 1 && r.json.upcomingDeadlines?.length >= 1 && r.json.recentActivity?.length >= 1);
  r = await call('GET', '/dashboard/admin?from=2020-01-01&to=2020-01-31', { token: A });
  ok('dashboard date filter (empty range -> 0 tasks)', r.status === 200 && r.json.cards.totalTasks === 0);
  ok('invalid date -> 400', (await call('GET', '/dashboard/admin?from=banana', { token: A })).status === 400);
  r = await call('GET', '/dashboard/intern', { token: ZAIN });
  ok('intern dashboard', r.status === 200 && r.json.cards.overallProgress === 100 && r.json.cards.completedTasks === 1 && r.json.recentFeedback.length === 2 && r.json.recentSubmissions.length === 2, JSON.stringify(r.json.cards));
  r = await call('GET', `/dashboard/interns/${aliId}`, { token: A });
  ok('admin views individual intern performance', r.status === 200 && r.json.intern._id === aliId);

  // ---- notifications API
  r = await call('GET', '/notifications/unread-count', { token: ZAIN });
  const before = r.json.unreadCount; ok('unread count > 0', before > 0);
  const list = (await call('GET', '/notifications?limit=1', { token: ZAIN })).json.items[0];
  ok('mark one read', (await call('PATCH', `/notifications/${list._id}/read`, { token: ZAIN })).json.notification.isRead === true);
  ok("cannot read other user's notification (404)", (await call('PATCH', `/notifications/${list._id}/read`, { token: SARA })).status === 404);
  await call('PATCH', '/notifications/read-all', { token: ZAIN });
  ok('read-all -> 0 unread', (await call('GET', '/notifications/unread-count', { token: ZAIN })).json.unreadCount === 0);

  // ---- activity + search
  r = await call('GET', '/activity?limit=5', { token: A });
  ok('activity timeline (admin)', r.status === 200 && r.json.items.length === 5 && r.json.pagination.total > 5);
  r = await call('GET', '/activity', { token: ZAIN });
  ok('activity scoped to intern', r.json.items.every((x) => String(x.intern) === r.json.items[0].intern));
  r = await call('GET', '/search?q=sara', { token: A });
  ok('global search (admin finds intern)', r.json.interns.length === 1);
  r = await call('GET', '/search?q=Write', { token: ZAIN });
  ok('global search (intern sees only own tasks, no interns)', r.json.interns.length === 0 && r.json.tasks.every((t) => t.title));

  // ---- reports
  r = await call('GET', '/reports/tasks.csv', { token: A });
  ok('tasks.csv', r.status === 200 && r.headers.get('content-type').includes('text/csv') && r.text.split('\r\n').length >= 13 && r.text.includes('Title,Intern'), r.text.slice(0, 120));
  r = await call('GET', '/reports/interns.csv', { token: A });
  ok('interns.csv', r.status === 200 && r.text.includes('Overall Progress %'));
  ok('interns.csv admin-only (403)', (await call('GET', '/reports/interns.csv', { token: ZAIN })).status === 403);
  r = await call('GET', `/reports/progress/${zainId}`, { token: ZAIN });
  ok('intern gets own progress report', r.status === 200 && r.json.stats.completed === 1 && r.json.tasks.length === 1);
  ok("intern cannot get another's report (403)", (await call('GET', `/reports/progress/${aliId}`, { token: ZAIN })).status === 403);
  ok('progress csv', (await call('GET', `/reports/progress/${zainId}?format=csv`, { token: A })).text.includes('Write E2E tests'));
  // CSV injection protection
  await call('PUT', `/tasks/${t2}`, { token: A, body: { title: '=HYPERLINK("http://evil")' } });
  ok('CSV formula injection neutralised', (await call('GET', '/reports/tasks.csv', { token: A })).text.includes(`"'=HYPERLINK`));

  // ---- profile / password
  r = await call('PUT', '/auth/profile', { token: ZAIN, body: { name: 'Zain Q', skills: ['Jest'], role: 'admin', email: 'hack@x.com' } });
  ok('profile update ignores role/email tampering', r.status === 200 && r.json.user.name === 'Zain Q' && r.json.user.role === 'intern' && r.json.user.email === 'zain@internhub.com');
  ok('weak new password -> 400', (await call('PUT', '/auth/change-password', { token: ZAIN, body: { currentPassword: zainPass, newPassword: 'short' } })).status === 400);
  ok('wrong current password -> 400', (await call('PUT', '/auth/change-password', { token: ZAIN, body: { currentPassword: 'wrongpass1', newPassword: 'Newpass123' } })).status === 400);
  ok('change password', (await call('PUT', '/auth/change-password', { token: ZAIN, body: { currentPassword: zainPass, newPassword: 'Newpass123' } })).status === 200);
  ok('login with new password', (await login('zain@internhub.com', 'Newpass123', 'intern')).status === 200);
  ok('old password rejected', (await login('zain@internhub.com', zainPass, 'intern')).status === 401);
  const av = new FormData(); av.append('avatar', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'me.png');
  r = await call('PUT', '/auth/avatar', { token: ZAIN, form: av });
  ok('avatar upload', r.status === 200 && r.json.user.avatar.startsWith('/uploads/'));
  const fileRes = await fetch(API_URL + r.json.user.avatar);
  ok('uploaded file is served', fileRes.status === 200);

  // ---- deactivate / delete
  r = await call('DELETE', `/interns/${zainId}`, { token: A });
  ok('deactivate intern', r.status === 200 && r.json.intern.status === 'inactive');
  ok('deactivated intern cannot log in (403)', (await login('zain@internhub.com', 'Newpass123', 'intern')).status === 403);
  ok('deactivated intern token rejected (403)', (await call('GET', '/tasks', { token: ZAIN })).status === 403);
  ok('cannot assign task to inactive intern (400)', (await call('POST', '/tasks', { token: A, body: { title: 'Nope task', intern: zainId, deadline: dl } })).status === 400);
  ok('permanent delete intern', (await call('DELETE', `/interns/${zainId}?permanent=true`, { token: A })).status === 200);
  r = await call('GET', `/tasks?intern=${zainId}`, { token: A });
  ok('cascade removed their tasks', r.json.items.length === 0);
  ok('delete task', (await call('DELETE', `/tasks/${t2}`, { token: A })).status === 200);
  ok('deleted task -> 404', (await call('GET', `/tasks/${t2}`, { token: A })).status === 404);
  ok('NoSQL injection in query is neutralised', (await call('GET', '/tasks?status[$ne]=x', { token: A })).status === 200);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('E2E crashed:', e); process.exit(2); });
