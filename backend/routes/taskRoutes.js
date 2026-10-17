const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/taskController');

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue'];
const idParam = param('id').isMongoId().withMessage('Invalid task id');

const taskFields = (required) => {
  const opt = (chain) => (required ? chain : chain.optional());
  return [
    opt(body('title').trim().isLength({ min: 3, max: 140 }).withMessage('Title must be 3-140 characters')),
    opt(body('intern').isMongoId().withMessage('A valid intern is required')),
    opt(body('deadline').isISO8601().withMessage('A valid deadline is required')),
    body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description is too long'),
    body('category').optional().trim().isLength({ min: 1, max: 50 }),
    body('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
    body('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid start date'),
  ];
};

router.use(protect);

router.get('/', ctrl.listTasks);
router.get('/board', ctrl.taskBoard);
router.get('/categories', ctrl.listCategories);
router.get('/:id', idParam, validate, ctrl.getTask);

router.post('/', authorize('admin'), upload.array('attachments', 5), taskFields(true), validate, ctrl.createTask);
router.put('/:id', authorize('admin'), idParam, upload.array('attachments', 5), taskFields(false), validate, ctrl.updateTask);
router.patch(
  '/:id/status',
  authorize('admin'),
  idParam,
  [
    body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
    body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100').toInt(),
  ],
  validate,
  ctrl.changeStatus
);
router.delete('/:id', authorize('admin'), idParam, validate, ctrl.deleteTask);

router.patch(
  '/:id/progress',
  authorize('intern'),
  idParam,
  [
    body('progress').optional().isInt({ min: 0, max: 99 })
      .withMessage('Progress must be 0-99. Submit your work to complete the task.').toInt(),
    body('status').optional().isIn(['Pending', 'In Progress']).withMessage('You can only set Pending or In Progress'),
  ],
  validate,
  ctrl.updateProgress
);

module.exports = router;
