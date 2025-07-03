const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  refreshToken: {
    type: String,
    unique: true,
    sparse: true
  },
  deviceInfo: {
    userAgent: String,
    browser: String,
    os: String,
    device: String,
    ipAddress: String,
    location: {
      country: String,
      city: String,
      region: String
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  loginMethod: {
    type: String,
    enum: ['email', 'google', 'facebook', 'apple'],
    default: 'email'
  },
  sessionType: {
    type: String,
    enum: ['web', 'mobile', 'api'],
    default: 'web'
  },
  activities: [{
    action: {
      type: String,
      enum: ['login', 'logout', 'page_view', 'product_view', 'cart_action', 'order_placed', 'payment']
    },
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes for better performance
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ lastActivity: 1 });
sessionSchema.index({ expiresAt: 1 });

// Method to update last activity
sessionSchema.methods.updateActivity = function(action, details, ipAddress) {
  this.lastActivity = new Date();
  this.activities.push({
    action,
    details,
    ipAddress
  });
  
  // Keep only last 50 activities
  if (this.activities.length > 50) {
    this.activities = this.activities.slice(-50);
  }
  
  return this.save();
};

// Method to invalidate session
sessionSchema.methods.invalidate = function() {
  this.isActive = false;
  return this.save();
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false, updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    ]
  });
};

// Static method to get active sessions for user
sessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

module.exports = mongoose.model('Session', sessionSchema);
