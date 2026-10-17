const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/submissionController');

router.use(protect);

router.get('/', ctrl.listSubmissions);
router.get('/:id', param('id').isMongoId().withMessage('Invalid submission id'), validate, ctrl.getSubmission);

router.post(
  '/',
  authorize('intern'),
  upload.array('files', 5),
  [
    body('task').isMongoId().withMessage('A valid task is required'),
    body('description').optional().trim().isLength({ max: 5000 }),
    body('link').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Link must be a valid http(s) URL'),
  ],
  validate,
  ctrl.createSubmission
);

router.patch(
  '/:id/review',
  authorize('admin'),
  param('id').isMongoId().withMessage('Invalid submission id'),
  [
    body('status').isIn(['approved', 'rejected', 'revision_requested'])
      .withMessage('Status must be approved, rejected or revision_requested'),
    body('feedback').optional().trim().isLength({ max: 3000 }),
    body('feedback').if(body('status').isIn(['rejected', 'revision_requested']))
      .trim().notEmpty().withMessage('Feedback is required when rejecting or requesting a revision'),
    body('rating').optional({ checkFalsy: true }).isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5').toInt(),
  ],
  validate,
  ctrl.reviewSubmission
);

module.exports = router;
