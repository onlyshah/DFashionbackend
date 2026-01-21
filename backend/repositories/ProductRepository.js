/**
 * ProductRepository - Database-Agnostic Product Data Access Layer
 * Supports both MongoDB and PostgreSQL
 * Usage: Inject this into controllers instead of using Product.find() directly
 */

const { Op } = require('sequelize');

class ProductRepository {
  constructor(models) {
    this.models = models;
    this.isMongoDB = models.Product && typeof models.Product.find === 'function';
    this.isSequelize = models.Product && typeof models.Product.findAll === 'function';
  }

  /**
   * Get all products with filtering and pagination
   * @param {Object} filters - { category, status, vendor, search }
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Promise<{success, data, pagination}>}
   */
  async getAllProducts(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const where = {};
        if (filters.category && filters.category !== 'all') where.categoryId = filters.category;
        if (filters.status && filters.status !== 'all') where.status = filters.status;
        if (filters.vendor) where.vendorId = filters.vendor;
        if (filters.search) {
          where.name = { [Op.iLike]: `%${filters.search}%` };
        }

        const { count, rows } = await this.models.Product.findAndCountAll({
          where,
          include: [
            {
              association: 'vendor',
              attributes: ['id', 'email', 'fullName'],
              model: this.models.User,
              required: false
            }
          ],
          order: [['createdAt', 'DESC']],
          limit,
          offset: skip
        });

        return {
          success: true,
          data: {
            products: rows || [],
            pagination: {
              current: page,
              pages: Math.ceil(count / limit),
              total: count
            }
          }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const mongoFilter = {};
        if (filters.category && filters.category !== 'all') mongoFilter.category = filters.category;
        if (filters.status && filters.status !== 'all') mongoFilter.status = filters.status;
        if (filters.vendor) mongoFilter.vendor = filters.vendor;
        if (filters.search) mongoFilter.name = { $regex: filters.search, $options: 'i' };

        const products = await this.models.Product
          .find(mongoFilter)
          .populate('vendor', 'fullName email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await this.models.Product.countDocuments(mongoFilter);

        return {
          success: true,
          data: {
            products,
            pagination: {
              current: page,
              pages: Math.ceil(total / limit),
              total
            }
          }
        };
      }

      // No database available
      return {
        success: true,
        data: {
          products: [],
          pagination: { current: page, pages: 0, total: 0 }
        }
      };
    } catch (error) {
      console.error('[ProductRepository] getAllProducts error:', error.message);
      return {
        success: false,
        message: 'Failed to fetch products',
        error: error.message
      };
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    try {
      if (this.isSequelize) {
        const product = await this.models.Product.findByPk(id, {
          include: [
            {
              association: 'vendor',
              attributes: ['id', 'email', 'fullName'],
              model: this.models.User,
              required: false
            }
          ]
        });
        return { success: !!product, data: product };
      } else if (this.isMongoDB) {
        const product = await this.models.Product.findById(id).populate('vendor');
        return { success: !!product, data: product };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('[ProductRepository] getProductById error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Create product
   */
  async createProduct(productData) {
    try {
      if (this.isSequelize) {
        const product = await this.models.Product.create(productData);
        return { success: true, data: product };
      } else if (this.isMongoDB) {
        const product = new this.models.Product(productData);
        await product.save();
        return { success: true, data: product };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('[ProductRepository] createProduct error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Update product
   */
  async updateProduct(id, updates) {
    try {
      if (this.isSequelize) {
        await this.models.Product.update(updates, { where: { id } });
        const product = await this.models.Product.findByPk(id);
        return { success: true, data: product };
      } else if (this.isMongoDB) {
        const product = await this.models.Product.findByIdAndUpdate(id, updates, { new: true });
        return { success: true, data: product };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('[ProductRepository] updateProduct error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id) {
    try {
      if (this.isSequelize) {
        await this.models.Product.destroy({ where: { id } });
        return { success: true };
      } else if (this.isMongoDB) {
        await this.models.Product.findByIdAndDelete(id);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('[ProductRepository] deleteProduct error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      if (this.isSequelize) {
        const { count, rows } = await this.models.Product.findAndCountAll({
          where: { categoryId },
          limit,
          offset: skip,
          order: [['createdAt', 'DESC']]
        });
        return {
          success: true,
          data: rows,
          pagination: { current: page, pages: Math.ceil(count / limit), total: count }
        };
      } else if (this.isMongoDB) {
        const products = await this.models.Product
          .find({ category: categoryId })
          .limit(limit)
          .skip(skip)
          .sort({ createdAt: -1 })
          .lean();
        const total = await this.models.Product.countDocuments({ category: categoryId });
        return {
          success: true,
          data: products,
          pagination: { current: page, pages: Math.ceil(total / limit), total }
        };
      }
      return { success: true, data: [], pagination: { current: page, pages: 0, total: 0 } };
    } catch (error) {
      console.error('[ProductRepository] getProductsByCategory error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }
}

module.exports = ProductRepository;
