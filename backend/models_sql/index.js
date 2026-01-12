const { sequelize, Sequelize } = require('../config/sequelize');

const defineRole = require('./Role');
const defineDepartment = require('./Department');
const defineUser = require('./User');
const defineBrand = require('./Brand');
const defineCategory = require('./Category');
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

const Role = defineRole(sequelize, Sequelize.DataTypes);
const Department = defineDepartment(sequelize, Sequelize.DataTypes);
const User = defineUser(sequelize, Sequelize.DataTypes);
const Brand = defineBrand(sequelize, Sequelize.DataTypes);
const Category = defineCategory(sequelize, Sequelize.DataTypes);
const Product = defineProduct(sequelize, Sequelize.DataTypes);
const ProductComment = defineProductComment(sequelize, Sequelize.DataTypes);
const Post = definePost(sequelize, Sequelize.DataTypes);
const Story = defineStory(sequelize, Sequelize.DataTypes);
const Reel = defineReel(sequelize, Sequelize.DataTypes);
const UserBehavior = defineUserBehavior(sequelize, Sequelize.DataTypes);
const Permission = definePermission(sequelize, Sequelize.DataTypes);
const Module = defineModule(sequelize, Sequelize.DataTypes);
const RolePermission = defineRolePermission(sequelize, Sequelize.DataTypes);
const Session = defineSession(sequelize, Sequelize.DataTypes);
const Cart = defineCart(sequelize, Sequelize.DataTypes);
const Wishlist = defineWishlist(sequelize, Sequelize.DataTypes);
const Order = defineOrder(sequelize, Sequelize.DataTypes);
const Payment = definePayment(sequelize, Sequelize.DataTypes);
const Return = defineReturn(sequelize, Sequelize.DataTypes);
const Courier = defineCourier(sequelize, Sequelize.DataTypes);
const Shipment = defineShipment(sequelize, Sequelize.DataTypes);
const ShippingCharge = defineShippingCharge(sequelize, Sequelize.DataTypes);
const Coupon = defineCoupon(sequelize, Sequelize.DataTypes);
const FlashSale = defineFlashSale(sequelize, Sequelize.DataTypes);
const Campaign = defineCampaign(sequelize, Sequelize.DataTypes);
const Promotion = definePromotion(sequelize, Sequelize.DataTypes);
const Notification = defineNotification(sequelize, Sequelize.DataTypes);
const Reward = defineReward(sequelize, Sequelize.DataTypes);
const Page = definePage(sequelize, Sequelize.DataTypes);
const Banner = defineBanner(sequelize, Sequelize.DataTypes);
const FAQ = defineFAQ(sequelize, Sequelize.DataTypes);
const KYCDocument = defineKYCDocument(sequelize, Sequelize.DataTypes);
const SellerCommission = defineSellerCommission(sequelize, Sequelize.DataTypes);
const SellerPerformance = defineSellerPerformance(sequelize, Sequelize.DataTypes);
const ProductShare = defineProductShare(sequelize, Sequelize.DataTypes);
const SearchHistory = defineSearchHistory(sequelize, Sequelize.DataTypes);
const SearchSuggestion = defineSearchSuggestion(sequelize, Sequelize.DataTypes);
const TrendingSearch = defineTrendingSearch(sequelize, Sequelize.DataTypes);
const LiveStream = defineLiveStream(sequelize, Sequelize.DataTypes);
const AuditLog = defineAuditLog(sequelize, Sequelize.DataTypes);
const Transaction = defineTransaction(sequelize, Sequelize.DataTypes);
const Ticket = defineTicket(sequelize, Sequelize.DataTypes);
const QuickAction = defineQuickAction(sequelize, Sequelize.DataTypes);
const StyleInspiration = defineStyleInspiration(sequelize, Sequelize.DataTypes);

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
const createMongooseLikeWrapper = (sequelizeModel) => {
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
        if (query && query.where) {
          const result = await sequelizeModel.findOne({ ...query, raw: true });
          return result || null;
        }
        const result = await sequelizeModel.findOne({ where: query, raw: true });
        return result || null;
      } catch (err) {
        console.error(`Error in findOne for ${sequelizeModel.name}:`, err);
        return null;
      }
    },

    // findById()
    findById: async (id, projection = null, options = {}) => {
      try {
        const result = await sequelizeModel.findByPk(id, { raw: true });
        return result || null;
      } catch (err) {
        console.error(`Error in findById for ${sequelizeModel.name}:`, err);
        return null;
      }
    },

    // countDocuments()
    countDocuments: async (query = {}, options = {}) => {
      try {
        return await sequelizeModel.count({ where: query });
      } catch (err) {
        console.error(`Error in countDocuments for ${sequelizeModel.name}:`, err);
        return 0;
      }
    },

    // aggregate() - simplified aggregation
    aggregate: async (pipeline = []) => {
      try {
        // Basic aggregation support - would need more work for complex pipelines
        return await sequelizeModel.findAll({ raw: true });
      } catch (err) {
        console.error(`Error in aggregate for ${sequelizeModel.name}:`, err);
        return [];
      }
    },

    // Direct Sequelize access for complex queries
    _sequelize: sequelizeModel
  };
};

