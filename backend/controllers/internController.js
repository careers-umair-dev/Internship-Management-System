const crypto = require('crypto');
const Intern = require('../models/Intern');
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, getSort, paginatedResponse, escapeRegex } = require('../utils/pagination');
const { taskStats, statsByIntern, recalcInternProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');

const FIELDS = ['name', 'email', 'phone', 'department', 'position', 'joiningDate', 'durationMonths', 'skills', 'status', 'mentor'];

const tempPassword = () => `${crypto.randomBytes(5).toString('hex')}A1`; // 12 chars, has letters + digits

// GET /api/interns
exports.listInterns = asyncHandler(async (req, res) => {
  const { search, status, department } = req.query;
  const filter = {};
  if (status) filter.status = { $in: String(status).split(',') };
  if (department) filter.department = String(department);
  if (search) {
    const rx = new RegExp(escapeRegex(String(search).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { department: rx }, { position: rx }];
  }

  const pg = getPagination(req.query);
  const sort = getSort(req.query.sort, ['name', 'createdAt', 'overallProgress', 'joiningDate', 'department'], { createdAt: -1 });

  const [items, total] = await Promise.all([
    Intern.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).populate('mentor', 'name email'),
    Intern.countDocuments(filter),
  ]);

  const stats = await statsByIntern(items.map((i) => i._id));
  const withStats = items.map((i) => ({
    ...i.toJSON(),
    taskCounts: stats[String(i._id)] || { total: 0, completed: 0, overdue: 0 },
  }));

  res.json({ success: true, ...paginatedResponse(withStats, total, pg) });
});

// GET /api/interns/departments  (for filter dropdowns)
exports.listDepartments = asyncHandler(async (_req, res) => {
  const departments = (await Intern.distinct('department')).filter(Boolean).sort();
  res.json({ success: true, departments });
});

// GET /api/interns/:id  (profile + stats)
exports.getIntern = asyncHandler(async (req, res) => {
  const intern = await Intern.findById(req.params.id).populate('mentor', 'name email');
  if (!intern) throw ApiError.notFound('Intern not found');

  const [stats, submissionCount, feedbackCount, recentActivity] = await Promise.all([
    taskStats({ intern: intern._id }),
    Submission.countDocuments({ intern: intern._id }),
    Feedback.countDocuments({ intern: intern._id }),
    Activity.find({ intern: intern._id }).sort({ createdAt: -1 }).limit(10),
  ]);

  res.json({ success: true, intern, stats, submissionCount, feedbackCount, recentActivity });
});

// POST /api/interns
exports.createIntern = asyncHandler(async (req, res) => {
  const data = {};
  FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
  const generated = !req.body.password;
  const password = req.body.password || tempPassword();

  const intern = await Intern.create({ ...data, password, mentor: data.mentor || req.user._id });

  logActivity({
    actor: req.user, action: 'intern.created', entityType: 'Intern', entityId: intern._id, intern: intern._id,
    description: `${req.user.name} added intern ${intern.name}`,
  });
  notify({
    recipient: intern._id, recipientModel: 'Intern', type: 'system', title: 'Welcome aboard!',
    message: 'Your intern account is ready. Check your dashboard for assigned tasks.', link: '/intern/dashboard',
  });

  res.status(201).json({
    success: true,
    message: 'Intern created',
    intern,
    // Shown once so the admin can share it; never stored in plain text.
    ...(generated && { temporaryPassword: password }),
  });
});

// PUT /api/interns/:id
exports.updateIntern = asyncHandler(async (req, res) => {
  const intern = await Intern.findById(req.params.id);
  if (!intern) throw ApiError.notFound('Intern not found');

  FIELDS.forEach((f) => { if (req.body[f] !== undefined) intern[f] = req.body[f]; });
  if (req.body.password) intern.password = req.body.password; // admin password reset
  await intern.save();

  logActivity({
    actor: req.user, action: 'intern.updated', entityType: 'Intern', entityId: intern._id, intern: intern._id,
    description: `${req.user.name} updated ${intern.name}'s profile`,
  });

  res.json({ success: true, message: 'Intern updated', intern });
});

// PUT /api/interns/:id/avatar
exports.updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Image file is required');
  if (!req.file.mimetype.startsWith('image/')) throw ApiError.badRequest('Avatar must be an image');
  const intern = await Intern.findById(req.params.id);
  if (!intern) throw ApiError.notFound('Intern not found');
  intern.avatar = `/uploads/${req.file.filename}`;
  await intern.save();
  res.json({ success: true, intern });
});

// DELETE /api/interns/:id            -> deactivate (default, reversible)
// DELETE /api/interns/:id?permanent=true -> hard delete + cascade
exports.deleteIntern = asyncHandler(async (req, res) => {
  const intern = await Intern.findById(req.params.id);
  if (!intern) throw ApiError.notFound('Intern not found');

  if (req.query.permanent === 'true') {
    await Promise.all([
      Task.deleteMany({ intern: intern._id }),
      Submission.deleteMany({ intern: intern._id }),
      Feedback.deleteMany({ intern: intern._id }),
      Notification.deleteMany({ recipient: intern._id }),
      Activity.deleteMany({ intern: intern._id }),
    ]);
    await intern.deleteOne();
    logActivity({ actor: req.user, action: 'intern.deleted', entityType: 'Intern', description: `${req.user.name} permanently deleted ${intern.name}` });
    return res.json({ success: true, message: 'Intern and related data permanently deleted' });
  }

  intern.status = 'inactive';
  await intern.save();
  logActivity({
    actor: req.user, action: 'intern.deactivated', entityType: 'Intern', entityId: intern._id, intern: intern._id,
    description: `${req.user.name} deactivated ${intern.name}`,
  });
  res.json({ success: true, message: 'Intern deactivated', intern });
});

exports.recalc = recalcInternProgress;
