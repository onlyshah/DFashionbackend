/**
 * ============================================================================
 * POSTGRESQL ADAPTER
 * ============================================================================
 * Provides a unified interface for all PostgreSQL database operations
 * Used by services to abstract away database-specific logic
 * 
 * All services import from here to get database models and utilities
 */

const models = require('../../models_sql');

// Helper function to ensure models are initialized
const ensureModelsReady = async () => {
  try {
    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }
  } catch (err) {
    console.warn('⚠️  Warning: Could not reinitialize models:', err.message);
  }
};

/**
 * PostgreSQL Adapter
 * Exposes models and utilities for services to use
 */
const postgresAdapter = {
  // Core models
  User: models.User,
  Role: models.Role,
  Product: models.Product,
  Category: models.Category,
  Cart: models.Cart,
  CartItem: models.CartItem,
  Wishlist: models.Wishlist,
  Order: models.Order,
  Post: models.Post,
  Story: models.Story,
  Reel: models.Reel,
  ProductComment: models.ProductComment,
  ProductShare: models.ProductShare,
  Payment: models.Payment,
  Notification: models.Notification,
  AuditLog: models.AuditLog,
  Brand: models.Brand,
  SubCategory: models.SubCategory,
  Department: models.Department,
  Permission: models.Permission,
  Module: models.Module,
  RolePermission: models.RolePermission,
  Session: models.Session,
  Reward: models.Reward,
  Promotion: models.Promotion,
  Coupon: models.Coupon,
  Inventory: models.Inventory,
  InventoryAlert: models.InventoryAlert,
  InventoryHistory: models.InventoryHistory,
  Return: models.Return,
  Shipment: models.Shipment,
  ShippingCharge: models.ShippingCharge,
  Courier: models.Courier,
  Transaction: models.Transaction,
  LiveStream: models.LiveStream,
  Address: models.Address,
  Upload: models.Upload,
  Analytics: models.Analytics,
  FeatureFlag: models.FeatureFlag,
  SmartCollection: models.SmartCollection,
  StyleInspiration: models.StyleInspiration,
  Warehouse: models.Warehouse,
  Supplier: models.Supplier,
  KYCDocument: models.KYCDocument,
  SellerCommission: models.SellerCommission,
  SellerPerformance: models.SellerPerformance,
  SearchHistory: models.SearchHistory,
  SearchSuggestion: models.SearchSuggestion,
  TrendingSearch: models.TrendingSearch,
  Ticket: models.Ticket,
  QuickAction: models.QuickAction,
  Page: models.Page,
  Banner: models.Banner,
  FAQ: models.FAQ,
  UserBehavior: models.UserBehavior,
  Promotion: models.Promotion,

  // Sequelize utilities
  Op: require('sequelize').Op,
  Sequelize: require('sequelize'),

  // Helper methods
  ensureModelsReady,

  // Get Sequelize instance
  getSequelize: () => models.sequelize,

  // Get raw models for advanced usage
  _raw: models._raw,

  // Connection helper
  getConnection: async () => {
    return models.getSequelizeInstance();
  }
};

module.exports = postgresAdapter;
