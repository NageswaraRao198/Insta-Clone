const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const commentSchema = new mongoose.Schema({
  postId: {
    type: ObjectId,
    ref: 'Post',
    required: true
  },
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  likes: [{ type: ObjectId, ref: 'User' }],
  parentComment: {
    type: ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{ type: ObjectId, ref: 'Comment' }]
}, { timestamps: true });

commentSchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
