const Intern = require('../models/Intern');
const Task = require('../models/Task');
const Feedback = require('../models/Feedback');
const Submission = require('../models/Submission');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { toCSV, sendCSV } = require('../utils/csv');
const { buildTaskFilter, withEffectiveStatus } = require('../services/taskQuery');
const { taskStats, statsByIntern } = require('../services/progressService');

const date = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const TASK_COLUMNS = [
  { header: 'Title', key: 'title' },
  { header: 'Intern', value: (t) => t.intern?.name },
  { header: 'Category', key: 'category' },
  { header: 'Priority', key: 'priority' },
  { header: 'Status', key: 'status' },
  { header: 'Progress %', key: 'progress' },
  { header: 'Start Date', value: (t) => date(t.startDate) },
  { header: 'Deadline', value: (t) => date(t.deadline) },
  { header: 'Completed At', value: (t) => date(t.completedAt) },
  { header: 'Submission Status', key: 'submissionStatus' },
];

// GET /api/reports/interns.csv (admin)
exports.internsCSV = asyncHandler(async (_req, res) => {
  const interns = await Intern.find().sort({ name: 1 });
  const stats = await statsByIntern(interns.map((i) => i._id));
  const rows = interns.map((i) => ({ ...i.toJSON(), counts: stats[String(i._id)] || { total: 0, completed: 0, overdue: 0 } }));
  sendCSV(res, 'interns.csv', toCSV([
    { header: 'Name', key: 'name' }, { header: 'Email', key: 'email' }, { header: 'Phone', key: 'phone' },
    { header: 'Department', key: 'department' }, { header: 'Position', key: 'position' },
    { header: 'Status', key: 'status' }, { header: 'Joining Date', value: (r) => date(r.joiningDate) },
    { header: 'Duration (months)', key: 'durationMonths' }, { header: 'Skills', value: (r) => (r.skills || []).join('; ') },
    { header: 'Overall Progress %', key: 'overallProgress' }, { header: 'Total Tasks', value: (r) => r.counts.total },
    { header: 'Completed Tasks', value: (r) => r.counts.completed }, { header: 'Overdue Tasks', value: (r) => r.counts.overdue },
  ], rows));
});

// GET /api/reports/tasks.csv  (same filters as /api/tasks; interns export only their own)
exports.tasksCSV = asyncHandler(async (req, res) => {
  const tasks = await Task.find(buildTaskFilter(req)).sort({ deadline: 1 }).limit(5000).populate('intern', 'name');
  sendCSV(res, 'tasks.csv', toCSV(TASK_COLUMNS, tasks.map((t) => withEffectiveStatus(t.toJSON()))));
});

// GET /api/reports/progress/:internId[?format=csv]  -> printable progress report data
exports.progressReport = asyncHandler(async (req, res) => {
  const { internId } = req.params;
  if (req.user.role === 'intern' && String(req.user._id) !== internId) throw ApiError.forbidden();

  const intern = await Intern.findById(internId).populate('mentor', 'name email');
  if (!intern) throw ApiError.notFound('Intern not found');

  const [stats, tasks, feedback, submissionCount] = await Promise.all([
    taskStats({ intern: intern._id }),
    Task.find({ intern: intern._id }).sort({ deadline: 1 }).populate('intern', 'name'),
    Feedback.find({ intern: intern._id }).sort({ createdAt: -1 }).limit(20).populate('task', 'title').populate('admin', 'name'),
    Submission.countDocuments({ intern: intern._id }),
  ]);
  const taskRows = tasks.map((t) => withEffectiveStatus(t.toJSON()));

  if (req.query.format === 'csv') {
    return sendCSV(res, `progress-${intern.name.replace(/\s+/g, '-').toLowerCase()}.csv`, toCSV(TASK_COLUMNS, taskRows));
  }
  res.json({ success: true, generatedAt: new Date(), intern, stats, submissionCount, tasks: taskRows, feedback });
});
