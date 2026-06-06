const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() { return !this.googleId; }
  },
  profilePic: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 150,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  followers: [{ type: ObjectId, ref: 'User' }],
  following: [{ type: ObjectId, ref: 'User' }],
  savedPosts: [{ type: ObjectId, ref: 'Post' }],
  googleId: {
    type: String,
    default: null
  },
  refreshToken: {
    type: String,
    default: null
  }
}, { timestamps: true });

userSchema.index({ username: 'text', fullName: 'text' });

module.exports = mongoose.model('User', userSchema);
