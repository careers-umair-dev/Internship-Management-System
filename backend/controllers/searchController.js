const Intern = require('../models/Intern');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex } = require('../utils/pagination');

// GET /api/search?q=  -> admin: interns + tasks, intern: own tasks
exports.globalSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ success: true, interns: [], tasks: [] });
  const rx = new RegExp(escapeRegex(q), 'i');

  const taskFilter = { $or: [{ title: rx }, { category: rx }] };
  if (req.user.role === 'intern') taskFilter.intern = req.user._id;

  const [tasks, interns] = await Promise.all([
    Task.find(taskFilter).limit(6).select('title status priority deadline intern').populate('intern', 'name'),
    req.user.role === 'admin'
      ? Intern.find({ $or: [{ name: rx }, { email: rx }, { department: rx }] }).limit(6).select('name email department avatar status')
      : [],
  ]);
  res.json({ success: true, interns, tasks });
});
