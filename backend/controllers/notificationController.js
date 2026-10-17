const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const mine = (req) => ({ recipient: req.user._id, recipientModel: req.user.role === 'admin' ? 'Admin' : 'Intern' });

// GET /api/notifications?unread=true
exports.listNotifications = asyncHandler(async (req, res) => {
  const filter = mine(req);
  if (req.query.unread === 'true') filter.isRead = false;
  const pg = getPagination(req.query, { defaultLimit: 20 });
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...mine(req), isRead: false }),
  ]);
  res.json({ success: true, unreadCount: unread, ...paginatedResponse(items, total, pg) });
});

exports.unreadCount = asyncHandler(async (req, res) => {
  res.json({ success: true, unreadCount: await Notification.countDocuments({ ...mine(req), isRead: false }) });
});

exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, ...mine(req) }, { isRead: true, readAt: new Date() }, { new: true });
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ success: true, notification: n });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ ...mine(req), isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ success: true, updated: r.modifiedCount });
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndDelete({ _id: req.params.id, ...mine(req) });
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ success: true, message: 'Notification removed' });
});

exports.clearAll = asyncHandler(async (req, res) => {
  const r = await Notification.deleteMany(mine(req));
  res.json({ success: true, deleted: r.deletedCount });
});
