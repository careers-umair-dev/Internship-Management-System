const cron = require('node-cron');
const Task = require('../models/Task');
const { notify } = require('./notificationService');

const HOURS_24 = 24 * 60 * 60 * 1000;

// 1) Flags tasks past their deadline as Overdue (+ notifies once)
// 2) Sends a single reminder for tasks due within 24 hours
exports.runDeadlineChecks = async () => {
  const now = new Date();

  const late = await Task.find({ status: { $in: ['Pending', 'In Progress'] }, deadline: { $lt: now } })
    .select('title intern assignedBy');
  if (late.length) {
    await Task.updateMany({ _id: { $in: late.map((t) => t._id) } }, { $set: { status: 'Overdue' } });
    await Promise.all(
      late.flatMap((t) => [
        notify({ recipient: t.intern, recipientModel: 'Intern', type: 'task_overdue', title: 'Task overdue',
          message: `"${t.title}" has passed its deadline.`, link: `/intern/tasks/${t._id}` }),
        notify({ recipient: t.assignedBy, recipientModel: 'Admin', type: 'task_overdue', title: 'Task overdue',
          message: `"${t.title}" is now overdue.`, link: `/admin/tasks/${t._id}` }),
      ])
    );
  }

  const soon = await Task.find({
    status: { $in: ['Pending', 'In Progress'] },
    deadline: { $gte: now, $lte: new Date(now.getTime() + HOURS_24) },
    deadlineReminderSent: false,
  }).select('title intern deadline');
  if (soon.length) {
    await Task.updateMany({ _id: { $in: soon.map((t) => t._id) } }, { $set: { deadlineReminderSent: true } });
    await Promise.all(
      soon.map((t) =>
        notify({ recipient: t.intern, recipientModel: 'Intern', type: 'deadline_approaching', title: 'Deadline approaching',
          message: `"${t.title}" is due within 24 hours.`, link: `/intern/tasks/${t._id}` })
      )
    );
  }

  return { markedOverdue: late.length, remindersSent: soon.length };
};

exports.startScheduler = () => {
  if (process.env.DISABLE_CRON === 'true') return;
  const run = () => exports.runDeadlineChecks().catch((e) => console.error('Deadline check failed:', e.message));
  run(); // once on boot, so a restart never leaves stale statuses
  cron.schedule('*/10 * * * *', run);
  console.log('Deadline scheduler started (every 10 min)');
};
