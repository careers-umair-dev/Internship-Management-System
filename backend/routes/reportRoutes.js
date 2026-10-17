const router = require('express').Router();
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.use(protect);
router.get('/interns.csv', authorize('admin'), ctrl.internsCSV);
router.get('/tasks.csv', ctrl.tasksCSV);
router.get('/progress/:internId', param('internId').isMongoId().withMessage('Invalid intern id'), validate, ctrl.progressReport);

module.exports = router;
