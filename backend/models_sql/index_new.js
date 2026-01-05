const { sequelize, Sequelize } = require('../config/sequelize');

const defineRole = require('./Role');
const defineUser = require('./User');
const defineBrand = require('./Brand');
const defineCategory = require('./Category');
const defineProduct = require('./Product');
const defineProductComment = require('./ProductComment');
const definePost = require('./Post');
const defineStory = require('./Story');
const defineReel = require('./Reel');
const defineUserBehavior = require('./UserBehavior');

const Role = defineRole(sequelize, Sequelize.DataTypes);
const User = defineUser(sequelize, Sequelize.DataTypes);
const Brand = defineBrand(sequelize, Sequelize.DataTypes);
const Category = defineCategory(sequelize, Sequelize.DataTypes);
const Product = defineProduct(sequelize, Sequelize.DataTypes);
const ProductComment = defineProductComment(sequelize, Sequelize.DataTypes);
const Post = definePost(sequelize, Sequelize.DataTypes);
const Story = defineStory(sequelize, Sequelize.DataTypes);
const Reel = defineReel(sequelize, Sequelize.DataTypes);
const UserBehavior = defineUserBehavior(sequelize, Sequelize.DataTypes);

// Query wrapper class to support Mongoose-like chaining with Sequelize
class SequelizeQueryWrapper {
  constructor(model) {
    this.model = model;
    this.query = {};
    this.sortOrder = undefined;
    this.limitVal = undefined;
    this.offsetVal = 0;
    this.populateFields = null;
    this.leanFlag = true;
  }

  find(query = {}) {
    this.query = query || {};
    return this;
  }

  sort(sortObj) {
    if (sortObj && typeof sortObj === 'object') {
      this.sortOrder = Object.entries(sortObj).map(([key, val]) => [key, val > 0 ? 'ASC' : 'DESC']);
    }
    return this;
  }

  limit(num) {
    this.limitVal = num;
    return this;
  }

  skip(num) {
    this.offsetVal = num;
    return this;
  }

  populate(field, projection) {
    this.populateFields = { field, projection };
    return this;
  }

  lean() {
    this.leanFlag = true;
    return this;
  }

  async exec() {
    try {
      const opts = {
        where: this.query,
        raw: this.leanFlag
      };
      if (this.limitVal) opts.limit = this.limitVal;
      if (this.offsetVal) opts.offset = this.offsetVal;
      if (this.sortOrder) opts.order = this.sortOrder;
      const results = await this.model.findAll(opts);
      return results || [];
    } catch (err) {
      console.error(`Error executing query:`, err);
      return [];
    }
  }

  // Support both .exec() and implicit execution via Promise
  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.exec().catch(onRejected);
  }
}

// Create adapter wrapper for Mongoose-like query interface
const createMongooseLikeWrapper = (sequelizeModel) => {
  return {
    // find() - returns chainable query wrapper
    find: (query = {}, projection = null, options = {}) => {
      const wrapper = new SequelizeQueryWrapper(sequelizeModel);
      return wrapper.find(query);
    },

    // findOne() - returns single object or null
    findOne: async (query = {}, projection = null, options = {}) => {
      try {
        const result = await sequelizeModel.findOne({
          where: query,
          raw: true
        });
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
const wrappedProductComment = createMongooseLikeWrapper(ProductComment);
const wrappedReel = createMongooseLikeWrapper(Reel);
const wrappedUserBehavior = createMongooseLikeWrapper(UserBehavior);

module.exports = {
  sequelize,
  Sequelize,
  Role: wrappedRole,
  User: wrappedUser,
  Brand: wrappedBrand,
  Category: wrappedCategory,
  Product: wrappedProduct,
  ProductComment: wrappedProductComment,
  Post: wrappedPost,
  Story: wrappedStory,
  Reel: wrappedReel,
  UserBehavior: wrappedUserBehavior,
  // Export raw Sequelize models for direct access if needed
  _raw: {
    Role,
    User,
    Brand,
    Category,
    Product,
    ProductComment,
    Post,
    Story,
    Reel,
    UserBehavior
  }
};
