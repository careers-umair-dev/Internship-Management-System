const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/feedbackController');

router.use(protect);
router.get('/', ctrl.listFeedback);
router.post(
  '/',
  authorize('admin'),
  [
    body('task').isMongoId().withMessage('A valid task is required'),
    body('message').trim().isLength({ min: 2, max: 3000 }).withMessage('Feedback must be 2-3000 characters'),
    body('rating').optional({ checkFalsy: true }).isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5').toInt(),
  ],
  validate,
  ctrl.createFeedback
);
router.delete('/:id', authorize('admin'), param('id').isMongoId(), validate, ctrl.deleteFeedback);

module.exports = router;
