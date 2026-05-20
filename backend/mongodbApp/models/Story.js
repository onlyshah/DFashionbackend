const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    content: {
      type: String,
      maxlength: [300, 'Story content cannot exceed 300 characters']
    },
    image: {
      type: String,
      required: [true, 'Story image is required']
    },
    video: String,
    duration: {
      type: Number,
      default: 5
    },
    hashtags: [String],
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    engagement: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 }
    },
    viewedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public'
    },
    isHighlight: {
      type: Boolean,
      default: false
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 24 * 60 * 60 * 1000) // 24 hours
    }
  },
  { timestamps: true, collection: 'stories' }
);

// TTL index - automatically delete after 24 hours
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for user lookup and sorting
storySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);
