/**
 * mongoToPostgresAdapter.js
 * 
 * Universal adapter that allows Mongo seeders to work with Postgres by:
 * 1. Intercepting Mongoose model imports
 * 2. Replacing them with Sequelize wrapper models from models_sql/index.js
 * 3. Providing compatibility layer for Mongoose-style queries
 * 
 * Usage: Call this at the top of any seeder to enable DB switching
 */

const Module = require('module');
const path = require('path');

let originalRequire = null;

const mongooseModels = [
  'Role', 'User', 'Brand', 'Category', 'Product', 'ProductComment', 'Post', 'Story', 
  'Reel', 'UserBehavior', 'Cart', 'Wishlist', 'Order', 'Payment', 'Returns', 'Logistics',
  'Promotions', 'Livestream', 'Marketing', 'CMS', 'KYCDocument', 'Reward', 'Notification',
  'SearchHistory', 'SearchSuggestion', 'TrendingSearch', 'Session', 'Module', 'Permission',
  'RolePermission', 'Sellers', 'SellerCommission', 'SellerPerformance', 'AuditLog',
  'Banner', 'Coupon', 'Courier', 'FAQ', 'FlashSale', 'Page', 'ProductShare', 'QuickAction',
  'Shipment', 'ShippingCharge', 'StoryHighlight', 'Notification'
];

function setupMongoToPostgresAdapter() {
  if (originalRequire) return; // already set up
  
  const modelsPath = path.resolve(__dirname, '..', 'models_sql', 'index.js');
  const postgresModels = require(modelsPath);
  
  originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    // If requiring a Mongo model by name, return Postgres adapter version
    if (mongooseModels.includes(id)) {
      console.log(`[Adapter] Using Postgres model for: ${id}`);
      return postgresModels[id] || postgresModels[id];
    }
    
    // If requiring models directory, adapt it
    if (id === '../models' || id.endsWith('/models') || id.endsWith('\\models')) {
      console.log(`[Adapter] Redirecting models import to models_sql`);
      return postgresModels;
    }
    
    // Otherwise use original require
    return originalRequire.apply(this, arguments);
  };
  
  console.log('✅ Mongo-to-Postgres adapter enabled: Mongoose models redirected to Sequelize wrappers');
}

function restoreRequire() {
  if (originalRequire) {
    Module.prototype.require = originalRequire;
    console.log('✅ Require restored');
  }
}

module.exports = {
  setupMongoToPostgresAdapter,
  restoreRequire
};
