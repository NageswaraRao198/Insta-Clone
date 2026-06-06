const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/PostModel');
const Notification = require('../models/Notification');
const requireAuth = require('../middlewares/requireAuth');
const upload = require('../middlewares/upload');
const { uploadToCloudinary } = require('../services/cloudinary');

// Search users (MUST be before :id route to avoid matching "search" as an ID)
router.get('/api/users/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } }
      ]
    })
      .select('_id username fullName profilePic')
      .limit(20);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
router.get('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const posts = await Post.find({ userId: user._id })
      .sort('-createdAt')
      .limit(30);

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/api/users/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, bio, website } = req.body;
    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (bio !== undefined) updates.bio = bio.substring(0, 150);
    if (website !== undefined) updates.website = website;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('-password -refreshToken');

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile picture
router.put('/api/users/profile-pic', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(422).json({ error: 'No image provided' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'instagram-clone/profiles');

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePic: result.url } },
      { new: true }
    ).select('-password -refreshToken');

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Follow user
router.post('/api/users/follow/:id', requireAuth, async (req, res) => {
  try {
    const userToFollow = req.params.id;

    if (userToFollow === req.user._id.toString()) {
      return res.status(422).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(userToFollow);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.followers.includes(req.user._id)) {
      return res.status(422).json({ error: 'Already following this user' });
    }

    await User.findByIdAndUpdate(userToFollow, {
      $addToSet: { followers: req.user._id }
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { following: userToFollow }
    });

    // Create notification
    const notification = new Notification({
      receiverId: userToFollow,
      senderId: req.user._id,
      type: 'follow'
    });
    await notification.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(userToFollow).emit('NEW_FOLLOWER', {
        senderId: req.user._id,
        senderName: req.user.fullName,
        senderPic: req.user.profilePic
      });
      io.to(userToFollow).emit('NEW_NOTIFICATION', notification);
    }

    res.json({ message: 'Followed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unfollow user
router.post('/api/users/unfollow/:id', requireAuth, async (req, res) => {
  try {
    const userToUnfollow = req.params.id;

    if (userToUnfollow === req.user._id.toString()) {
      return res.status(422).json({ error: 'Cannot unfollow yourself' });
    }

    await User.findByIdAndUpdate(userToUnfollow, {
      $pull: { followers: req.user._id }
    });

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { following: userToUnfollow }
    });

    res.json({ message: 'Unfollowed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
