const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  { name: String, url: String, size: Number, mimeType: String },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    category: { type: String, trim: true, default: 'General', index: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium', index: true },
    priorityRank: { type: Number, default: 2 }, // 1=Low .. 4=Critical, used for correct priority sorting
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending',
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    deadline: { type: Date, required: true, index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    attachments: [attachmentSchema],
    submissionStatus: {
      type: String,
      enum: ['none', 'pending_review', 'approved', 'rejected', 'revision_requested'],
      default: 'none',
    },
    latestSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
    completedAt: Date,
    deadlineReminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PRIORITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

taskSchema.pre('validate', function (next) {
  this.priorityRank = PRIORITY_RANK[this.priority] || 2;
  if (this.startDate && this.deadline && this.deadline < this.startDate) {
    this.invalidate('deadline', 'Deadline cannot be earlier than the start date');
  }
  next();
});

// Completed tasks always have 100% progress and a completedAt timestamp.
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'Completed') {
      this.progress = 100;
      this.completedAt = this.completedAt || new Date();
    } else {
      this.completedAt = undefined;
    }
  }
  next();
});

taskSchema.virtual('isOverdue').get(function () {
  return this.status !== 'Completed' && this.deadline < new Date();
});

taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ intern: 1, status: 1, deadline: 1 });

taskSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => { delete ret.__v; delete ret.id; return ret; },
});

module.exports = mongoose.model('Task', taskSchema);
