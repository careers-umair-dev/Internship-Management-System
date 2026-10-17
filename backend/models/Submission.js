const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  { name: String, url: String, size: Number, mimeType: String },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true, index: true },
    version: { type: Number, default: 1 }, // increments with every resubmission
    description: { type: String, trim: true, maxlength: 5000 },
    files: [fileSchema],
    link: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revision_requested'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

submissionSchema.pre('validate', function (next) {
  if (!this.description && !this.link && !(this.files && this.files.length)) {
    this.invalidate('description', 'Provide a description, a file, or a link');
  }
  next();
});

submissionSchema.index({ task: 1, version: -1 });

submissionSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.__v; return ret; },
});

module.exports = mongoose.model('Submission', submissionSchema);
