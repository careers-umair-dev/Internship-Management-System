const router = require('express').Router();
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(protect);
router.get('/admin', authorize('admin'), ctrl.adminDashboard);
router.get('/intern', authorize('intern'), ctrl.internDashboard);
router.get('/interns/:id', authorize('admin'), param('id').isMongoId(), validate, ctrl.internPerformance);

module.exports = router;
