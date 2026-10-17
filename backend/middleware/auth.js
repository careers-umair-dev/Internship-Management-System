const Admin = require('../models/Admin');
const Intern = require('../models/Intern');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

const MODELS = { admin: Admin, intern: Intern };

// Verifies the Bearer token and attaches the full user document to req.user.
exports.protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) throw ApiError.unauthorized('Authentication token missing');

  const payload = verifyToken(token); // throws JsonWebTokenError / TokenExpiredError -> error handler
  const Model = MODELS[payload.role];
  if (!Model) throw ApiError.unauthorized('Invalid token');

  const user = await Model.findById(payload.id);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.role === 'admin' && !user.isActive) throw ApiError.forbidden('This account has been disabled');
  if (user.role === 'intern' && user.status === 'inactive') {
    throw ApiError.forbidden('This account has been deactivated. Contact your administrator.');
  }

  req.user = user;
  next();
});

// Role-based access control: authorize('admin'), authorize('admin', 'intern')
exports.authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
