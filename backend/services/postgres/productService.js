/**
 * Product Service (PostgreSQL)
 * Database-specific implementation for PostgreSQL/Sequelize
 * Pure Sequelize queries - no Mongoose code here
 */

const { Op } = require('sequelize');
const models = require('../../models_sql');
const { Product } = models;

module.exports = {
  /**
   * Get all products with filters and pagination
   */
  async getAllProducts(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const where = {};

      if (filters.category) where.categoryId = filters.category;
      if (filters.status) where.status = filters.status;
      if (filters.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${filters.search}%` } },
          { description: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }

      const { rows, count } = await Product.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return {
        success: true,
        data: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count
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
      const product = await Product.findByPk(id);
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
      const product = await Product.findByPk(id);
      if (!product) return null;
      await product.update(data);
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
      const product = await Product.findByPk(id);
      if (!product) return null;
      await product.destroy();
      return product;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get trending products
   */
  async getTrendingProducts(limit = 10) {
    try {
      const products = await Product.findAll({
        order: [['views', 'DESC']],
        limit
      });
      return products;
    } catch (error) {
      throw error;
    }
  }
};
