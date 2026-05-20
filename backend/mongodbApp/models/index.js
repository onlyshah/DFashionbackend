// MongoDB Models Initialization
// This file exports Mongoose models after initialization

// Import all implemented models
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Cart = require('./Cart');
const Order = require('./Order');
const Payment = require('./Payment');
const Address = require('./Address');
const Wishlist = require('./Wishlist');
const Post = require('./Post');
const Comment = require('./Comment');
const Reel = require('./Reel');
const Story = require('./Story');
const Follow = require('./Follow');
const Notification = require('./Notification');

module.exports = {
  initialize: async () => {
    // Initialize all models after database connection
    console.log('✅ MongoDB models initialized');
    return Promise.resolve();
  },
  
  // ===== IMPLEMENTED MODELS =====
  // Core Models
  User,
  Category,
  
  // E-Commerce Models
  Product,
  Cart,
  Order,
  Payment,
  Address,
  Wishlist,
  
  // Social Features
  Post,
  Comment,
  Reel,
  Story,
  Follow,
  Notification,
  
  // ===== PLACEHOLDER FOR FUTURE MODELS =====
  Upload: null,
  SearchHistory: null,
  UserSession: null,
  Token: null,
  Role: null,
  Permission: null,
  AuditLog: null,
  AnalyticsEvent: null,
  Review: null,
  Message: null,
  Conversation: null,
  
  // Methods for model access
  getModel: (modelName) => {
    const model = module.exports[modelName];
    if (!model) {
      console.warn(`⚠️  Model "${modelName}" not yet implemented`);
      return null;
    }
    return model;
  },
  
  // Helper to get all implemented models
  getAllModels: () => {
    return {
      User,
      Category,
      Product,
      Cart,
      Order,
      Payment,
      Address,
      Wishlist,
      Post,
      Comment,
      Reel,
      Story,
      Follow,
      Notification
    };
  }
};
