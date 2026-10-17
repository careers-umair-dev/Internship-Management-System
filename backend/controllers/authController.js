const Admin = require('../models/Admin');
const Intern = require('../models/Intern');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { logActivity } = require('../services/activityService');

const MODELS = { admin: Admin, intern: Intern };

// POST /api/auth/login   body: { email, password, role }
exports.login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  const Model = MODELS[role];

  const user = await Model.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password to avoid user enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (role === 'admin' && !user.isActive) throw ApiError.forbidden('This account has been disabled');
  if (role === 'intern' && user.status === 'inactive') {
    throw ApiError.forbidden('This account has been deactivated. Contact your administrator.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  logActivity({
    actor: user,
    action: 'auth.login',
    entityType: 'Auth',
    intern: role === 'intern' ? user._id : undefined,
    description: `${user.name} logged in`,
  });

  res.json({ success: true, token: signToken(user), user });
});

// POST /api/auth/register  (public intern self-registration)
exports.registerIntern = asyncHandler(async (req, res) => {
  const { name, email, password, phone, department, position } = req.body;
  const user = await Intern.create({ name, email, password, phone, department, position });

  logActivity({
    actor: user,
    action: 'auth.register',
    entityType: 'Auth',
    intern: user._id,
    description: `${user.name} created an intern account`,
  });

  res.status(201).json({
    success: true,
    message: 'Intern account created',
    token: signToken(user),
    user,
  });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = req.user.role === 'intern' ? await Intern.findById(req.user._id).populate('mentor', 'name email') : req.user;
  res.json({ success: true, user });
});

// PUT /api/auth/profile  (name, phone, avatar + intern-only skills)
exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatar'];
  if (req.user.role === 'intern') allowed.push('skills');
  if (req.user.role === 'admin') allowed.push('designation');

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  });
  await req.user.save();

  res.json({ success: true, message: 'Profile updated', user: req.user });
});

// PUT /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const Model = MODELS[req.user.role];
  const user = await Model.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = newPassword; // hashed by pre-save hook
  await user.save();

  logActivity({
    actor: user,
    action: 'auth.password_changed',
    entityType: 'Auth',
    intern: user.role === 'intern' ? user._id : undefined,
    description: `${user.name} changed their password`,
  });

  res.json({ success: true, message: 'Password updated successfully', token: signToken(user) });
});

// PUT /api/auth/avatar  (multipart, field "avatar")
exports.updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Image file is required');
  if (!req.file.mimetype.startsWith('image/')) throw ApiError.badRequest('Avatar must be an image');
  req.user.avatar = `/uploads/${req.file.filename}`;
  await req.user.save();
  res.json({ success: true, user: req.user });
});
