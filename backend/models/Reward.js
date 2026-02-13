const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  userId: {
    type: Number,
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['purchase', 'referral', 'review', 'social', 'milestone'],
    default: 'purchase'
  },
  reference: {
    type: mongoose.Schema.Types.Mixed
  },
  expiresAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

rewardSchema.index({ id: 1 });

module.exports = mongoose.model('Reward', rewardSchema);
