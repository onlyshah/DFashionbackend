const postgresModule = require('../config/postgres');
let sequelize = null;
const { Sequelize } = require('sequelize');
const DataTypes = Sequelize.DataTypes;

// Model cache - load models on-demand after sequelize is connected
const modelCache = {};

// Helper to get sequelize instance
const getSequelizeInstance = async () => {
  if (!sequelize) {
    sequelize = await postgresModule.getPostgresConnection();
  }
  return sequelize;
};

// Dynamically load a model - call this when you actually need the model
const loadModel = async (modelName, defineFunc) => {
  // If already cached, return it
  if (modelCache[modelName]) {
    return modelCache[modelName];
  }
  
  try {
    const instance = await getSequelizeInstance();
    if (!instance) {
      console.error(`[models_sql] ${modelName}: Sequelize not connected, cannot load model`);
      return null;
    }
    const model = defineFunc(instance, DataTypes);
    modelCache[modelName] = model;
    console.log(`[models_sql] Loaded model: ${modelName}`);
    return model;
  } catch (err) {
    console.error(`[models_sql] Failed to load ${modelName}:`, err.message);
    return null;
  }
};

// Define models only after ensuring sequelize exists - immediate attempt (may return null stub)
const defineModelSafely = (defineFunc, fallbackName) => {
  try {
    const instance = postgresModule.sequelizeInstance();
    if (!instance) {
      // Sequelize not connected yet - return placeholder that will fail gracefully
      return null;
    }
    return defineFunc(instance, DataTypes);
  } catch (err) {
    console.error(`[models_sql] Failed to define ${fallbackName}:`, err.message);
    return null;
  }
};

const defineRole = require('./Role');
const defineDepartment = require('./Department');
const defineUser = require('./User');
const defineBrand = require('./Brand');
const defineCategory = require('./Category');
const defineSubCategory = require('./SubCategory');
const defineProduct = require('./Product');
const defineProductComment = require('./ProductComment');
const definePost = require('./Post');
const defineStory = require('./Story');
const defineReel = require('./Reel');
const defineUserBehavior = require('./UserBehavior');
const definePermission = require('./Permission');
const defineModule = require('./Module');
const defineRolePermission = require('./RolePermission');
const defineSession = require('./Session');
const defineCart = require('./Cart');
const defineWishlist = require('./Wishlist');
const defineOrder = require('./Order');
const definePayment = require('./Payment');
const defineReturn = require('./Return');
const defineCourier = require('./Courier');
const defineShipment = require('./Shipment');
const defineShippingCharge = require('./ShippingCharge');
const defineCoupon = require('./Coupon');
const defineFlashSale = require('./FlashSale');
const defineCampaign = require('./Campaign');
const definePromotion = require('./Promotion');
const defineNotification = require('./Notification');
const defineReward = require('./Reward');
const definePage = require('./Page');
const defineBanner = require('./Banner');
const defineFAQ = require('./FAQ');
const defineKYCDocument = require('./KYCDocument');
const defineSellerCommission = require('./SellerCommission');
const defineSellerPerformance = require('./SellerPerformance');
const defineProductShare = require('./ProductShare');
const defineSearchHistory = require('./SearchHistory');
const defineSearchSuggestion = require('./SearchSuggestion');
const defineTrendingSearch = require('./TrendingSearch');
const defineLiveStream = require('./LiveStream');
const defineAuditLog = require('./AuditLog');
const defineTransaction = require('./Transaction');
const defineTicket = require('./Ticket');
const defineQuickAction = require('./QuickAction');
const defineStyleInspiration = require('./StyleInspiration');
const defineWarehouse = require('./Warehouse');
const defineSupplier = require('./Supplier');
const defineInventory = require('./Inventory');
const defineInventoryAlert = require('./InventoryAlert');
const defineInventoryHistory = require('./InventoryHistory');

