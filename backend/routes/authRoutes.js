const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT) || 20, // attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.REGISTRATION_RATE_LIMIT) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again in an hour.' },
});

const passwordRule = (field) =>
  body(field)
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number');

router.post(
  '/register',
  registrationLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    passwordRule('password'),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 20 }).withMessage('Invalid phone number'),
    body('department').optional().trim().isLength({ max: 60 }).withMessage('Department must be at most 60 characters'),
    body('position').optional().trim().isLength({ max: 60 }).withMessage('Position must be at most 60 characters'),
  ],
  validate,
  ctrl.registerIntern
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').isIn(['admin', 'intern']).withMessage('Role must be admin or intern'),
  ],
  validate,
  ctrl.login
);

router.get('/me', protect, ctrl.getMe);

router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 20 }).withMessage('Invalid phone number'),
    body('skills').optional().isArray({ max: 30 }).withMessage('Skills must be an array'),
  ],
  validate,
  ctrl.updateProfile
);

router.put('/avatar', protect, upload.single('avatar'), validate, ctrl.updateAvatar);

router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    passwordRule('newPassword'),
    body('newPassword').custom((v, { req }) => v !== req.body.currentPassword)
      .withMessage('New password must be different from the current one'),
  ],
  validate,
  ctrl.changePassword
);

module.exports = router;
