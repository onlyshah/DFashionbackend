const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: [2000, 'Content cannot exceed 2000 characters']
    },
    images: [{
      url: { type: String, required: true },
      alt: String
    }],
    videos: [{
      url: { type: String, required: true },
      thumbnail: String
    }],
    hashtags: [String],
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    engagement: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      views: { type: Number, default: 0 }
    },
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    isPublished: {
      type: Boolean,
      default: true
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true, collection: 'posts' }
);

// Index for user lookup and sorting
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ isPublished: 1 });
postSchema.index({ hashtags: 1 });

module.exports = mongoose.model('Post', postSchema);