// Create null-safe stub models for initialization phase
const createNullStub = (name) => {
  return {
    name: name,
    findAll: async () => [],
    findByPk: async () => null,
    create: async () => null,
    update: async () => null,
    destroy: async () => null,
    findOne: async () => null,
    count: async () => 0
  };
};

// Safely define models - returns null stub if sequelize not ready
const Role = defineModelSafely(defineRole, 'Role') || createNullStub('Role');
const Department = defineModelSafely(defineDepartment, 'Department') || createNullStub('Department');
const User = defineModelSafely(defineUser, 'User') || createNullStub('User');
const Brand = defineModelSafely(defineBrand, 'Brand') || createNullStub('Brand');
const Category = defineModelSafely(defineCategory, 'Category') || createNullStub('Category');
const SubCategory = defineModelSafely(defineSubCategory, 'SubCategory') || createNullStub('SubCategory');
const Product = defineModelSafely(defineProduct, 'Product') || createNullStub('Product');
const ProductComment = defineModelSafely(defineProductComment, 'ProductComment') || createNullStub('ProductComment');
const Post = defineModelSafely(definePost, 'Post') || createNullStub('Post');
const Story = defineModelSafely(defineStory, 'Story') || createNullStub('Story');
const Reel = defineModelSafely(defineReel, 'Reel') || createNullStub('Reel');
const UserBehavior = defineModelSafely(defineUserBehavior, 'UserBehavior') || createNullStub('UserBehavior');
const Permission = defineModelSafely(definePermission, 'Permission') || createNullStub('Permission');
const Module = defineModelSafely(defineModule, 'Module') || createNullStub('Module');
const RolePermission = defineModelSafely(defineRolePermission, 'RolePermission') || createNullStub('RolePermission');
const Session = defineModelSafely(defineSession, 'Session') || createNullStub('Session');
const Cart = defineModelSafely(defineCart, 'Cart') || createNullStub('Cart');
const Wishlist = defineModelSafely(defineWishlist, 'Wishlist') || createNullStub('Wishlist');
const Order = defineModelSafely(defineOrder, 'Order') || createNullStub('Order');
const Payment = defineModelSafely(definePayment, 'Payment') || createNullStub('Payment');
const Return = defineModelSafely(defineReturn, 'Return') || createNullStub('Return');
const Courier = defineModelSafely(defineCourier, 'Courier') || createNullStub('Courier');
const Shipment = defineModelSafely(defineShipment, 'Shipment') || createNullStub('Shipment');
const ShippingCharge = defineModelSafely(defineShippingCharge, 'ShippingCharge') || createNullStub('ShippingCharge');
const Coupon = defineModelSafely(defineCoupon, 'Coupon') || createNullStub('Coupon');
const FlashSale = defineModelSafely(defineFlashSale, 'FlashSale') || createNullStub('FlashSale');
const Campaign = defineModelSafely(defineCampaign, 'Campaign') || createNullStub('Campaign');
const Promotion = defineModelSafely(definePromotion, 'Promotion') || createNullStub('Promotion');
const Notification = defineModelSafely(defineNotification, 'Notification') || createNullStub('Notification');
const Reward = defineModelSafely(defineReward, 'Reward') || createNullStub('Reward');
const Page = defineModelSafely(definePage, 'Page') || createNullStub('Page');
const Banner = defineModelSafely(defineBanner, 'Banner') || createNullStub('Banner');
const FAQ = defineModelSafely(defineFAQ, 'FAQ') || createNullStub('FAQ');
const KYCDocument = defineModelSafely(defineKYCDocument, 'KYCDocument') || createNullStub('KYCDocument');
const SellerCommission = defineModelSafely(defineSellerCommission, 'SellerCommission') || createNullStub('SellerCommission');
const SellerPerformance = defineModelSafely(defineSellerPerformance, 'SellerPerformance') || createNullStub('SellerPerformance');
const ProductShare = defineModelSafely(defineProductShare, 'ProductShare') || createNullStub('ProductShare');
const SearchHistory = defineModelSafely(defineSearchHistory, 'SearchHistory') || createNullStub('SearchHistory');
const SearchSuggestion = defineModelSafely(defineSearchSuggestion, 'SearchSuggestion') || createNullStub('SearchSuggestion');
const TrendingSearch = defineModelSafely(defineTrendingSearch, 'TrendingSearch') || createNullStub('TrendingSearch');
const LiveStream = defineModelSafely(defineLiveStream, 'LiveStream') || createNullStub('LiveStream');
const AuditLog = defineModelSafely(defineAuditLog, 'AuditLog') || createNullStub('AuditLog');
const Transaction = defineModelSafely(defineTransaction, 'Transaction') || createNullStub('Transaction');
const Ticket = defineModelSafely(defineTicket, 'Ticket') || createNullStub('Ticket');
const QuickAction = defineModelSafely(defineQuickAction, 'QuickAction') || createNullStub('QuickAction');
const StyleInspiration = defineModelSafely(defineStyleInspiration, 'StyleInspiration') || createNullStub('StyleInspiration');
const Warehouse = defineModelSafely(defineWarehouse, 'Warehouse') || createNullStub('Warehouse');
const Supplier = defineModelSafely(defineSupplier, 'Supplier') || createNullStub('Supplier');
const Inventory = defineModelSafely(defineInventory, 'Inventory') || createNullStub('Inventory');
const InventoryAlert = defineModelSafely(defineInventoryAlert, 'InventoryAlert') || createNullStub('InventoryAlert');
const InventoryHistory = defineModelSafely(defineInventoryHistory, 'InventoryHistory') || createNullStub('InventoryHistory');

