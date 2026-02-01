/**
 * Product Service (MongoDB)
 * Database-specific implementation for MongoDB/Mongoose
 * Pure MongoDB/Mongoose queries - no Sequelize code here
 */

const models = require('../../models')();
const { Product } = models;

module.exports = {
  /**
   * Get all products with filters and pagination
   */
  async getAllProducts(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      if (filters.category) query.category = filters.category;
      if (filters.status) query.status = filters.status;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const products = await Product.find(query)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await Product.countDocuments(query);

      return {
        success: true,
        data: products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single product by ID
   */
  async getProductById(id) {
    try {
      const product = await Product.findById(id).lean();
      return product;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new product
   */
  async createProduct(data) {
    try {
      const product = await Product.create(data);
      return product;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update product
   */
  async updateProduct(id, data) {
    try {
      const product = await Product.findByIdAndUpdate(id, data, { new: true }).lean();
      return product;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete product
   */
  async deleteProduct(id) {
    try {
      const result = await Product.findByIdAndDelete(id);
      return result;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get trending products
   */
  async getTrendingProducts(limit = 10) {
    try {
      const products = await Product.find()
        .sort({ views: -1 })
        .limit(limit)
        .lean();
      return products;
    } catch (error) {
      throw error;
    }
  }
};
