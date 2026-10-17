const Intern = require('../models/Intern');
const Task = require('../models/Task');
const Feedback = require('../models/Feedback');
const Submission = require('../models/Submission');
const Activity = require('../models/Activity');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parseRange, daysAgo } = require('../utils/dates');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { taskStats, oid } = require('../services/progressService');
const { withEffectiveStatus } = require('../services/taskQuery');

const GROUPINGS = ['day', 'week', 'month'];

// ISO-8601 week label, e.g. 2026-W40
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
const bucket = (date, groupBy) => {
  const d = new Date(date);
  if (groupBy === 'week') return isoWeek(d);
  return d.toISOString().slice(0, groupBy === 'month' ? 7 : 10);
};

// Assigned vs completed task counts per period (bucketed in JS so it runs on any Mongo-compatible DB).
const buildTrend = async (baseMatch, groupBy, from, to) => {
  const [assigned, completed] = await Promise.all([
    Task.find({ ...baseMatch, createdAt: { $gte: from, $lte: to } }).select('createdAt').lean(),
    Task.find({ ...baseMatch, status: 'Completed', completedAt: { $gte: from, $lte: to } }).select('completedAt').lean(),
  ]);

  const map = new Map();
  const row = (key) => map.get(key) || map.set(key, { period: key, assigned: 0, completed: 0 }).get(key);
  assigned.forEach((t) => { row(bucket(t.createdAt, groupBy)).assigned += 1; });
  completed.forEach((t) => { row(bucket(t.completedAt, groupBy)).completed += 1; });

  if (groupBy === 'day') { // fill empty days so charts have a continuous axis
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) row(d.toISOString().slice(0, 10));
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
};


const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const priorityCounts = async (match) => {
  const counts = await Promise.all(PRIORITIES.map((p) => Task.countDocuments({ ...match, priority: p })));
  return PRIORITIES.map((name, i) => ({ name, value: counts[i] })).filter((r) => r.value > 0);
};

// Per-intern totals, on-time completion and average progress (top 15 by progress).
const internPerformanceRows = async (match) => {
  const tasks = await Task.find(match).select('intern status progress deadline completedAt').lean();
  const by = new Map();
  tasks.forEach((t) => {
    const key = String(t.intern);
    const r = by.get(key) || { _id: t.intern, total: 0, completed: 0, onTime: 0, progressSum: 0 };
    r.total += 1;
    r.progressSum += t.progress || 0;
    if (t.status === 'Completed') {
      r.completed += 1;
      if (t.completedAt && t.completedAt <= t.deadline) r.onTime += 1;
    }
    by.set(key, r);
  });
  return [...by.values()]
    .map((r) => ({ ...r, avgProgress: r.progressSum / r.total }))
    .sort((a, b) => b.avgProgress - a.avgProgress)
    .slice(0, 15);
};

const pickGroupBy = (query, from, to) => {
  if (GROUPINGS.includes(query.groupBy)) return query.groupBy;
  const days = (to - from) / 86400000;
  return days <= 31 ? 'day' : days <= 180 ? 'week' : 'month';
};

const upcomingDeadlines = (match, limit = 8) =>
  Task.find({ ...match, status: { $ne: 'Completed' }, deadline: { $gte: new Date() } })
    .sort({ deadline: 1 }).limit(limit).populate('intern', 'name avatar').select('title deadline priority status progress intern');

