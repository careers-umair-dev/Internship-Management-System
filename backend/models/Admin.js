const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: '' },
    designation: { type: String, default: 'Administrator', trim: true },
    role: { type: String, enum: ['admin'], default: 'admin', immutable: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

adminSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.password; delete ret.__v; return ret; },
});

module.exports = mongoose.model('Admin', adminSchema);
