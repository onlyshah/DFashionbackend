const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'post_like',
      'post_share', 
      'post_comment',
      'story_view',
      'reel_view',
      'product_purchase',
      'referral_signup',
      'referral_purchase',
      'content_creation',
      'daily_login',
      'profile_completion',
      'first_purchase',
      'review_submission'
    ],
    required: true
  },
  credits: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  sourceUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sourceContent: {
    contentType: {
      type: String,
      enum: ['post', 'story', 'reel', 'product']
    },
    contentId: mongoose.Schema.Types.ObjectId
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  processedAt: Date,
  expiresAt: Date,
  metadata: {
    purchaseAmount: Number,
    commissionRate: Number,
    originalCredits: Number
  }
}, {
  timestamps: true
});

// Indexes for better performance
rewardSchema.index({ user: 1, createdAt: -1 });
rewardSchema.index({ type: 1 });
rewardSchema.index({ isProcessed: 1 });
rewardSchema.index({ expiresAt: 1 });

// Static method to calculate reward credits based on action type
rewardSchema.statics.getRewardCredits = function(type, metadata = {}) {
  const rewardRates = {
    'post_like': 1,
    'post_share': 3,
    'post_comment': 2,
    'story_view': 0.5,
    'reel_view': 0.5,
    'product_purchase': Math.floor((metadata.purchaseAmount || 0) * 0.02), // 2% of purchase
    'referral_signup': 50,
    'referral_purchase': Math.floor((metadata.purchaseAmount || 0) * 0.05), // 5% of referral purchase
    'content_creation': 10,
    'daily_login': 1,
    'profile_completion': 25,
    'first_purchase': 100,
    'review_submission': 5
  };
  
  return rewardRates[type] || 0;
};

// Method to process reward and update user credits
rewardSchema.methods.processReward = async function() {
  if (this.isProcessed) return false;
  
  try {
    const User = mongoose.model('User');
    const user = await User.findById(this.user);
    
    if (!user) return false;
    
    // Update user rewards
    if (!user.rewards) {
      user.rewards = {
        totalCredits: 0,
        availableCredits: 0,
        usedCredits: 0,
        totalEarnings: 0,
        referralCount: 0
      };
    }
    
    user.rewards.totalCredits += this.credits;
    user.rewards.availableCredits += this.credits;
    user.rewards.totalEarnings += this.credits;
    
    await user.save();
    
    this.isProcessed = true;
    this.processedAt = new Date();
    await this.save();
    
    return true;
  } catch (error) {
    console.error('Error processing reward:', error);
    return false;
  }
};

module.exports = mongoose.model('Reward', rewardSchema);