// SequelizeQueryWrapper class - provides Promise-based chainable interface
class SequelizeQueryWrapper {
  constructor(sequelizeModel) {
    this.model = sequelizeModel;
    this.query = {};
    this.sortOrder = [];
    this.limitVal = null;
    this.offsetVal = 0;
    this.projection = null;
    this.isRaw = true;
  }

  find(query = {}) {
    this.query = query;
    return this;
  }

  sort(sortObj) {
    if (typeof sortObj === 'object') {
      this.sortOrder = Object.entries(sortObj).map(([key, val]) => [key, val === -1 ? 'DESC' : 'ASC']);
    }
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  skip(n) {
    this.offsetVal = n;
    return this;
  }

  select(projection) {
    this.projection = projection;
    return this;
  }

  lean() {
    this.isRaw = true;
    return this;
  }

  async exec() {
    try {
      const options = {
        where: this.query,
        raw: this.isRaw
      };
      if (this.sortOrder.length > 0) options.order = this.sortOrder;
      if (this.limitVal) options.limit = this.limitVal;
      if (this.offsetVal) options.offset = this.offsetVal;
      if (this.projection) options.attributes = this.projection;

      return await this.model.findAll(options);
    } catch (err) {
      console.error(`Error in exec for ${this.model.name}:`, err);
      return [];
    }
  }

  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.exec().catch(onRejected);
  }

  finally(onFinally) {
    return this.exec().finally(onFinally);
  }
}

