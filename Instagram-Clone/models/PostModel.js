const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const postSchema = new mongoose.Schema({
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String }
  }],
  caption: {
    type: String,
    maxlength: 2200,
    default: ''
  },
  likes: [{ type: ObjectId, ref: 'User' }],
  commentsCount: {
    type: Number,
    default: 0
  },
  savedBy: [{ type: ObjectId, ref: 'User' }]
}, { timestamps: true });

postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