// Wrap all models with Mongoose-like interface
const wrappedProduct = createMongooseLikeWrapper(Product);
const wrappedUser = createMongooseLikeWrapper(User);
const wrappedPost = createMongooseLikeWrapper(Post);
const wrappedStory = createMongooseLikeWrapper(Story);
const wrappedBrand = createMongooseLikeWrapper(Brand);
const wrappedCategory = createMongooseLikeWrapper(Category);
const wrappedRole = createMongooseLikeWrapper(Role);
const wrappedDepartment = createMongooseLikeWrapper(Department);
const wrappedProductComment = createMongooseLikeWrapper(ProductComment);
const wrappedReel = createMongooseLikeWrapper(Reel);
const wrappedUserBehavior = createMongooseLikeWrapper(UserBehavior);
const wrappedPermission = createMongooseLikeWrapper(Permission);
const wrappedModule = createMongooseLikeWrapper(Module);
const wrappedRolePermission = createMongooseLikeWrapper(RolePermission);
const wrappedSession = createMongooseLikeWrapper(Session);
const wrappedCart = createMongooseLikeWrapper(Cart);
const wrappedWishlist = createMongooseLikeWrapper(Wishlist);
const wrappedOrder = createMongooseLikeWrapper(Order);
const wrappedPayment = createMongooseLikeWrapper(Payment);
const wrappedReturn = createMongooseLikeWrapper(Return);
const wrappedCourier = createMongooseLikeWrapper(Courier);
const wrappedShipment = createMongooseLikeWrapper(Shipment);
const wrappedShippingCharge = createMongooseLikeWrapper(ShippingCharge);
const wrappedCoupon = createMongooseLikeWrapper(Coupon);
const wrappedFlashSale = createMongooseLikeWrapper(FlashSale);
const wrappedCampaign = createMongooseLikeWrapper(Campaign);
const wrappedPromotion = createMongooseLikeWrapper(Promotion);
const wrappedNotification = createMongooseLikeWrapper(Notification);
const wrappedReward = createMongooseLikeWrapper(Reward);
const wrappedPage = createMongooseLikeWrapper(Page);
const wrappedBanner = createMongooseLikeWrapper(Banner);
const wrappedFAQ = createMongooseLikeWrapper(FAQ);
const wrappedKYCDocument = createMongooseLikeWrapper(KYCDocument);
const wrappedSellerCommission = createMongooseLikeWrapper(SellerCommission);
const wrappedSellerPerformance = createMongooseLikeWrapper(SellerPerformance);
const wrappedProductShare = createMongooseLikeWrapper(ProductShare);
const wrappedSearchHistory = createMongooseLikeWrapper(SearchHistory);
const wrappedSearchSuggestion = createMongooseLikeWrapper(SearchSuggestion);
const wrappedTrendingSearch = createMongooseLikeWrapper(TrendingSearch);
const wrappedLiveStream = createMongooseLikeWrapper(LiveStream);
const wrappedAuditLog = createMongooseLikeWrapper(AuditLog);
const wrappedTransaction = createMongooseLikeWrapper(Transaction);
const wrappedTicket = createMongooseLikeWrapper(Ticket);
const wrappedQuickAction = createMongooseLikeWrapper(QuickAction);
const wrappedStyleInspiration = createMongooseLikeWrapper(StyleInspiration);

module.exports = {
  sequelize,
  Sequelize,
  Role: wrappedRole,
  Department: wrappedDepartment,
  User: wrappedUser,
  Brand: wrappedBrand,
  Category: wrappedCategory,
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
  // Export raw Sequelize models for direct access if needed
  _raw: {
    Role,
    Department,
    User,
    Brand,
    Category,
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
    StyleInspiration
  }
};
