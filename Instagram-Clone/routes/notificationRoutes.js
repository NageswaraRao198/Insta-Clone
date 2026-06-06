const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const requireAuth = require('../middlewares/requireAuth');

// Get notifications
router.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const pageLimit = Math.min(parseInt(limit), 50);

    const query = { receiverId: req.user._id };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const notifications = await Notification.find(query)
      .populate('senderId', '_id username fullName profilePic')
      .populate('postId', '_id images')
      .sort('-createdAt')
      .limit(pageLimit + 1);

    const hasMore = notifications.length > pageLimit;
    const result = hasMore ? notifications.slice(0, pageLimit) : notifications;
    const nextCursor = hasMore ? result[result.length - 1].createdAt.toISOString() : null;

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      receiverId: req.user._id,
      isRead: false
    });

    res.json({ notifications: result, nextCursor, hasMore, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notifications as read
router.put('/api/notifications/read', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { receiverId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
router.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      receiverId: req.user._id,
      isRead: false
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
