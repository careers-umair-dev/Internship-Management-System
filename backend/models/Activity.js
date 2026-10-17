const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'actorModel' },
    actorModel: { type: String, required: true, enum: ['Admin', 'Intern'] },
    actorName: { type: String, required: true },
    action: { type: String, required: true, index: true }, // e.g. task.created, submission.reviewed
    entityType: { type: String, enum: ['Task', 'Intern', 'Submission', 'Feedback', 'Auth', 'System'] },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', index: true },
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ createdAt: -1 });

activitySchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.__v; return ret; },
});

module.exports = mongoose.model('Activity', activitySchema);
