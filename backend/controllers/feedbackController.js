const Feedback = require('../models/Feedback');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');

// GET /api/feedback  filters: intern (admin), task, type
exports.listFeedback = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'intern') filter.intern = req.user._id;
  else if (req.query.intern) filter.intern = String(req.query.intern);
  if (req.query.task) filter.task = String(req.query.task);
  if (req.query.type) filter.type = { $in: String(req.query.type).split(',') };

  const pg = getPagination(req.query);
  const [items, total] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit)
      .populate('task', 'title').populate('admin', 'name avatar').populate('intern', 'name avatar'),
    Feedback.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse(items, total, pg) });
});

// POST /api/feedback  (admin) standalone feedback on a task: { task, message, rating? }
exports.createFeedback = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.body.task);
  if (!task) throw ApiError.notFound('Task not found');

  const feedback = await Feedback.create({
    task: task._id, intern: task.intern, admin: req.user._id, type: 'general',
    message: req.body.message, rating: req.body.rating,
  });

  notify({ recipient: task.intern, recipientModel: 'Intern', type: 'feedback_received', title: 'New feedback received',
    message: `New feedback on "${task.title}".`, link: `/intern/tasks/${task._id}` });
  logActivity({
    actor: req.user, action: 'feedback.created', entityType: 'Feedback', entityId: feedback._id, intern: task.intern,
    description: `${req.user.name} gave feedback on "${task.title}"`,
  });

  res.status(201).json({ success: true, message: 'Feedback sent', feedback });
});

// DELETE /api/feedback/:id (admin)
exports.deleteFeedback = asyncHandler(async (req, res) => {
  const fb = await Feedback.findByIdAndDelete(req.params.id);
  if (!fb) throw ApiError.notFound('Feedback not found');
  res.json({ success: true, message: 'Feedback deleted' });
});