// Create adapter wrapper for Mongoose-like query interface
const createMongooseLikeWrapper = (sequelizeModel, defineFunc, modelName) => {
  // This wrapper lazy-loads the actual model if the initial one was a null stub
  const getActualModel = async () => {
    // Check if it's a real Sequelize model (has attributes property) vs a null stub
    if (sequelizeModel && sequelizeModel.rawAttributes && typeof sequelizeModel.create === 'function') {
      return sequelizeModel; // Already a real model
    }
    // If it's null or a stub, try to reload with the connected Sequelize instance
    try {
      const instance = await getSequelizeInstance();
      if (instance && defineFunc) {
        const model = defineFunc(instance, DataTypes);
        if (model && model.rawAttributes) {
          return model;
        }
      }
    } catch (err) {
      console.error(`[wrapper] Error lazy-loading ${modelName}:`, err.message);
    }
    return sequelizeModel; // Fallback to original (may be null stub)
  };

  return {
    // find() - returns chainable query wrapper
    find: (query = {}, projection = null, options = {}) => {
      const wrapper = new SequelizeQueryWrapper(sequelizeModel);
      // Support Sequelize-style options passthrough: { where, limit, order, offset }
      if (query && (query.where || query.limit || query.order || query.offset)) {
        wrapper.query = query.where || {};
        if (query.order) wrapper.sortOrder = query.order;
        if (query.limit) wrapper.limitVal = query.limit;
        if (query.offset) wrapper.offsetVal = query.offset || query.skip || 0;
        return wrapper;
      }
      // Mongoose-style filter object
      return wrapper.find(query);
    },

    // findOne() - returns single object or null
    findOne: async (query = {}, projection = null, options = {}) => {
      try {
        const model = await getActualModel();
        if (query && query.where) {
          const result = await model.findOne({ ...query, raw: true });
          return result || null;
        }
        const result = await model.findOne({ where: query, raw: true });
        return result || null;
      } catch (err) {
        console.error(`Error in findOne for ${modelName}:`, err);
        return null;
      }
    },

    // findById()
    findById: async (id, projection = null, options = {}) => {
      try {
        const model = await getActualModel();
        const result = await model.findByPk(id, { raw: true });
        return result || null;
      } catch (err) {
        console.error(`Error in findById for ${modelName}:`, err);
        return null;
      }
    },

    // countDocuments()
    countDocuments: async (query = {}, options = {}) => {
      try {
        const model = await getActualModel();
        return await model.count({ where: query });
      } catch (err) {
        console.error(`Error in countDocuments for ${modelName}:`, err);
        return 0;
      }
    },

    // aggregate() - simplified aggregation
    aggregate: async (pipeline = []) => {
      try {
        const model = await getActualModel();
        // Basic aggregation support - would need more work for complex pipelines
        return await model.findAll({ raw: true });
      } catch (err) {
        console.error(`Error in aggregate for ${modelName}:`, err);
        return [];
      }
    },

    // Sequelize-style count() method
    count: async (options = {}) => {
      try {
        console.log(`[WRAPPER] count called on ${modelName} with options:`, options);
        const model = await getActualModel();
        const result = await model.count(options);
        console.log(`[WRAPPER] count result:`, result);
        return result;
      } catch (err) {
        console.error(`Error in count for ${modelName}:`, err);
        return 0;
      }
    },

    // Sequelize-style findAll() method
    findAll: async (options = {}) => {
      try {
        console.log(`[WRAPPER] findAll called on ${modelName} with options:`, JSON.stringify(options));
        const model = await getActualModel();
        const result = await model.findAll(options);
        console.log(`[WRAPPER] findAll result count:`, result?.length);
        return result;
      } catch (err) {
        console.error(`Error in findAll for ${modelName}:`, err);
        return [];
      }
    },

    // Sequelize-style findByIdAndUpdate()
    findByIdAndUpdate: async (id, update, options = {}) => {
      try {
        const model = await getActualModel();
        const result = await model.findByPk(id);
        if (!result) return null;
        return await result.update(update);
      } catch (err) {
        console.error(`Error in findByIdAndUpdate for ${modelName}:`, err);
        return null;
      }
    },

    // Sequelize-style create() method
    create: async (data, options = {}) => {
      try {
        const model = await getActualModel();
        if (!model) {
          console.error(`[wrapper] ${modelName}: getActualModel returned null`);
          throw new Error(`Model ${modelName} not available`);
        }
        if (!model.create || typeof model.create !== 'function') {
          console.error(`[wrapper] ${modelName}: model does not have create method. Has methods: ${Object.keys(model).filter(k => typeof model[k] === 'function').join(', ')}`);
          throw new Error(`${modelName} model does not have create method`);
        }
        const result = await model.create(data, options);
        if (!result) {
          console.error(`[wrapper] ${modelName}: create() returned null/undefined for data:`, data);
          throw new Error(`create() returned null for ${modelName}`);
        }
        return result;
      } catch (err) {
        console.error(`Error in create for ${modelName}:`, err.message);
        throw err;
      }
    },

    // Direct Sequelize access for complex queries
    _sequelize: sequelizeModel
  };
};

