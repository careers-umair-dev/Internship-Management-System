const { escapeRegex } = require('../utils/pagination');

const csv = (v) => String(v).split(',').map((s) => s.trim()).filter(Boolean);

// Builds a Mongo filter from query params. Interns are always scoped to their own tasks.
// Supported: intern, status, priority, category, search, deadlineFrom, deadlineTo, overdue=true, dueWithin=<days>
exports.buildTaskFilter = (req) => {
  const q = req.query;
  const filter = {};
  const and = [];
  const now = new Date();

  if (req.user.role === 'intern') filter.intern = req.user._id;
  else if (q.intern) filter.intern = String(q.intern);

  if (q.status) {
    const statuses = csv(q.status);
    const clauses = [];
    const plain = statuses.filter((s) => s !== 'Overdue');
    if (plain.length) clauses.push({ status: { $in: plain } });
    // "Overdue" also matches tasks that slipped past the deadline before the scheduler ran
    if (statuses.includes('Overdue')) {
      clauses.push({ status: 'Overdue' }, { status: { $in: ['Pending', 'In Progress'] }, deadline: { $lt: now } });
    }
    and.push({ $or: clauses });
  }
  if (q.priority) filter.priority = { $in: csv(q.priority) };
  if (q.category) filter.category = String(q.category);

  if (q.search) {
    const rx = new RegExp(escapeRegex(String(q.search).slice(0, 80)), 'i');
    and.push({ $or: [{ title: rx }, { description: rx }, { category: rx }] });
  }

  if (q.deadlineFrom || q.deadlineTo) {
    const range = {};
    if (q.deadlineFrom) range.$gte = new Date(q.deadlineFrom);
    if (q.deadlineTo) {
      const to = new Date(q.deadlineTo);
      if (String(q.deadlineTo).length <= 10) to.setUTCHours(23, 59, 59, 999);
      range.$lte = to;
    }
    and.push({ deadline: range });
  }

  if (q.overdue === 'true') and.push({ status: { $ne: 'Completed' }, deadline: { $lt: now } });

  const days = parseInt(q.dueWithin, 10);
  if (days > 0) {
    and.push({ status: { $ne: 'Completed' }, deadline: { $gte: now, $lte: new Date(now.getTime() + days * 86400000) } });
  }

  if (and.length) filter.$and = and;
  return filter;
};

// Replaces stored status with the effective one for display (late + not completed => Overdue).
exports.withEffectiveStatus = (taskJson) => {
  if (taskJson.status !== 'Completed' && new Date(taskJson.deadline) < new Date()) taskJson.status = 'Overdue';
  return taskJson;
};
