const mongoose = require('mongoose');

// User interaction tracking schema
const userInteractionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'product_view', 'product_like', 'product_share', 'product_purchase',
      'post_view', 'post_like', 'post_share', 'post_comment',
      'story_view', 'story_like', 'story_share',
      'search', 'category_browse', 'filter_apply',
      'cart_add', 'cart_remove', 'wishlist_add', 'wishlist_remove',
      'vendor_follow', 'vendor_unfollow', 'user_follow', 'user_unfollow'
    ],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetType: {
    type: String,
    enum: ['product', 'post', 'story', 'user', 'vendor', 'category'],
    required: true
  },
  metadata: {
    category: String,
    subcategory: String,
    brand: String,
    price: Number,
    searchQuery: String,
    filters: mongoose.Schema.Types.Mixed,
    duration: Number, // Time spent in seconds
    source: String, // Where the interaction came from
    deviceType: String,
    sessionId: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// User behavior analytics schema
const userBehaviorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Recent interactions (last 1000)
  interactions: [userInteractionSchema],
  
  // Aggregated preferences
  preferences: {
    categories: [{
      name: String,
      score: { type: Number, default: 0 },
      interactions: { type: Number, default: 0 },
      lastInteraction: Date
    }],
    brands: [{
      name: String,
      score: { type: Number, default: 0 },
      interactions: { type: Number, default: 0 },
      lastInteraction: Date
    }],
    priceRanges: [{
      min: Number,
      max: Number,
      score: { type: Number, default: 0 },
      interactions: { type: Number, default: 0 }
    }],
    colors: [{
      name: String,
      score: { type: Number, default: 0 },
      interactions: { type: Number, default: 0 }
    }],
    sizes: [{
      name: String,
      score: { type: Number, default: 0 },
      interactions: { type: Number, default: 0 }
    }]
  },
  
  // Behavioral patterns
  patterns: {
    activeHours: [{
      hour: { type: Number, min: 0, max: 23 },
      score: { type: Number, default: 0 }
    }],
    activeDays: [{
      day: { type: Number, min: 0, max: 6 }, // 0 = Sunday
      score: { type: Number, default: 0 }
    }],
    sessionDuration: {
      average: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      sessions: { type: Number, default: 0 }
    },
    purchaseFrequency: {
      averageDaysBetween: { type: Number, default: 0 },
      totalPurchases: { type: Number, default: 0 },
      lastPurchase: Date
    },
    browsingBehavior: {
      averageProductsViewed: { type: Number, default: 0 },
      averageTimePerProduct: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }
    }
  },
  
  // Social behavior
  socialBehavior: {
    followedVendors: [{
      vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      followedAt: Date,
      interactionScore: { type: Number, default: 0 }
    }],
    followedUsers: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      followedAt: Date,
      interactionScore: { type: Number, default: 0 }
    }],
    engagementRate: {
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      posts: { type: Number, default: 0 }
    }
  },
  
  // Recommendation scores
  recommendationScores: {
    collaborative: { type: Number, default: 0 },
    contentBased: { type: Number, default: 0 },
    social: { type: Number, default: 0 },
    trending: { type: Number, default: 0 },
    lastUpdated: Date
  },
  
  // Similar users (for collaborative filtering)
  similarUsers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    similarity: { type: Number, min: 0, max: 1 },
    commonInteractions: Number,
    lastCalculated: Date
  }],
  
  // Analytics metadata
  analytics: {
    totalInteractions: { type: Number, default: 0 },
    lastActivity: Date,
    profileCompleteness: { type: Number, default: 0 },
    engagementLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    userSegment: {
      type: String,
      enum: ['new', 'casual', 'regular', 'power', 'vip'],
      default: 'new'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
userBehaviorSchema.index({ user: 1 });
userBehaviorSchema.index({ 'interactions.timestamp': -1 });
userBehaviorSchema.index({ 'interactions.type': 1 });
userBehaviorSchema.index({ 'interactions.targetType': 1 });
userBehaviorSchema.index({ 'analytics.lastActivity': -1 });
userBehaviorSchema.index({ 'analytics.userSegment': 1 });

// Methods
userBehaviorSchema.methods.addInteraction = function(interaction) {
  // Add new interaction
  this.interactions.unshift(interaction);
  
  // Keep only last 1000 interactions
  if (this.interactions.length > 1000) {
    this.interactions = this.interactions.slice(0, 1000);
  }
  
  // Update analytics
  this.analytics.totalInteractions += 1;
  this.analytics.lastActivity = new Date();
  
  // Update preferences based on interaction
  this.updatePreferences(interaction);
  
  return this.save();
};

userBehaviorSchema.methods.updatePreferences = function(interaction) {
  if (interaction.metadata) {
    // Update category preferences
    if (interaction.metadata.category) {
      const categoryIndex = this.preferences.categories.findIndex(
        cat => cat.name === interaction.metadata.category
      );
      
      if (categoryIndex > -1) {
        this.preferences.categories[categoryIndex].score += this.getInteractionWeight(interaction.type);
        this.preferences.categories[categoryIndex].interactions += 1;
        this.preferences.categories[categoryIndex].lastInteraction = new Date();
      } else {
        this.preferences.categories.push({
          name: interaction.metadata.category,
          score: this.getInteractionWeight(interaction.type),
          interactions: 1,
          lastInteraction: new Date()
        });
      }
    }
    
    // Update brand preferences
    if (interaction.metadata.brand) {
      const brandIndex = this.preferences.brands.findIndex(
        brand => brand.name === interaction.metadata.brand
      );
      
      if (brandIndex > -1) {
        this.preferences.brands[brandIndex].score += this.getInteractionWeight(interaction.type);
        this.preferences.brands[brandIndex].interactions += 1;
        this.preferences.brands[brandIndex].lastInteraction = new Date();
      } else {
        this.preferences.brands.push({
          name: interaction.metadata.brand,
          score: this.getInteractionWeight(interaction.type),
          interactions: 1,
          lastInteraction: new Date()
        });
      }
    }
  }
};

userBehaviorSchema.methods.getInteractionWeight = function(type) {
  const weights = {
    'product_view': 1,
    'product_like': 3,
    'product_share': 5,
    'product_purchase': 10,
    'post_view': 1,
    'post_like': 2,
    'post_share': 3,
    'post_comment': 4,
    'story_view': 1,
    'story_like': 2,
    'search': 2,
    'category_browse': 1,
    'cart_add': 5,
    'wishlist_add': 3,
    'vendor_follow': 4,
    'user_follow': 2
  };
  
  return weights[type] || 1;
};

userBehaviorSchema.methods.calculateEngagementLevel = function() {
  const totalScore = this.interactions.reduce((sum, interaction) => {
    return sum + this.getInteractionWeight(interaction.type);
  }, 0);
  
  const recentInteractions = this.interactions.filter(interaction => {
    const daysDiff = (new Date() - interaction.timestamp) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30; // Last 30 days
  }).length;
  
  if (totalScore > 500 || recentInteractions > 100) {
    this.analytics.engagementLevel = 'high';
  } else if (totalScore > 100 || recentInteractions > 20) {
    this.analytics.engagementLevel = 'medium';
  } else {
    this.analytics.engagementLevel = 'low';
  }
  
  return this.analytics.engagementLevel;
};

userBehaviorSchema.methods.calculateUserSegment = function() {
  const daysSinceCreation = (new Date() - this.createdAt) / (1000 * 60 * 60 * 24);
  const totalInteractions = this.analytics.totalInteractions;
  const purchaseCount = this.interactions.filter(i => i.type === 'product_purchase').length;
  
  if (daysSinceCreation < 7) {
    this.analytics.userSegment = 'new';
  } else if (purchaseCount > 20 || totalInteractions > 1000) {
    this.analytics.userSegment = 'vip';
  } else if (purchaseCount > 5 || totalInteractions > 200) {
    this.analytics.userSegment = 'power';
  } else if (totalInteractions > 50) {
    this.analytics.userSegment = 'regular';
  } else {
    this.analytics.userSegment = 'casual';
  }
  
  return this.analytics.userSegment;
};

module.exports = mongoose.model('UserBehavior', userBehaviorSchema);