// Wrap all models with Mongoose-like interface (with lazy loading)
const wrappedProduct = createMongooseLikeWrapper(Product, defineProduct, 'Product');
const wrappedUser = createMongooseLikeWrapper(User, defineUser, 'User');
const wrappedPost = createMongooseLikeWrapper(Post, definePost, 'Post');
const wrappedStory = createMongooseLikeWrapper(Story, defineStory, 'Story');
const wrappedBrand = createMongooseLikeWrapper(Brand, defineBrand, 'Brand');
const wrappedCategory = createMongooseLikeWrapper(Category, defineCategory, 'Category');
const wrappedRole = createMongooseLikeWrapper(Role, defineRole, 'Role');
const wrappedDepartment = createMongooseLikeWrapper(Department, defineDepartment, 'Department');
const wrappedProductComment = createMongooseLikeWrapper(ProductComment, defineProductComment, 'ProductComment');
const wrappedReel = createMongooseLikeWrapper(Reel, defineReel, 'Reel');
const wrappedUserBehavior = createMongooseLikeWrapper(UserBehavior, defineUserBehavior, 'UserBehavior');
const wrappedPermission = createMongooseLikeWrapper(Permission, definePermission, 'Permission');
const wrappedModule = createMongooseLikeWrapper(Module, defineModule, 'Module');
const wrappedRolePermission = createMongooseLikeWrapper(RolePermission, defineRolePermission, 'RolePermission');
const wrappedSession = createMongooseLikeWrapper(Session, defineSession, 'Session');
const wrappedCart = createMongooseLikeWrapper(Cart, defineCart, 'Cart');
const wrappedWishlist = createMongooseLikeWrapper(Wishlist, defineWishlist, 'Wishlist');
const wrappedOrder = createMongooseLikeWrapper(Order, defineOrder, 'Order');
const wrappedPayment = createMongooseLikeWrapper(Payment, definePayment, 'Payment');
const wrappedReturn = createMongooseLikeWrapper(Return, defineReturn, 'Return');
const wrappedCourier = createMongooseLikeWrapper(Courier, defineCourier, 'Courier');
const wrappedShipment = createMongooseLikeWrapper(Shipment, defineShipment, 'Shipment');
const wrappedShippingCharge = createMongooseLikeWrapper(ShippingCharge, defineShippingCharge, 'ShippingCharge');
const wrappedCoupon = createMongooseLikeWrapper(Coupon, defineCoupon, 'Coupon');
const wrappedFlashSale = createMongooseLikeWrapper(FlashSale, defineFlashSale, 'FlashSale');
const wrappedCampaign = createMongooseLikeWrapper(Campaign, defineCampaign, 'Campaign');
const wrappedPromotion = createMongooseLikeWrapper(Promotion, definePromotion, 'Promotion');
const wrappedNotification = createMongooseLikeWrapper(Notification, defineNotification, 'Notification');
const wrappedReward = createMongooseLikeWrapper(Reward, defineReward, 'Reward');
const wrappedPage = createMongooseLikeWrapper(Page, definePage, 'Page');
const wrappedBanner = createMongooseLikeWrapper(Banner, defineBanner, 'Banner');
const wrappedFAQ = createMongooseLikeWrapper(FAQ, defineFAQ, 'FAQ');
const wrappedKYCDocument = createMongooseLikeWrapper(KYCDocument, defineKYCDocument, 'KYCDocument');
const wrappedSellerCommission = createMongooseLikeWrapper(SellerCommission, defineSellerCommission, 'SellerCommission');
const wrappedSellerPerformance = createMongooseLikeWrapper(SellerPerformance, defineSellerPerformance, 'SellerPerformance');
const wrappedProductShare = createMongooseLikeWrapper(ProductShare, defineProductShare, 'ProductShare');
const wrappedSearchHistory = createMongooseLikeWrapper(SearchHistory, defineSearchHistory, 'SearchHistory');
const wrappedSearchSuggestion = createMongooseLikeWrapper(SearchSuggestion, defineSearchSuggestion, 'SearchSuggestion');
const wrappedTrendingSearch = createMongooseLikeWrapper(TrendingSearch, defineTrendingSearch, 'TrendingSearch');
const wrappedLiveStream = createMongooseLikeWrapper(LiveStream, defineLiveStream, 'LiveStream');
const wrappedAuditLog = createMongooseLikeWrapper(AuditLog, defineAuditLog, 'AuditLog');
const wrappedTransaction = createMongooseLikeWrapper(Transaction, defineTransaction, 'Transaction');
const wrappedTicket = createMongooseLikeWrapper(Ticket, defineTicket, 'Ticket');
const wrappedQuickAction = createMongooseLikeWrapper(QuickAction, defineQuickAction, 'QuickAction');
const wrappedStyleInspiration = createMongooseLikeWrapper(StyleInspiration, defineStyleInspiration, 'StyleInspiration');
const wrappedWarehouse = createMongooseLikeWrapper(Warehouse, defineWarehouse, 'Warehouse');
const wrappedSupplier = createMongooseLikeWrapper(Supplier, defineSupplier, 'Supplier');
const wrappedInventory = createMongooseLikeWrapper(Inventory, defineInventory, 'Inventory');
const wrappedInventoryAlert = createMongooseLikeWrapper(InventoryAlert, defineInventoryAlert, 'InventoryAlert');
const wrappedInventoryHistory = createMongooseLikeWrapper(InventoryHistory, defineInventoryHistory, 'InventoryHistory');
const wrappedSubCategory = createMongooseLikeWrapper(SubCategory, defineSubCategory, 'SubCategory');

