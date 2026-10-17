const Task = require('../models/Task');
const Intern = require('../models/Intern');
const Submission = require('../models/Submission');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const upload = require('../middleware/upload');
const { getPagination, getSort, paginatedResponse } = require('../utils/pagination');
const { buildTaskFilter, withEffectiveStatus } = require('../services/taskQuery');
const { recalcInternProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');

const SORTABLE = ['deadline', 'createdAt', 'updatedAt', 'title', 'progress', 'startDate', 'status', 'priorityRank'];
const POPULATE_INTERN = { path: 'intern', select: 'name email avatar department' };
const POPULATE_ADMIN = { path: 'assignedBy', select: 'name email' };

// Interns can only touch their own tasks; a foreign id looks like "not found" (no information leak).
const loadTask = async (req, id = req.params.id) => {
  const task = await Task.findById(id);
  if (!task || (req.user.role === 'intern' && String(task.intern) !== String(req.user._id))) {
    throw ApiError.notFound('Task not found');
  }
  return task;
};

// GET /api/tasks
exports.listTasks = asyncHandler(async (req, res) => {
  const filter = buildTaskFilter(req);
  const pg = getPagination(req.query);
  const sortKey = req.query.sort && req.query.sort.startsWith('priority') ? req.query.sort.replace('priority', 'priorityRank') : req.query.sort;
  const sort = getSort(sortKey, SORTABLE, { deadline: 1 });

  const [docs, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).populate(POPULATE_INTERN).populate(POPULATE_ADMIN),
    Task.countDocuments(filter),
  ]);
  const items = docs.map((d) => withEffectiveStatus(d.toJSON()));
  res.json({ success: true, ...paginatedResponse(items, total, pg) });
});

// GET /api/tasks/board  -> tasks grouped in kanban columns (same filters as list)
exports.taskBoard = asyncHandler(async (req, res) => {
  const filter = buildTaskFilter(req);
  const docs = await Task.find(filter).sort({ priorityRank: -1, deadline: 1 }).limit(300)
    .populate(POPULATE_INTERN).populate(POPULATE_ADMIN);

  const board = { Pending: [], 'In Progress': [], Completed: [], Overdue: [] };
  docs.forEach((d) => {
    const t = withEffectiveStatus(d.toJSON());
    board[t.status].push(t);
  });
  res.json({ success: true, board });
});

// GET /api/tasks/categories
exports.listCategories = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'intern' ? { intern: req.user._id } : {};
  const categories = (await Task.distinct('category', filter)).filter(Boolean).sort();
  res.json({ success: true, categories });
});

// GET /api/tasks/:id  (task + submission history + feedback)
exports.getTask = asyncHandler(async (req, res) => {
  const found = await loadTask(req);
  const task = await Task.findById(found._id).populate(POPULATE_INTERN).populate(POPULATE_ADMIN);
  const [submissions, feedback] = await Promise.all([
    Submission.find({ task: task._id }).sort({ version: -1 }).populate('reviewedBy', 'name'),
    Feedback.find({ task: task._id }).sort({ createdAt: -1 }).populate('admin', 'name avatar'),
  ]);
  res.json({ success: true, task: withEffectiveStatus(task.toJSON()), submissions, feedback });
});

// POST /api/tasks  (admin, multipart or JSON)
exports.createTask = asyncHandler(async (req, res) => {
  const { title, description, intern: internId, category, priority, startDate, deadline } = req.body;

  const intern = await Intern.findById(internId);
  if (!intern) throw ApiError.notFound('Intern not found');
  if (intern.status !== 'active') throw ApiError.badRequest('Tasks can only be assigned to active interns');

  const task = await Task.create({
    title, description, category, priority, deadline,
    ...(startDate && { startDate }),
    intern: intern._id,
    assignedBy: req.user._id,
    attachments: upload.toFileDocs(req.files),
  });
  await recalcInternProgress(intern._id);

  notify({
    recipient: intern._id, recipientModel: 'Intern', type: 'task_assigned', title: 'New task assigned',
    message: `"${task.title}" (${task.priority} priority) is due ${task.deadline.toDateString()}.`, link: `/intern/tasks/${task._id}`,
  });
  logActivity({
    actor: req.user, action: 'task.created', entityType: 'Task', entityId: task._id, intern: intern._id,
    description: `${req.user.name} assigned "${task.title}" to ${intern.name}`,
  });

  await task.populate([POPULATE_INTERN, POPULATE_ADMIN]);
  res.status(201).json({ success: true, message: 'Task created and assigned', task });
});

