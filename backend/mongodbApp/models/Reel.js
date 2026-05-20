const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    title: String,
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required']
    },
    thumbnail: String,
    duration: {
      type: Number,
      required: true
    },
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
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public'
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true, collection: 'reels' }
);

// Index for user lookup and sorting
reelSchema.index({ user: 1, createdAt: -1 });
reelSchema.index({ isPublished: 1 });
reelSchema.index({ hashtags: 1 });

module.exports = mongoose.model('Reel', reelSchema);
