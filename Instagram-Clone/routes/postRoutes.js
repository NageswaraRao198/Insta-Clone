const express = require('express');
const router = express.Router();
const Post = require('../models/PostModel');
const User = require('../models/User');
const Notification = require('../models/Notification');
const requireAuth = require('../middlewares/requireAuth');
const upload = require('../middlewares/upload');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinary');

// Create post
router.post('/api/posts', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    const { caption } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(422).json({ error: 'At least one image is required' });
    }

    const imageUploads = await Promise.all(
      req.files.map(file => uploadToCloudinary(file.buffer, 'instagram-clone/posts'))
    );

    const post = new Post({
      userId: req.user._id,
      images: imageUploads,
      caption: caption || ''
    });

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('userId', '_id username fullName profilePic');

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get home feed (posts from people you follow + your own)
router.get('/api/posts/feed', requireAuth, async (req, res) => {
  try {
    const { cursor, limit = 10 } = req.query;
    const pageLimit = Math.min(parseInt(limit), 50);

    const query = {
      userId: { $in: [...req.user.following, req.user._id] }
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await Post.find(query)
      .populate('userId', '_id username fullName profilePic')
      .sort('-createdAt')
      .limit(pageLimit + 1);

    const hasMore = posts.length > pageLimit;
    const resultPosts = hasMore ? posts.slice(0, pageLimit) : posts;
    const nextCursor = hasMore ? resultPosts[resultPosts.length - 1].createdAt.toISOString() : null;

    res.json({ posts: resultPosts, nextCursor, hasMore });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get explore feed (posts from everyone, excluding following)
router.get('/api/posts/explore', requireAuth, async (req, res) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const pageLimit = Math.min(parseInt(limit), 50);

    const query = {
      userId: { $nin: [...req.user.following, req.user._id] }
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await Post.find(query)
      .populate('userId', '_id username fullName profilePic')
      .sort('-createdAt')
      .limit(pageLimit + 1);

    const hasMore = posts.length > pageLimit;
    const resultPosts = hasMore ? posts.slice(0, pageLimit) : posts;
    const nextCursor = hasMore ? resultPosts[resultPosts.length - 1].createdAt.toISOString() : null;

    res.json({ posts: resultPosts, nextCursor, hasMore });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single post
router.get('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('userId', '_id username fullName profilePic');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update post caption
router.put('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    post.caption = req.body.caption || '';
    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('userId', '_id username fullName profilePic');

    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post
router.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete images from cloudinary
    await Promise.all(
      post.images
        .filter(img => img.publicId)
        .map(img => deleteFromCloudinary(img.publicId))
    );

    await Post.findByIdAndDelete(post._id);

    // Remove from saved posts
    await User.updateMany(
      { savedPosts: post._id },
      { $pull: { savedPosts: post._id } }
    );

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like post
router.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user._id } },
      { new: true }
    ).populate('userId', '_id username fullName profilePic');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create notification (don't notify yourself)
    if (post.userId._id.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        receiverId: post.userId._id,
        senderId: req.user._id,
        type: 'like',
        postId: post._id
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(post.userId._id.toString()).emit('POST_LIKED', {
          postId: post._id,
          userId: req.user._id,
          userName: req.user.username
        });
        io.to(post.userId._id.toString()).emit('NEW_NOTIFICATION', notification);
      }
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlike post
router.post('/api/posts/:id/unlike', requireAuth, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.user._id } },
      { new: true }
    ).populate('userId', '_id username fullName profilePic');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Save post
router.post('/api/posts/:id/save', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await Post.findByIdAndUpdate(req.params.id, {
      $addToSet: { savedBy: req.user._id }
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { savedPosts: req.params.id }
    });

    res.json({ message: 'Post saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unsave post
router.post('/api/posts/:id/unsave', requireAuth, async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      $pull: { savedBy: req.user._id }
    });

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedPosts: req.params.id }
    });

    res.json({ message: 'Post unsaved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's posts
router.get('/api/posts/user/:userId', requireAuth, async (req, res) => {
  try {
    const { cursor, limit = 12 } = req.query;
    const pageLimit = Math.min(parseInt(limit), 50);

    const query = { userId: req.params.userId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await Post.find(query)
      .populate('userId', '_id username fullName profilePic')
      .sort('-createdAt')
      .limit(pageLimit + 1);

    const hasMore = posts.length > pageLimit;
    const resultPosts = hasMore ? posts.slice(0, pageLimit) : posts;
    const nextCursor = hasMore ? resultPosts[resultPosts.length - 1].createdAt.toISOString() : null;

    res.json({ posts: resultPosts, nextCursor, hasMore });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get saved posts
router.get('/api/posts/saved/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedPosts',
      populate: { path: 'userId', select: '_id username fullName profilePic' },
      options: { sort: { createdAt: -1 } }
    });

    res.json(user.savedPosts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
