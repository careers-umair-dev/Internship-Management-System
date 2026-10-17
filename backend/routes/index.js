const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { listActivity } = require('../controllers/dashboardController');
const { globalSearch } = require('../controllers/searchController');

router.use('/auth', require('./authRoutes'));
router.use('/interns', require('./internRoutes'));
router.use('/tasks', require('./taskRoutes'));
router.use('/submissions', require('./submissionRoutes'));
router.use('/feedback', require('./feedbackRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/reports', require('./reportRoutes'));
router.get('/activity', protect, listActivity);
router.get('/search', protect, globalSearch);

module.exports = router;
