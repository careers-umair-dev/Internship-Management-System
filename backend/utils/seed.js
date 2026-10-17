// Usage: npm run seed          -> creates demo data if the DB has no admin
//        npm run seed:reset    -> wipes all collections first
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const Intern = require('../models/Intern');
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');

const day = 24 * 60 * 60 * 1000;
const ago = (d) => new Date(Date.now() - d * day);
const ahead = (d) => new Date(Date.now() + d * day);

const run = async () => {
  await connectDB();

  if (process.argv.includes('--reset')) {
    await Promise.all([Admin, Intern, Task, Submission, Feedback, Notification, Activity].map((m) => m.deleteMany({})));
    console.log('Collections cleared');
  } else if (await Admin.exists({})) {
    console.log('Data already exists. Use `npm run seed:reset` to start fresh.');
    return;
  }

  const admin = await Admin.create({
    name: 'Ayesha Khan',
    email: 'admin@internhub.com',
    password: 'Admin@123',
    phone: '+92 300 1234567',
    designation: 'Program Manager',
  });

  const internData = [
    { name: 'Ali Raza', email: 'ali@internhub.com', department: 'Engineering', position: 'Frontend Intern', skills: ['React', 'Tailwind', 'JavaScript'], joiningDate: ago(45) },
    { name: 'Sara Ahmed', email: 'sara@internhub.com', department: 'Engineering', position: 'Backend Intern', skills: ['Node.js', 'MongoDB', 'Express'], joiningDate: ago(40) },
    { name: 'Hamza Malik', email: 'hamza@internhub.com', department: 'Design', position: 'UI/UX Intern', skills: ['Figma', 'Prototyping'], joiningDate: ago(30) },
    { name: 'Fatima Noor', email: 'fatima@internhub.com', department: 'Marketing', position: 'Content Intern', skills: ['SEO', 'Copywriting'], joiningDate: ago(20) },
  ];
  const interns = [];
  for (const d of internData) {
    interns.push(await Intern.create({ ...d, password: 'Intern@123', phone: '+92 311 0000000', durationMonths: 3, mentor: admin._id }));
  }

  const [ali, sara, hamza, fatima] = interns;
  const t = (intern, title, category, priority, status, start, deadline, progress = 0, extra = {}) => ({
    title, description: `${title} - complete according to the project guidelines.`, intern: intern._id,
    assignedBy: admin._id, category, priority, status, startDate: start, deadline, progress, ...extra,
  });

  const tasks = [
    t(ali, 'Build responsive landing page', 'Development', 'High', 'Completed', ago(30), ago(20), 100, { submissionStatus: 'approved' }),
    t(ali, 'Integrate REST API in dashboard', 'Development', 'Critical', 'In Progress', ago(7), ahead(3), 60),
    t(ali, 'Write unit tests for components', 'Testing', 'Medium', 'Pending', ago(1), ahead(10)),
    t(sara, 'Design user authentication API', 'Development', 'High', 'Completed', ago(28), ago(18), 100, { submissionStatus: 'approved' }),
    t(sara, 'Optimise MongoDB queries', 'Development', 'Medium', 'In Progress', ago(5), ahead(5), 40),
    t(sara, 'Write API documentation', 'Documentation', 'Low', 'Pending', ago(2), ago(1)), // overdue demo
    t(hamza, 'Create dashboard wireframes', 'Design', 'High', 'Completed', ago(20), ago(10), 100, { submissionStatus: 'approved' }),
    t(hamza, 'Design system color palette', 'Design', 'Medium', 'In Progress', ago(4), ahead(2), 70),
    t(fatima, 'Write 3 blog posts', 'Content', 'Medium', 'In Progress', ago(10), ahead(4), 33),
    t(fatima, 'Keyword research report', 'Research', 'High', 'Pending', ago(3), ago(2)), // overdue demo
  ];

  const created = [];
  for (const d of tasks) {
    const task = new Task(d);
    if (d.status === 'Completed') task.completedAt = ago(12);
    await task.save();
    created.push(task);
  }

  // One completed task with submission + approval feedback for demo history
  const done = created[0];
  const sub = await Submission.create({
    task: done._id, intern: ali._id, version: 1, description: 'Landing page completed and deployed.',
    link: 'https://example.com/landing', status: 'approved', reviewedBy: admin._id, reviewedAt: ago(19),
  });
  done.latestSubmission = sub._id;
  await done.save();
  await Feedback.create({
    task: done._id, submission: sub._id, intern: ali._id, admin: admin._id,
    type: 'approval', message: 'Excellent work! Clean layout and great responsiveness.', rating: 5,
  });

  // Keep overallProgress consistent with seeded tasks (average task progress)
  for (const intern of interns) {
    const own = created.filter((x) => String(x.intern) === String(intern._id));
    intern.overallProgress = Math.round(own.reduce((s, x) => s + x.progress, 0) / (own.length || 1));
    await intern.save();
  }

  await Notification.create({
    recipient: ali._id, recipientModel: 'Intern', type: 'feedback_received',
    title: 'New feedback received', message: 'Your submission for "Build responsive landing page" was approved.',
    link: '/intern/feedback',
  });

  console.log('\nSeed complete. Demo credentials:');
  console.log('  Admin  -> admin@internhub.com / Admin@123');
  console.log('  Intern -> ali@internhub.com   / Intern@123  (also sara, hamza, fatima @internhub.com)\n');
};

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
