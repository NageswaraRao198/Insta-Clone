const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const storySchema = new mongoose.Schema({
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  image: {
    url: { type: String, required: true },
    publicId: { type: String }
  },
  viewers: [{ type: ObjectId, ref: 'User' }],
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
}, { timestamps: true });

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);
