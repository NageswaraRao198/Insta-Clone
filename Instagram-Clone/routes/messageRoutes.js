const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const requireAuth = require('../middlewares/requireAuth');

// Send message
router.post('/api/messages', requireAuth, async (req, res) => {
  try {
    const { receiverId, text, image } = req.body;

    if (!receiverId || (!text && !image)) {
      return res.status(422).json({ error: 'Receiver and content are required' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    const message = new Message({
      senderId: req.user._id,
      receiverId,
      text: text || '',
      image: image || ''
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', '_id username fullName profilePic')
      .populate('receiverId', '_id username fullName profilePic');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(receiverId).emit('NEW_MESSAGE', populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get conversation between two users
router.get('/api/messages/:userId', requireAuth, async (req, res) => {
  try {
    const { cursor, limit = 30 } = req.query;
    const pageLimit = Math.min(parseInt(limit), 50);

    const query = {
      $or: [
        { senderId: req.user._id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user._id }
      ]
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .populate('senderId', '_id username fullName profilePic')
      .populate('receiverId', '_id username fullName profilePic')
      .sort('-createdAt')
      .limit(pageLimit + 1);

    const hasMore = messages.length > pageLimit;
    const result = hasMore ? messages.slice(0, pageLimit) : messages;
    const nextCursor = hasMore ? result[result.length - 1].createdAt.toISOString() : null;

    // Mark messages as read
    await Message.updateMany(
      { senderId: req.params.userId, receiverId: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ messages: result.reverse(), nextCursor, hasMore });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get conversations list
router.get('/api/messages', requireAuth, async (req, res) => {
  try {
    // Get unique conversations
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: req.user._id },
            { receiverId: req.user._id }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', req.user._id] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', req.user._id] }, { $eq: ['$read', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    // Populate user details
    const populatedConversations = await User.populate(messages, {
      path: '_id',
      select: '_id username fullName profilePic'
    });

    res.json(populatedConversations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
