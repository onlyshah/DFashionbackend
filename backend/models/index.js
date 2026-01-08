require('dotenv').config();

const dbType = (process.env.DB_TYPE || '').toLowerCase();

// List of mongoose model files available in ./models
const MONGO_MODEL_NAMES = [
  'Product','User','UserBehavior','Post','Story','Category','Brand','Role','Order','Cart','Wishlist','Notification','QuickAction','Permission','RolePermission','SearchHistory','Session','StyleInspiration','Ticket','Transaction','Payment','ProductComment','ProductShare','Reward',
  // Enterprise audit additions
  'KYCDocument','SellerPerformance','SellerCommission','Return','Shipment','Courier','ShippingCharge','Coupon','FlashSale','Page','Banner','FAQ'
];

// add new models introduced by enterprise audit
const NEW_MONGO_MODELS = ['KYCDocument','SellerPerformance','SellerCommission','Return','Shipment','Courier','ShippingCharge','Coupon','FlashSale','Page','Banner','FAQ'];
for (const m of NEW_MONGO_MODELS) MONGO_MODEL_NAMES.push(m);

// Lazy loader for mongoose models (doesn't attempt DB connection)
const mongoCache = {};
function loadMongoModel(name) {
  if (mongoCache[name]) return mongoCache[name];
  try {
    // require the model file (e.g. ./User)
    const m = require(`./${name}`);
    mongoCache[name] = m;
    return m;
  } catch (err) {
    console.warn(`models/index: failed to require ./${name}:`, err.message || err);
    return null;
  }
}

// When using Postgres, prefer models_sql which already provides Mongoose-like wrappers
let sqlModels = null;
try {
  if (dbType.includes('postgres')) {
    sqlModels = require('../models_sql');
  }
} catch (err) {
  console.warn('models/index: could not load models_sql:', err.message || err);
}

const handler = {
  get(_, prop) {
    if (prop === 'getModels') return () => module.exports;
    if (prop === '_raw') return (sqlModels && sqlModels._raw) || {};
    if (sqlModels && prop in sqlModels) return sqlModels[prop];
    // Do not load Mongo models when running in Postgres-only mode.
    // Only lazy-load Mongo models if DB_TYPE indicates Mongo is used.
    if (!dbType.includes('postgres') && MONGO_MODEL_NAMES.includes(prop)) return loadMongoModel(prop);
    return undefined;
  }
};

module.exports = new Proxy({}, handler);
