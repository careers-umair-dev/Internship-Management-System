const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    type: { type: String, enum: ['general', 'approval', 'rejection', 'revision'], default: 'general' },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

feedbackSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.__v; return ret; },
});

module.exports = mongoose.model('Feedback', feedbackSchema);