// GET /api/dashboard/admin?from=&to=&groupBy=day|week|month
exports.adminDashboard = asyncHandler(async (req, res) => {
  const { from, to } = parseRange(req.query);
  const trendFrom = from || daysAgo(29);
  const trendTo = to || new Date();
  const groupBy = pickGroupBy(req.query, trendFrom, trendTo);

  // Date filter applies to tasks by creation date
  const taskMatch = {};
  if (from || to) taskMatch.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const [stats, totalInterns, activeInterns, priorityRows, perfRows, trend, upcoming, recentActivity] = await Promise.all([
    taskStats(taskMatch),
    Intern.countDocuments({}),
    Intern.countDocuments({ status: 'active' }),
    priorityCounts(taskMatch),
    internPerformanceRows(taskMatch),
    buildTrend({}, groupBy, trendFrom, trendTo),
    upcomingDeadlines({}),
    Activity.find().sort({ createdAt: -1 }).limit(10),
  ]);

  const interns = await Intern.find({ _id: { $in: perfRows.map((r) => r._id) } }).select('name avatar department');
  const byId = Object.fromEntries(interns.map((i) => [String(i._id), i]));
  const performance = perfRows
    .filter((r) => byId[String(r._id)])
    .map((r) => ({
      intern: byId[String(r._id)],
      total: r.total,
      completed: r.completed,
      avgProgress: Math.round(r.avgProgress || 0),
      onTimeRate: r.completed ? Math.round((r.onTime / r.completed) * 100) : 0,
    }));

  res.json({
    success: true,
    range: { from: trendFrom, to: trendTo, groupBy },
    cards: { totalInterns, activeInterns, totalTasks: stats.total, completedTasks: stats.completed,
      pendingTasks: stats.pending + stats.inProgress, overdueTasks: stats.overdue,
      completionRate: stats.completionRate, avgProgress: stats.avgProgress },
    statusBreakdown: [
      { name: 'Completed', value: stats.completed },
      { name: 'In Progress', value: stats.inProgress },
      { name: 'Pending', value: stats.pending },
      { name: 'Overdue', value: stats.overdue },
    ],
    priorityBreakdown: priorityRows,
    trend,
    performance,
    upcomingDeadlines: upcoming.map((t) => withEffectiveStatus(t.toJSON())),
    recentActivity,
  });
});

const internDashboardData = async (internId, query = {}) => {
  const intern = await Intern.findById(internId).populate('mentor', 'name email');
  if (!intern) throw ApiError.notFound('Intern not found');

  const match = { intern: oid(internId) };
  const { from, to } = parseRange(query);
  const trendFrom = from || daysAgo(55);
  const trendTo = to || new Date();
  const groupBy = pickGroupBy({ groupBy: query.groupBy || 'week' }, trendFrom, trendTo);

  const [stats, priorityRows, trend, upcoming, recentFeedback, recentSubmissions, history] = await Promise.all([
    taskStats(match),
    priorityCounts(match),
    buildTrend(match, groupBy, trendFrom, trendTo),
    upcomingDeadlines({ intern: internId }),
    Feedback.find({ intern: internId }).sort({ createdAt: -1 }).limit(5).populate('task', 'title').populate('admin', 'name avatar'),
    Submission.find({ intern: internId }).sort({ createdAt: -1 }).limit(5).populate('task', 'title'),
    Task.find({ intern: internId, status: 'Completed' }).sort({ completedAt: -1 }).limit(10).select('title completedAt deadline priority'),
  ]);

  return {
    intern,
    cards: { overallProgress: intern.overallProgress, assignedTasks: stats.total, completedTasks: stats.completed,
      pendingTasks: stats.pending + stats.inProgress, overdueTasks: stats.overdue, completionRate: stats.completionRate },
    statusBreakdown: [
      { name: 'Completed', value: stats.completed },
      { name: 'In Progress', value: stats.inProgress },
      { name: 'Pending', value: stats.pending },
      { name: 'Overdue', value: stats.overdue },
    ],
    priorityBreakdown: priorityRows,
    trend,
    range: { from: trendFrom, to: trendTo, groupBy },
    upcomingDeadlines: upcoming.map((t) => withEffectiveStatus(t.toJSON())),
    recentFeedback,
    recentSubmissions,
    performanceHistory: history,
  };
};

// GET /api/dashboard/intern
exports.internDashboard = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await internDashboardData(req.user._id, req.query)) });
});

// GET /api/dashboard/interns/:id  (admin: individual intern performance)
exports.internPerformance = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await internDashboardData(req.params.id, req.query)) });
});

// GET /api/activity   (admin: all, ?intern= to filter | intern: own)
exports.listActivity = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'intern') filter.intern = req.user._id;
  else if (req.query.intern) filter.intern = String(req.query.intern);
  const { from, to } = parseRange(req.query);
  if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const pg = getPagination(req.query, { defaultLimit: 20 });
  const [items, total] = await Promise.all([
    Activity.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Activity.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse(items, total, pg) });
});
