const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'task_assigned',
  'deadline_approaching',
  'task_completed',
  'submission_received',
  'submission_reviewed',
  'feedback_received',
  'revision_requested',
  'task_overdue',
  'system',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'recipientModel', index: true },
    recipientModel: { type: String, required: true, enum: ['Admin', 'Intern'] },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    link: { type: String, trim: true }, // frontend route opened on click
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.__v; return ret; },
});

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
