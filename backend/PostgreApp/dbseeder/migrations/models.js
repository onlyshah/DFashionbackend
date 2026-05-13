/**
 * Models wrapper for seeders
 * Re-exports all models from models_sql/index.js for seeder compatibility
 * This allows seeders to do: const { Model } = require('../models');
 */

const modelsSQL = require('./models_sql');

// Export all wrapped models
module.exports = {
  // Core models
  User: modelsSQL.User,
  Product: modelsSQL.Product,
  Category: modelsSQL.Category,
  Brand: modelsSQL.Brand,
  Cart: modelsSQL.Cart,
  Order: modelsSQL.Order,
  Payment: modelsSQL.Payment,
  
  // Role & Permission
  Role: modelsSQL.Role,
  RolePermission: modelsSQL.RolePermission,
  Permission: modelsSQL.Permission,
  Module: modelsSQL.Module,
  
  // Social
  Post: modelsSQL.Post,
  Story: modelsSQL.Story,
  Reel: modelsSQL.Reel,
  ProductComment: modelsSQL.ProductComment,
  ProductShare: modelsSQL.ProductShare,
  
  // Business
  Coupon: modelsSQL.Coupon,
  Campaign: modelsSQL.Campaign,
  Seller: modelsSQL.Seller,
  Department: modelsSQL.Department,
  
  // Logistics & Shipping
  Courier: modelsSQL.Courier,
  Logistics: modelsSQL.Logistics,
  
  // Orders & Transactions
  Return: modelsSQL.Return,
  Transaction: modelsSQL.Transaction,
  Notification: modelsSQL.Notification,
  
  // Admin & Analytics
  AuditLog: modelsSQL.AuditLog,
  Banner: modelsSQL.Banner,
  Page: modelsSQL.Page,
  Reward: modelsSQL.Reward,
  
  // Search & History
  SearchHistory: modelsSQL.SearchHistory,
  SearchSuggestion: modelsSQL.SearchSuggestion,
  TrendingSearch: modelsSQL.TrendingSearch,
  
  // Inventory
  InventoryAlert: modelsSQL.InventoryAlert,
  InventoryHistory: modelsSQL.InventoryHistory,
  
  // Sessions & Wishlist
  Session: modelsSQL.Session,
  Wishlist: modelsSQL.Wishlist,
  
  // User Behavior & Style
  UserBehavior: modelsSQL.UserBehavior,
  StyleInspiration: modelsSQL.StyleInspiration,
  
  // Upload & Assets
  Upload: modelsSQL.Upload,
  
  // Tickets & Support
  Ticket: modelsSQL.Ticket,
  
  // Other
  FAQ: modelsSQL.FAQ,
  SellerCommission: modelsSQL.SellerCommission,
  SellerPerformance: modelsSQL.SellerPerformance,
  QuickAction: modelsSQL.QuickAction,
  KYCDocument: modelsSQL.KYCDocument,
  
  // Export the reinitializeModels function
  reinitializeModels: modelsSQL.reinitializeModels,
};
