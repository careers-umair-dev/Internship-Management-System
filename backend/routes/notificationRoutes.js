const router = require('express').Router();
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

const id = param('id').isMongoId().withMessage('Invalid notification id');

router.use(protect);
router.get('/', ctrl.listNotifications);
router.get('/unread-count', ctrl.unreadCount);
router.patch('/read-all', ctrl.markAllRead);
router.delete('/', ctrl.clearAll);
router.patch('/:id/read', id, validate, ctrl.markRead);
router.delete('/:id', id, validate, ctrl.deleteNotification);

module.exports = router;
