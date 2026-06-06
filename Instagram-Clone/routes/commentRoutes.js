const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/PostModel');
const Notification = require('../models/Notification');
const requireAuth = require('../middlewares/requireAuth');

// Create comment
router.post('/api/comments', requireAuth, async (req, res) => {
  try {
    const { postId, text } = req.body;

    if (!postId || !text) {
      return res.status(422).json({ error: 'Post ID and text are required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = new Comment({
      postId,
      userId: req.user._id,
      text: text.substring(0, 1000)
    });

    await comment.save();

    // Increment comments count
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', '_id username fullName profilePic');

    // Create notification
    if (post.userId.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        receiverId: post.userId,
        senderId: req.user._id,
        type: 'comment',
        postId,
        commentId: comment._id
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(post.userId.toString()).emit('NEW_COMMENT', {
          postId,
          comment: populatedComment
        });
        io.to(post.userId.toString()).emit('NEW_NOTIFICATION', notification);
      }
    }

    res.status(201).json(populatedComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for a post
router.get('/api/comments/:postId', requireAuth, async (req, res) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const pageLimit = Math.min(parseInt(limit), 50);

    const query = { postId: req.params.postId, parentComment: null };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const comments = await Comment.find(query)
      .populate('userId', '_id username fullName profilePic')
      .populate({
        path: 'replies',
        populate: { path: 'userId', select: '_id username fullName profilePic' },
        options: { limit: 3, sort: { createdAt: 1 } }
      })
      .sort('-createdAt')
      .limit(pageLimit + 1);

    const hasMore = comments.length > pageLimit;
    const resultComments = hasMore ? comments.slice(0, pageLimit) : comments;
    const nextCursor = hasMore ? resultComments[resultComments.length - 1].createdAt.toISOString() : null;

    res.json({ comments: resultComments, nextCursor, hasMore });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment
router.delete('/api/comments/:id', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId.toString() !== req.user._id.toString()) {
      // Allow post owner to delete comments too
      const post = await Post.findById(comment.postId);
      if (!post || post.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    // If it's a parent comment, delete all replies
    if (!comment.parentComment) {
      const replyCount = await Comment.countDocuments({ parentComment: comment._id });
      await Comment.deleteMany({ parentComment: comment._id });
      await Post.findByIdAndUpdate(comment.postId, {
        $inc: { commentsCount: -(1 + replyCount) }
      });
    } else {
      // Remove from parent's replies array
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id }
      });
      await Post.findByIdAndUpdate(comment.postId, {
        $inc: { commentsCount: -1 }
      });
    }

    await Comment.findByIdAndDelete(comment._id);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reply to comment
router.post('/api/comments/:id/reply', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    const parentId = req.params.id;

    if (!text) {
      return res.status(422).json({ error: 'Text is required' });
    }

    const parentComment = await Comment.findById(parentId);
    if (!parentComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reply = new Comment({
      postId: parentComment.postId,
      userId: req.user._id,
      text: text.substring(0, 1000),
      parentComment: parentId
    });

    await reply.save();

    await Comment.findByIdAndUpdate(parentId, {
      $push: { replies: reply._id }
    });

    await Post.findByIdAndUpdate(parentComment.postId, {
      $inc: { commentsCount: 1 }
    });

    const populatedReply = await Comment.findById(reply._id)
      .populate('userId', '_id username fullName profilePic');

    // Notify parent comment author
    if (parentComment.userId.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        receiverId: parentComment.userId,
        senderId: req.user._id,
        type: 'reply',
        postId: parentComment.postId,
        commentId: reply._id
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(parentComment.userId.toString()).emit('NEW_NOTIFICATION', notification);
      }
    }

    res.status(201).json(populatedReply);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like comment
router.post('/api/comments/:id/like', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user._id } },
      { new: true }
    ).populate('userId', '_id username fullName profilePic');

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlike comment
router.post('/api/comments/:id/unlike', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.user._id } },
      { new: true }
    ).populate('userId', '_id username fullName profilePic');

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
