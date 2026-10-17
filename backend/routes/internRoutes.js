const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/internController');

const idParam = param('id').isMongoId().withMessage('Invalid intern id');

const fields = (required) => {
  const opt = (chain) => (required ? chain : chain.optional());
  return [
    opt(body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters')),
    opt(body('email').isEmail().withMessage('A valid email is required').normalizeEmail()),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 20 }).withMessage('Invalid phone number'),
    body('department').optional().trim().isLength({ max: 60 }),
    body('position').optional().trim().isLength({ max: 60 }),
    body('joiningDate').optional().isISO8601().withMessage('Invalid joining date'),
    body('durationMonths').optional().isInt({ min: 1, max: 24 }).withMessage('Duration must be 1-24 months').toInt(),
    body('skills').optional().isArray({ max: 30 }).withMessage('Skills must be an array'),
    body('skills.*').optional().isString().trim().isLength({ max: 40 }),
    body('status').optional().isIn(['active', 'inactive', 'completed']).withMessage('Invalid status'),
    body('mentor').optional().isMongoId().withMessage('Invalid mentor id'),
    body('password')
      .optional({ checkFalsy: true })
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
      .matches(/\d/).withMessage('Password must contain a number'),
  ];
};

router.use(protect, authorize('admin'));

router.get('/', ctrl.listInterns);
router.get('/departments', ctrl.listDepartments);
router.post('/', fields(true), validate, ctrl.createIntern);
router.get('/:id', idParam, validate, ctrl.getIntern);
router.put('/:id', idParam, fields(false), validate, ctrl.updateIntern);
router.put('/:id/avatar', idParam, upload.single('avatar'), validate, ctrl.updateAvatar);
router.delete('/:id', idParam, validate, ctrl.deleteIntern);

module.exports = router;