// PUT /api/tasks/:id  (admin)
exports.updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');

  const previousIntern = String(task.intern);
  ['title', 'description', 'category', 'priority', 'startDate'].forEach((f) => {
    if (req.body[f] !== undefined && req.body[f] !== '') task[f] = req.body[f];
  });

  if (req.body.intern && String(req.body.intern) !== previousIntern) {
    const next = await Intern.findById(req.body.intern);
    if (!next) throw ApiError.notFound('Intern not found');
    if (next.status !== 'active') throw ApiError.badRequest('Tasks can only be assigned to active interns');
    task.intern = next._id;
    notify({
      recipient: next._id, recipientModel: 'Intern', type: 'task_assigned', title: 'New task assigned',
      message: `"${task.title}" has been assigned to you.`, link: `/intern/tasks/${task._id}`,
    });
  }

  if (req.body.deadline) {
    task.deadline = req.body.deadline;
    task.deadlineReminderSent = false;
    // Extending the deadline of an overdue task revives it
    if (task.status === 'Overdue' && task.deadline > new Date()) task.status = task.progress > 0 ? 'In Progress' : 'Pending';
  }

  if (req.files && req.files.length) task.attachments.push(...upload.toFileDocs(req.files));
  await task.save();

  await recalcInternProgress(task.intern);
  if (previousIntern !== String(task.intern)) await recalcInternProgress(previousIntern);

  logActivity({
    actor: req.user, action: 'task.updated', entityType: 'Task', entityId: task._id, intern: task.intern,
    description: `${req.user.name} updated task "${task.title}"`,
  });

  await task.populate([POPULATE_INTERN, POPULATE_ADMIN]);
  res.json({ success: true, message: 'Task updated', task: withEffectiveStatus(task.toJSON()) });
});

// PATCH /api/tasks/:id/status  (admin)  body: { status, progress? }
exports.changeStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');

  const { status, progress } = req.body;
  if (['Pending', 'In Progress'].includes(status) && task.deadline < new Date()) {
    throw ApiError.badRequest('The deadline has passed. Extend the deadline first, or keep the task as Overdue.');
  }

  if (status === 'Overdue' && task.deadline >= new Date()) {
    throw ApiError.badRequest('A task can only be marked Overdue after its deadline has passed.');
  }

  const wasCompleted = task.status === 'Completed';
  task.status = status;
  if (progress !== undefined && status !== 'Completed') task.progress = progress;
  if (status === 'Pending' && progress === undefined) task.progress = 0;
  if (wasCompleted && status !== 'Completed') task.submissionStatus = task.latestSubmission ? 'revision_requested' : 'none';
  await task.save();
  await recalcInternProgress(task.intern);

  if (status === 'Completed' && !wasCompleted) {
    notify({
      recipient: task.intern, recipientModel: 'Intern', type: 'task_completed', title: 'Task marked completed',
      message: `"${task.title}" was marked as completed.`, link: `/intern/tasks/${task._id}`,
    });
  }
  logActivity({
    actor: req.user, action: 'task.status_changed', entityType: 'Task', entityId: task._id, intern: task.intern,
    description: `${req.user.name} set "${task.title}" to ${status}`, metadata: { status },
  });

  res.json({ success: true, message: 'Status updated', task: withEffectiveStatus(task.toJSON()) });
});

// PATCH /api/tasks/:id/progress  (intern)  body: { progress, status? }
exports.updateProgress = asyncHandler(async (req, res) => {
  const task = await loadTask(req);
  if (task.status === 'Completed') throw ApiError.badRequest('This task is already completed');
  if (task.submissionStatus === 'pending_review') throw ApiError.badRequest('Your submission is awaiting review');

  const { progress, status } = req.body;
  if (progress !== undefined) task.progress = progress;
  // Overdue tasks stay Overdue until the admin extends the deadline.
  if (task.status !== 'Overdue') {
    if (status) task.status = status;
    else if (task.progress > 0) task.status = 'In Progress';
    else if (task.progress === 0 && progress !== undefined) task.status = 'Pending';
  }
  await task.save();
  await recalcInternProgress(task.intern);

  logActivity({
    actor: req.user, action: 'task.progress_updated', entityType: 'Task', entityId: task._id, intern: task.intern,
    description: `${req.user.name} updated "${task.title}" to ${task.progress}%`, metadata: { progress: task.progress },
  });

  res.json({ success: true, message: 'Progress updated', task: withEffectiveStatus(task.toJSON()) });
});

// DELETE /api/tasks/:id  (admin)
exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw ApiError.notFound('Task not found');

  await Promise.all([
    Submission.deleteMany({ task: task._id }),
    Feedback.deleteMany({ task: task._id }),
    Notification.deleteMany({ link: new RegExp(`${task._id}$`) }),
  ]);
  await task.deleteOne();
  await recalcInternProgress(task.intern);

  logActivity({
    actor: req.user, action: 'task.deleted', entityType: 'Task', intern: task.intern,
    description: `${req.user.name} deleted task "${task.title}"`,
  });
  res.json({ success: true, message: 'Task deleted' });
});

exports.loadTask = loadTask;
