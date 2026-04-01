require('dotenv').config();

const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
const isPostgres = dbType.includes('postgres');
const isMongo = dbType.includes('mongo');

// Unified Database Abstraction Layer
class UnifiedDatabase {
  constructor() {
    this.dbType = dbType;
    this.isPostgres = isPostgres;
    this.isMongo = isMongo;
    this.models = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      if (this.isPostgres) {
        await this.initializePostgres();
      } else if (this.isMongo) {
        await this.initializeMongo();
      } else {
        throw new Error(`Unsupported DB_TYPE: ${dbType}`);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async initializePostgres() {
    const postgresModule = require('../config/postgres');
    const { Sequelize } = require('sequelize');
    const DataTypes = Sequelize.DataTypes;

    const sequelize = await postgresModule.getPostgresConnection();
    if (!sequelize) throw new Error('Failed to connect to PostgreSQL');

    // Import all model definitions
    const modelDefinitions = {
      User: require('../models_sql/User'),
      Role: require('../models_sql/Role'),
      Department: require('../models_sql/Department'),
      Product: require('../models_sql/Product'),
      Brand: require('../models_sql/Brand'),
      Category: require('../models_sql/Category'),
      SubCategory: require('../models_sql/SubCategory'),
      Cart: require('../models_sql/Cart'),
      CartItem: require('../models_sql/CartItem'),
      Wishlist: require('../models_sql/Wishlist'),
      Order: require('../models_sql/Order'),
      Payment: require('../models_sql/Payment'),
      Post: require('../models_sql/Post'),
      Story: require('../models_sql/Story'),
      Reel: require('../models_sql/Reel'),
      Notification: require('../models_sql/Notification'),
      ProductComment: require('../models_sql/ProductComment'),
      ProductShare: require('../models_sql/ProductShare'),
      Reward: require('../models_sql/Reward'),
      Session: require('../models_sql/Session'),
      Permission: require('../models_sql/Permission'),
      Module: require('../models_sql/Module'),
      RolePermission: require('../models_sql/RolePermission'),
      SearchHistory: require('../models_sql/SearchHistory'),
      SearchSuggestion: require('../models_sql/SearchSuggestion'),
      TrendingSearch: require('../models_sql/TrendingSearch'),
      LiveStream: require('../models_sql/LiveStream'),
      AuditLog: require('../models_sql/AuditLog'),
      Transaction: require('../models_sql/Transaction'),
      Ticket: require('../models_sql/Ticket'),
      QuickAction: require('../models_sql/QuickAction'),
      StyleInspiration: require('../models_sql/StyleInspiration'),
      Warehouse: require('../models_sql/Warehouse'),
      Supplier: require('../models_sql/Supplier'),
      Inventory: require('../models_sql/Inventory'),
      InventoryAlert: require('../models_sql/InventoryAlert'),
      InventoryHistory: require('../models_sql/InventoryHistory'),
      Analytics: require('../models_sql/Analytics'),
      FeatureFlag: require('../models_sql/FeatureFlag'),
      SmartCollection: require('../models_sql/SmartCollection'),
      Upload: require('../models_sql/Upload'),
      KYCDocument: require('../models_sql/KYCDocument'),
      SellerCommission: require('../models_sql/SellerCommission'),
      SellerPerformance: require('../models_sql/SellerPerformance'),
      Return: require('../models_sql/Return'),
      Courier: require('../models_sql/Courier'),
      Shipment: require('../models_sql/Shipment'),
      ShippingCharge: require('../models_sql/ShippingCharge'),
      Coupon: require('../models_sql/Coupon'),
      FlashSale: require('../models_sql/FlashSale'),
      Campaign: require('../models_sql/Campaign'),
      Promotion: require('../models_sql/Promotion'),
      Page: require('../models_sql/Page'),
      Banner: require('../models_sql/Banner'),
      FAQ: require('../models_sql/FAQ'),
      UserBehavior: require('../models_sql/UserBehavior')
    };

    // Initialize models
    for (const [name, defineFunc] of Object.entries(modelDefinitions)) {
      try {
        this.models[name] = defineFunc(sequelize, DataTypes);
      } catch (error) {
        console.warn(`Failed to initialize PostgreSQL model ${name}:`, error.message);
        this.models[name] = this.createNullStub(name);
      }
    }

    // Setup associations
    await this.setupPostgresAssociations();

    // Wrap models with unified interface
    for (const name in this.models) {
      if (this.models[name] && typeof this.models[name] === 'function') {
        this.models[name] = this.createUnifiedWrapper(this.models[name], name, 'postgres');
      }
    }
  }

  async initializeMongo() {
    const mongoose = require('mongoose');

    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    await mongoose.connect(mongoUrl);

    // Import all MongoDB models
    const mongoModels = {
      User: require('./User'),
      Role: require('./Role'),
      Department: require('./Department'),
      Product: require('./Product'),
      Brand: require('./Brand'),
      Category: require('./Category'),
      Cart: require('./Cart'),
      Wishlist: require('./Wishlist'),
      Order: require('./Order'),
      Payment: require('./Payment'),
      Post: require('./Post'),
      Story: require('./Story'),
      Reel: require('./Reel'),
      Notification: require('./Notification'),
      ProductComment: require('./ProductComment'),
      ProductShare: require('./ProductShare'),
      Reward: require('./Reward'),
      Session: require('./Session'),
      Permission: require('./Permission'),
      RolePermission: require('./RolePermission'),
      SearchHistory: require('./SearchHistory'),
      StyleInspiration: require('./StyleInspiration'),
      Ticket: require('./Ticket'),
      QuickAction: require('./QuickAction'),
      KYCDocument: require('./KYCDocument'),
      SellerPerformance: require('./SellerPerformance'),
      SellerCommission: require('./SellerCommission'),
      Return: require('./Return'),
      Shipment: require('./Shipment'),
      Courier: require('./Courier'),
      ShippingCharge: require('./ShippingCharge'),
      Coupon: require('./Coupon'),
      FlashSale: require('./FlashSale'),
      Page: require('./Page'),
      Banner: require('./Banner'),
      FAQ: require('./FAQ'),
      UserBehavior: require('./UserBehavior'),
      Inventory: require('./Inventory'),
      InventoryAlert: require('./InventoryAlert'),
      InventoryHistory: require('./InventoryHistory')
    };

    // Initialize models
    for (const [name, model] of Object.entries(mongoModels)) {
      try {
        this.models[name] = model;
      } catch (error) {
        console.warn(`Failed to initialize MongoDB model ${name}:`, error.message);
        this.models[name] = this.createNullStub(name);
      }
    }

    // Wrap models with unified interface
    for (const name in this.models) {
      if (this.models[name]) {
        this.models[name] = this.createUnifiedWrapper(this.models[name], name, 'mongo');
      }
    }
  }

  async setupPostgresAssociations() {
    const models = this.models;

    // User associations
    if (models.User && models.Role) {
      models.User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'roleData' });
      models.Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
    }

    if (models.User && models.Department) {
      models.User.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'departmentData' });
      models.Department.hasMany(models.User, { foreignKey: 'departmentId', as: 'employees' });
    }

    // Product associations
    if (models.Product && models.Brand) {
      models.Product.belongsTo(models.Brand, { foreignKey: 'brandId', as: 'brand' });
      models.Brand.hasMany(models.Product, { foreignKey: 'brandId', as: 'products' });
    }

    if (models.Product && models.Category) {
      models.Product.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
      models.Category.hasMany(models.Product, { foreignKey: 'categoryId', as: 'products' });
    }

    if (models.Product && models.User) {
      models.Product.belongsTo(models.User, { foreignKey: 'sellerId', as: 'seller' });
      models.User.hasMany(models.Product, { foreignKey: 'sellerId', as: 'productsForSale' });
    }

    // Cart associations
    if (models.Cart && models.User) {
      models.Cart.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      models.User.hasOne(models.Cart, { foreignKey: 'user_id', as: 'cart' });
    }

    if (models.Cart && models.CartItem) {
      models.Cart.hasMany(models.CartItem, { foreignKey: 'cartId', as: 'items' });
      models.CartItem.belongsTo(models.Cart, { foreignKey: 'cartId', as: 'cart' });
    }

    if (models.CartItem && models.Product) {
      models.CartItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
      models.Product.hasMany(models.CartItem, { foreignKey: 'productId', as: 'cartItems' });
    }

    // Wishlist associations
    if (models.Wishlist && models.User) {
      models.Wishlist.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      models.User.hasMany(models.Wishlist, { foreignKey: 'userId', as: 'wishlist' });
    }

    if (models.Wishlist && models.Product) {
      models.Wishlist.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
      models.Product.hasMany(models.Wishlist, { foreignKey: 'productId', as: 'wishlistedBy' });
    }

    // Order associations
    if (models.Order && models.User) {
      models.Order.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      models.User.hasMany(models.Order, { foreignKey: 'userId', as: 'orders' });
    }

    if (models.Order && models.Payment) {
      models.Order.hasOne(models.Payment, { foreignKey: 'orderId', as: 'payment' });
      models.Payment.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    }

    // Post associations
    if (models.Post && models.User) {
      models.Post.belongsTo(models.User, { foreignKey: 'userId', as: 'creator' });
      models.User.hasMany(models.Post, { foreignKey: 'userId', as: 'posts' });
    }

    // Story associations
    if (models.Story && models.User) {
      models.Story.belongsTo(models.User, { foreignKey: 'userId', as: 'creator' });
      models.User.hasMany(models.Story, { foreignKey: 'userId', as: 'stories' });
    }

    // Role-Permission associations
    if (models.Role && models.RolePermission) {
      models.Role.hasMany(models.RolePermission, { foreignKey: 'roleId', as: 'rolePermissions' });
      models.RolePermission.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
    }

    if (models.RolePermission && models.Permission) {
      models.RolePermission.belongsTo(models.Permission, { foreignKey: 'permissionId', as: 'permission' });
      models.Permission.hasMany(models.RolePermission, { foreignKey: 'permissionId', as: 'rolePermissions' });
    }

    // Category-SubCategory associations
    if (models.Category && models.SubCategory) {
      models.Category.hasMany(models.SubCategory, { foreignKey: 'categoryId', as: 'SubCategories' });
      models.SubCategory.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'Category' });
    }
  }

  createUnifiedWrapper(model, name, dbType) {
    if (!model) return this.createNullStub(name);

    const wrapper = {
      name: name,
      dbType: dbType,
      _model: model
    };

    if (dbType === 'postgres') {
      // Sequelize wrapper
      wrapper.findAll = async (options = {}) => {
        try {
          const result = await model.findAll(options);
          return result;
        } catch (error) {
          console.error(`[${name}] findAll error:`, error);
          return [];
        }
      };

      wrapper.findOne = async (options = {}) => {
        try {
          const result = await model.findOne(options);
          return result;
        } catch (error) {
          console.error(`[${name}] findOne error:`, error);
          return null;
        }
      };

      wrapper.findByPk = async (id, options = {}) => {
        try {
          const result = await model.findByPk(id, options);
          return result;
        } catch (error) {
          console.error(`[${name}] findByPk error:`, error);
          return null;
        }
      };

      wrapper.findAndCountAll = async (options = {}) => {
        try {
          const result = await model.findAndCountAll(options);
          return result;
        } catch (error) {
          console.error(`[${name}] findAndCountAll error:`, error);
          return { rows: [], count: 0 };
        }
      };

      wrapper.create = async (data) => {
        try {
          const result = await model.create(data);
          return result;
        } catch (error) {
          console.error(`[${name}] create error:`, error);
          throw error;
        }
      };

      wrapper.update = async (data, options = {}) => {
        try {
          const result = await model.update(data, options);
          return result;
        } catch (error) {
          console.error(`[${name}] update error:`, error);
          throw error;
        }
      };

      wrapper.destroy = async (options = {}) => {
        try {
          const result = await model.destroy(options);
          return result;
        } catch (error) {
          console.error(`[${name}] destroy error:`, error);
          throw error;
        }
      };

      wrapper.count = async (options = {}) => {
        try {
          const result = await model.count(options);
          return result;
        } catch (error) {
          console.error(`[${name}] count error:`, error);
          return 0;
        }
      };

    } else if (dbType === 'mongo') {
      // Mongoose wrapper
      wrapper.find = async (query = {}) => {
        try {
          const result = await model.find(query);
          return result;
        } catch (error) {
          console.error(`[${name}] find error:`, error);
          return [];
        }
      };

      wrapper.findOne = async (query = {}) => {
        try {
          const result = await model.findOne(query);
          return result;
        } catch (error) {
          console.error(`[${name}] findOne error:`, error);
          return null;
        }
      };

      wrapper.findById = async (id) => {
        try {
          const result = await model.findById(id);
          return result;
        } catch (error) {
          console.error(`[${name}] findById error:`, error);
          return null;
        }
      };

      wrapper.findAll = wrapper.find;
      wrapper.findAndCountAll = async (options = {}) => {
        try {
          const query = options.where || {};
          const rows = await model.find(query).limit(options.limit || 0).skip(options.offset || 0);
          const count = await model.countDocuments(query);
          return { rows, count };
        } catch (error) {
          console.error(`[${name}] findAndCountAll error:`, error);
          return { rows: [], count: 0 };
        }
      };

      wrapper.create = async (data) => {
        try {
          const result = await model.create(data);
          return result;
        } catch (error) {
          console.error(`[${name}] create error:`, error);
          throw error;
        }
      };

      wrapper.updateOne = async (query, data) => {
        try {
          const result = await model.updateOne(query, data);
          return result;
        } catch (error) {
          console.error(`[${name}] updateOne error:`, error);
          throw error;
        }
      };

      wrapper.updateMany = async (query, data) => {
        try {
          const result = await model.updateMany(query, data);
          return result;
        } catch (error) {
          console.error(`[${name}] updateMany error:`, error);
          throw error;
        }
      };

      wrapper.deleteOne = async (query) => {
        try {
          const result = await model.deleteOne(query);
          return result;
        } catch (error) {
          console.error(`[${name}] deleteOne error:`, error);
          throw error;
        }
      };

      wrapper.deleteMany = async (query) => {
        try {
          const result = await model.deleteMany(query);
          return result;
        } catch (error) {
          console.error(`[${name}] deleteMany error:`, error);
          throw error;
        }
      };

      wrapper.countDocuments = async (query = {}) => {
        try {
          const result = await model.countDocuments(query);
          return result;
        } catch (error) {
          console.error(`[${name}] countDocuments error:`, error);
          return 0;
        }
      };

      wrapper.count = wrapper.countDocuments;
    }

    return wrapper;
  }

  createNullStub(name) {
    return {
      name: name,
      findAll: async () => [],
      findOne: async () => null,
      findByPk: async () => null,
      findAndCountAll: async () => ({ rows: [], count: 0 }),
      create: async () => null,
      update: async () => [0],
      destroy: async () => 0,
      count: async () => 0,
      find: async () => [],
      findById: async () => null,
      updateOne: async () => ({ acknowledged: false }),
      updateMany: async () => ({ acknowledged: false }),
      deleteOne: async () => ({ acknowledged: false }),
      deleteMany: async () => ({ acknowledged: false }),
      countDocuments: async () => 0
    };
  }

  getModel(name) {
    return this.models[name] || this.createNullStub(name);
  }
}

// Create singleton instance
const db = new UnifiedDatabase();

// Initialize immediately
db.initialize().catch(error => {
  console.error('Failed to initialize unified database:', error);
});

// Export unified interface
module.exports = new Proxy({}, {
  get(target, prop) {
    if (prop === 'initialize') return () => db.initialize();
    if (prop === 'dbType') return db.dbType;
    if (prop === 'isPostgres') return db.isPostgres;
    if (prop === 'isMongo') return db.isMongo;
    if (prop === 'getModels') return () => db.models;
    if (prop === '_raw') return db.models;
    if (prop === 'sequelize') return db.isPostgres ? db.models.User?._model?.sequelize : null;
    if (prop === 'mongoose') return db.isMongo ? require('mongoose') : null;

    return db.getModel(prop);
  }
});