// ============================================================================
// SET UP SEQUELIZE RELATIONSHIPS & ASSOCIATIONS
// ============================================================================
// Only set up relationships if models are properly initialized (not null stubs)
if (Category && Category.hasMany && SubCategory && SubCategory.belongsTo) {
  // Category ↔ SubCategory (Critical for admin endpoints)
  Category.hasMany(SubCategory, { foreignKey: 'categoryId', as: 'SubCategories' });
  SubCategory.belongsTo(Category, { foreignKey: 'categoryId', as: 'Category' });
}

// NOTE: Other associations disabled to avoid naming collisions with existing attributes
// These can be re-enabled if attribute names are changed to avoid conflicts
/*
// User ↔ Role
User.belongsTo(Role, { foreignKey: 'role_id', as: 'userRole' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
*/

// Reinitialize models after Sequelize connection (call after DB is connected)
const reinitializeModels = async () => {
  try {
    const instance = await getSequelizeInstance();
    if (!instance) {
      console.error('[models_sql] Cannot reinitialize: Sequelize not connected');
      return false;
    }
    
    // Now redefine all models with the connected Sequelize instance
    // This replaces the null stubs with actual models
    try {
      // Define models with the live Sequelize instance and directly reassign them
      const Role_new = defineRole(instance, DataTypes);
      const Department_new = defineDepartment(instance, DataTypes);
      const User_new = defineUser(instance, DataTypes);
      const Brand_new = defineBrand(instance, DataTypes);
      const Category_new = defineCategory(instance, DataTypes);
      const SubCategory_new = defineSubCategory(instance, DataTypes);
      const Product_new = defineProduct(instance, DataTypes);
      const ProductComment_new = defineProductComment(instance, DataTypes);
      const Post_new = definePost(instance, DataTypes);
      const Story_new = defineStory(instance, DataTypes);
      const Reel_new = defineReel(instance, DataTypes);
      const UserBehavior_new = defineUserBehavior(instance, DataTypes);
      const Permission_new = definePermission(instance, DataTypes);
      const Module_new = defineModule(instance, DataTypes);
      const RolePermission_new = defineRolePermission(instance, DataTypes);
      const Session_new = defineSession(instance, DataTypes);
      const Cart_new = defineCart(instance, DataTypes);
      const Wishlist_new = defineWishlist(instance, DataTypes);
      const Order_new = defineOrder(instance, DataTypes);
      const Payment_new = definePayment(instance, DataTypes);
      const Return_new = defineReturn(instance, DataTypes);
      const Courier_new = defineCourier(instance, DataTypes);
      const Shipment_new = defineShipment(instance, DataTypes);
      const ShippingCharge_new = defineShippingCharge(instance, DataTypes);
      const Coupon_new = defineCoupon(instance, DataTypes);
      const FlashSale_new = defineFlashSale(instance, DataTypes);
      const Campaign_new = defineCampaign(instance, DataTypes);
      const Promotion_new = definePromotion(instance, DataTypes);
      const Notification_new = defineNotification(instance, DataTypes);
      const Reward_new = defineReward(instance, DataTypes);
      const Page_new = definePage(instance, DataTypes);
      const Banner_new = defineBanner(instance, DataTypes);
      const FAQ_new = defineFAQ(instance, DataTypes);
      const KYCDocument_new = defineKYCDocument(instance, DataTypes);
      const SellerCommission_new = defineSellerCommission(instance, DataTypes);
      const SellerPerformance_new = defineSellerPerformance(instance, DataTypes);
      const ProductShare_new = defineProductShare(instance, DataTypes);
      const SearchHistory_new = defineSearchHistory(instance, DataTypes);
      const SearchSuggestion_new = defineSearchSuggestion(instance, DataTypes);
      const TrendingSearch_new = defineTrendingSearch(instance, DataTypes);
      const LiveStream_new = defineLiveStream(instance, DataTypes);
      const AuditLog_new = defineAuditLog(instance, DataTypes);
      const Transaction_new = defineTransaction(instance, DataTypes);
      const Ticket_new = defineTicket(instance, DataTypes);
      const QuickAction_new = defineQuickAction(instance, DataTypes);
      const StyleInspiration_new = defineStyleInspiration(instance, DataTypes);
      const Warehouse_new = defineWarehouse(instance, DataTypes);
      const Supplier_new = defineSupplier(instance, DataTypes);
      const Inventory_new = defineInventory(instance, DataTypes);
      const InventoryAlert_new = defineInventoryAlert(instance, DataTypes);
      const InventoryHistory_new = defineInventoryHistory(instance, DataTypes);
      
      // Directly update all models in the _raw export
      module.exports._raw = {
        Role: Role_new,
        Department: Department_new,
        User: User_new,
        Brand: Brand_new,
        Category: Category_new,
        SubCategory: SubCategory_new,
        Product: Product_new,
        ProductComment: ProductComment_new,
        Post: Post_new,
        Story: Story_new,
        Reel: Reel_new,
        UserBehavior: UserBehavior_new,
        Permission: Permission_new,
        Module: Module_new,
        RolePermission: RolePermission_new,
        Session: Session_new,
        Cart: Cart_new,
        Wishlist: Wishlist_new,
        Order: Order_new,
        Payment: Payment_new,
        Return: Return_new,
        Courier: Courier_new,
        Shipment: Shipment_new,
        ShippingCharge: ShippingCharge_new,
        Coupon: Coupon_new,
        FlashSale: FlashSale_new,
        Campaign: Campaign_new,
        Promotion: Promotion_new,
        Notification: Notification_new,
        Reward: Reward_new,
        Page: Page_new,
        Banner: Banner_new,
        FAQ: FAQ_new,
        KYCDocument: KYCDocument_new,
        SellerCommission: SellerCommission_new,
        SellerPerformance: SellerPerformance_new,
        ProductShare: ProductShare_new,
        SearchHistory: SearchHistory_new,
        SearchSuggestion: SearchSuggestion_new,
        TrendingSearch: TrendingSearch_new,
        LiveStream: LiveStream_new,
        AuditLog: AuditLog_new,
        Transaction: Transaction_new,
        Ticket: Ticket_new,
        QuickAction: QuickAction_new,
        StyleInspiration: StyleInspiration_new,
        Warehouse: Warehouse_new,
        Supplier: Supplier_new,
        Inventory: Inventory_new,
        InventoryAlert: InventoryAlert_new,
        InventoryHistory: InventoryHistory_new
      };

      console.log('[models_sql] ✅ All 53 models reinitialized with active Sequelize connection');
      return true;
    } catch (redefErr) {
      console.error('[models_sql] Error redefining models:', redefErr.message);
      return false;
    }
  } catch (err) {
    console.error('[models_sql] Error reinitializing models:', err);
    return false;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  Role: wrappedRole,
  Department: wrappedDepartment,
  User: wrappedUser,
  Brand: wrappedBrand,
  Category: wrappedCategory,
  SubCategory: wrappedSubCategory,
  Product: wrappedProduct,
  ProductComment: wrappedProductComment,
  Post: wrappedPost,
  Story: wrappedStory,
  Reel: wrappedReel,
  UserBehavior: wrappedUserBehavior,
  Permission: wrappedPermission,
  Module: wrappedModule,
  RolePermission: wrappedRolePermission,
  Session: wrappedSession,
  Cart: wrappedCart,
  Wishlist: wrappedWishlist,
  Order: wrappedOrder,
  Payment: wrappedPayment,
  Return: wrappedReturn,
  Courier: wrappedCourier,
  Shipment: wrappedShipment,
  ShippingCharge: wrappedShippingCharge,
  Coupon: wrappedCoupon,
  FlashSale: wrappedFlashSale,
  Campaign: wrappedCampaign,
  Promotion: wrappedPromotion,
  Notification: wrappedNotification,
  Reward: wrappedReward,
  Page: wrappedPage,
  Banner: wrappedBanner,
  FAQ: wrappedFAQ,
  KYCDocument: wrappedKYCDocument,
  SellerCommission: wrappedSellerCommission,
  SellerPerformance: wrappedSellerPerformance,
  ProductShare: wrappedProductShare,
  SearchHistory: wrappedSearchHistory,
  SearchSuggestion: wrappedSearchSuggestion,
  TrendingSearch: wrappedTrendingSearch,
  LiveStream: wrappedLiveStream,
  AuditLog: wrappedAuditLog,
  Transaction: wrappedTransaction,
  Ticket: wrappedTicket,
  QuickAction: wrappedQuickAction,
  StyleInspiration: wrappedStyleInspiration,
  Warehouse: wrappedWarehouse,
  Supplier: wrappedSupplier,
  Inventory: wrappedInventory,
  InventoryAlert: wrappedInventoryAlert,
  InventoryHistory: wrappedInventoryHistory,
  // Export raw Sequelize models for direct access if needed
  _raw: {
    Role,
    Department,
    User,
    Brand,
    Category,
    SubCategory,
    Product,
    ProductComment,
    Post,
    Story,
    Reel,
    UserBehavior,
    Permission,
    Module,
    RolePermission,
    Session,
    Cart,
    Wishlist,
    Order,
    Payment,
    Return,
    Courier,
    Shipment,
    ShippingCharge,
    Coupon,
    FlashSale,
    Campaign,
    Promotion,
    Notification,
    Reward,
    Page,
    Banner,
    FAQ,
    KYCDocument,
    SellerCommission,
    SellerPerformance,
    ProductShare,
    SearchHistory,
    SearchSuggestion,
    TrendingSearch,
    LiveStream,
    AuditLog,
    Transaction,
    Ticket,
    QuickAction,
    StyleInspiration,
    Warehouse,
    Inventory: wrappedInventory,
    InventoryAlert: wrappedInventoryAlert,
    InventoryHistory: wrappedInventoryHistory
  },
  // Initialization helper
  getSequelizeInstance,
  getPostgresConnection: postgresModule.getPostgresConnection,
  reinitializeModels
};
