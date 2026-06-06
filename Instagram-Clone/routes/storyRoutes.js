const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');
const requireAuth = require('../middlewares/requireAuth');
const upload = require('../middlewares/upload');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinary');

// Create story
router.post('/api/stories', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(422).json({ error: 'Image is required' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'instagram-clone/stories');

    const story = new Story({
      userId: req.user._id,
      image: result
    });

    await story.save();

    const populatedStory = await Story.findById(story._id)
      .populate('userId', '_id username fullName profilePic');

    res.status(201).json(populatedStory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// Get stories from following users
router.get('/api/stories', requireAuth, async (req, res) => {
  try {
    const followingIds = [...req.user.following, req.user._id];

    const stories = await Story.find({
      userId: { $in: followingIds },
      expiresAt: { $gt: new Date() }
    })
      .populate('userId', '_id username fullName profilePic')
      .sort('-createdAt');

    // Group stories by user
    const groupedStories = {};
    stories.forEach(story => {
      const userId = story.userId._id.toString();
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          user: story.userId,
          stories: [],
          hasUnviewed: false
        };
      }
      groupedStories[userId].stories.push(story);
      if (!story.viewers.includes(req.user._id)) {
        groupedStories[userId].hasUnviewed = true;
      }
    });

    res.json(Object.values(groupedStories));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View story (mark as viewed)
router.post('/api/stories/:id/view', requireAuth, async (req, res) => {
  try {
    await Story.findByIdAndUpdate(req.params.id, {
      $addToSet: { viewers: req.user._id }
    });

    res.json({ message: 'Story viewed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete story
router.delete('/api/stories/:id', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete image from Cloudinary if publicId exists
    if (story.image && story.image.publicId) {
      await deleteFromCloudinary(story.image.publicId).catch(() => {});
    }

    await Story.findByIdAndDelete(story._id);
    res.json({ message: 'Story deleted' });
  } catch (err) {
    console.error('Delete story error:', err.message);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

module.exports = router;
