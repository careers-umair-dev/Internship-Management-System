const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const internSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: '' },
    department: { type: String, trim: true, index: true },
    position: { type: String, trim: true }, // e.g. "Frontend Intern"
    joiningDate: { type: Date, default: Date.now },
    durationMonths: { type: Number, default: 3, min: 1, max: 24 },
    skills: [{ type: String, trim: true }],
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    status: { type: String, enum: ['active', 'inactive', 'completed'], default: 'active', index: true },
    overallProgress: { type: Number, default: 0, min: 0, max: 100 }, // recalculated by progress service
    role: { type: String, enum: ['intern'], default: 'intern', immutable: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

internSchema.virtual('internshipEndDate').get(function () {
  if (!this.joiningDate) return null;
  const d = new Date(this.joiningDate);
  d.setMonth(d.getMonth() + (this.durationMonths || 0));
  return d;
});

internSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

internSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

internSchema.index({ name: 'text', email: 'text', department: 'text' });

internSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => { delete ret.password; delete ret.__v; delete ret.id; return ret; },
});

module.exports = mongoose.model('Intern', internSchema);
