const mongoose = require('mongoose');
const Task = require('../models/Task');
const Intern = require('../models/Intern');

const oid = (id) => new mongoose.Types.ObjectId(String(id));
exports.oid = oid;

const average = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

// Overall progress = average progress across all of the intern's tasks (completed = 100).
exports.recalcInternProgress = async (internId) => {
  const tasks = await Task.find({ intern: internId }).select('progress').lean();
  const value = Math.round(average(tasks.map((t) => t.progress || 0)));
  await Intern.updateOne({ _id: internId }, { $set: { overallProgress: value } });
  return value;
};

// Counts tasks by *effective* state. A task that is not completed and past its deadline is "overdue"
// even if the scheduler has not flipped its stored status yet. Uses indexed count queries only.
exports.taskStats = async (match = {}) => {
  const now = new Date();
  const [total, completed, overdue, inProgress, pending, progressRows] = await Promise.all([
    Task.countDocuments(match),
    Task.countDocuments({ ...match, status: 'Completed' }),
    Task.countDocuments({ ...match, status: { $ne: 'Completed' }, deadline: { $lt: now } }),
    Task.countDocuments({ ...match, status: 'In Progress', deadline: { $gte: now } }),
    Task.countDocuments({ ...match, status: 'Pending', deadline: { $gte: now } }),
    Task.find(match).select('progress').lean(),
  ]);

  return {
    total,
    completed,
    pending,
    inProgress,
    overdue,
    avgProgress: Math.round(average(progressRows.map((t) => t.progress || 0))),
    completionRate: total ? Math.round((completed / total) * 100) : 0,
  };
};

// Per-intern task counts for a list of interns (used in intern tables).
exports.statsByIntern = async (internIds) => {
  const now = new Date();
  const tasks = await Task.find({ intern: { $in: internIds } }).select('intern status deadline').lean();
  const out = {};
  tasks.forEach((t) => {
    const key = String(t.intern);
    const row = out[key] || (out[key] = { total: 0, completed: 0, overdue: 0 });
    row.total += 1;
    if (t.status === 'Completed') row.completed += 1;
    else if (t.deadline < now) row.overdue += 1;
  });
  return out;
};
