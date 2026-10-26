const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');

// GET /api/notifications — current user's notifications only
router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (req.query.unread === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: { page, limit, total, unreadCount }
    });
  } catch (err) {
    console.error('[GET /notifications]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/unread-count — lightweight badge count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/:id/read — mark one as read (ownership enforced)
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id // server-side ownership check
    });

    if (!notification) {
      // Return 404 regardless of whether it exists — do not leak existence to other users
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (err) {
    console.error('[PATCH /notifications/:id/read]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/read-all — mark all own notifications as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[PATCH /notifications/read-all]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
