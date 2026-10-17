const Submission = require('../models/Submission');
const Task = require('../models/Task');
const Feedback = require('../models/Feedback');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const upload = require('../middleware/upload');
const { getPagination, getSort, paginatedResponse } = require('../utils/pagination');
const { recalcInternProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');

const FEEDBACK_TYPE = { approved: 'approval', rejected: 'rejection', revision_requested: 'revision' };

const populateAll = (q) =>
  q.populate('task', 'title priority deadline status category')
    .populate('intern', 'name email avatar department')
    .populate('reviewedBy', 'name');

// POST /api/submissions  (intern, multipart or JSON) body: { task, description?, link?, files? }
exports.createSubmission = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.body.task);
  if (!task || String(task.intern) !== String(req.user._id)) throw ApiError.notFound('Task not found');
  if (task.status === 'Completed') throw ApiError.badRequest('This task is already completed');
  if (task.submissionStatus === 'pending_review') throw ApiError.badRequest('You already have a submission awaiting review');

  const last = await Submission.findOne({ task: task._id }).sort({ version: -1 });
  const submission = await Submission.create({
    task: task._id,
    intern: req.user._id,
    version: last ? last.version + 1 : 1,
    description: req.body.description,
    link: req.body.link || undefined,
    files: upload.toFileDocs(req.files),
  });

  task.latestSubmission = submission._id;
  task.submissionStatus = 'pending_review';
  if (task.status === 'Pending') task.status = 'In Progress';
  task.progress = Math.max(task.progress, 90); // submitted work counts as nearly done; approval makes it 100%
  await task.save();
  await recalcInternProgress(req.user._id);

  notify({
    recipient: task.assignedBy, recipientModel: 'Admin', type: 'submission_received', title: 'New submission to review',
    message: `${req.user.name} submitted "${task.title}" (v${submission.version}).`, link: `/admin/submissions/${submission._id}`,
  });
  logActivity({
    actor: req.user, action: 'submission.created', entityType: 'Submission', entityId: submission._id, intern: req.user._id,
    description: `${req.user.name} submitted work for "${task.title}" (v${submission.version})`,
  });

  res.status(201).json({ success: true, message: 'Work submitted for review', submission });
});

// GET /api/submissions  filters: status, task, intern (admin), sort, page
exports.listSubmissions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'intern') filter.intern = req.user._id;
  else if (req.query.intern) filter.intern = String(req.query.intern);
  if (req.query.task) filter.task = String(req.query.task);
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };

  const pg = getPagination(req.query);
  const sort = getSort(req.query.sort, ['createdAt', 'status', 'version', 'reviewedAt'], { createdAt: -1 });
  const [items, total] = await Promise.all([
    populateAll(Submission.find(filter).sort(sort).skip(pg.skip).limit(pg.limit)),
    Submission.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse(items, total, pg) });
});

// GET /api/submissions/:id
exports.getSubmission = asyncHandler(async (req, res) => {
  const submission = await populateAll(Submission.findById(req.params.id));
  if (!submission || (req.user.role === 'intern' && String(submission.intern._id) !== String(req.user._id))) {
    throw ApiError.notFound('Submission not found');
  }
  const feedback = await Feedback.find({ submission: submission._id }).sort({ createdAt: -1 }).populate('admin', 'name avatar');
  res.json({ success: true, submission, feedback });
});

// PATCH /api/submissions/:id/review  (admin) body: { status, feedback?, rating? }
exports.reviewSubmission = asyncHandler(async (req, res) => {
  const { status, feedback, rating } = req.body;
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw ApiError.notFound('Submission not found');
  if (submission.status !== 'pending') throw ApiError.badRequest('This submission has already been reviewed');

  const task = await Task.findById(submission.task);
  if (!task) throw ApiError.notFound('Task no longer exists');

  submission.status = status;
  submission.reviewedBy = req.user._id;
  submission.reviewedAt = new Date();
  await submission.save();

  const message = feedback || (status === 'approved' ? 'Submission approved. Great work!' : '');
  const fb = await Feedback.create({
    task: task._id, submission: submission._id, intern: submission.intern, admin: req.user._id,
    type: FEEDBACK_TYPE[status], message, rating,
  });

  task.submissionStatus = status;
  if (status === 'approved') {
    task.status = 'Completed'; // model hook sets progress 100 + completedAt
  } else {
    task.status = task.deadline < new Date() ? 'Overdue' : 'In Progress';
    task.progress = Math.min(task.progress, 90);
  }
  await task.save();
  await recalcInternProgress(task.intern);

  const link = `/intern/tasks/${task._id}`;
  if (status === 'approved') {
    notify({ recipient: task.intern, recipientModel: 'Intern', type: 'task_completed', title: 'Submission approved',
      message: `"${task.title}" was approved and marked completed.`, link });
  } else if (status === 'revision_requested') {
    notify({ recipient: task.intern, recipientModel: 'Intern', type: 'revision_requested', title: 'Revision requested',
      message: `Changes requested on "${task.title}".`, link });
  } else {
    notify({ recipient: task.intern, recipientModel: 'Intern', type: 'submission_reviewed', title: 'Submission rejected',
      message: `Your submission for "${task.title}" was rejected. Please review the feedback.`, link });
  }
  logActivity({
    actor: req.user, action: 'submission.reviewed', entityType: 'Submission', entityId: submission._id, intern: task.intern,
    description: `${req.user.name} ${status.replace('_', ' ')} submission v${submission.version} of "${task.title}"`,
    metadata: { status },
  });

  res.json({ success: true, message: 'Review saved', submission, feedback: fb, task });
});
