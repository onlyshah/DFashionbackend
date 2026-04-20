/**
 * PostgreSQL ProductShares Service
 * Pure Sequelize database operations for ProductShares model
 */

const { Op } = require('sequelize');
const models = require('../../models_sql');

class ProductSharesService {
  
  static async findByProductId(productId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;
      
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const { count, rows } = await ProductShare.findAndCountAll({
        where: { productId },
        include: [
          { model: models.Product, as: 'product', required: false },
          { model: models.User, as: 'sharedBy', attributes: ['id', 'username', 'email'] }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return { total: count, data: rows };
    } catch (error) {
      console.error('[ProductSharesService] findByProductId error:', error.message);
      throw error;
    }
  }

  static async create(data) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const share = await ProductShare.create({
        productId: data.productId,
        userId: data.userId,
        shortUrl: data.shortUrl || `ps-${Date.now()}`,
        createdAt: new Date()
      });

      return share;
    } catch (error) {
      console.error('[ProductSharesService] create error:', error.message);
      throw error;
    }
  }

  static async findByShortUrl(shortUrl) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const share = await ProductShare.findOne({
        where: { shortUrl },
        include: [
          { model: models.Product, as: 'product', required: false },
          { model: models.User, as: 'sharedBy', attributes: ['id', 'username', 'email'] }
        ]
      });

      return share;
    } catch (error) {
      console.error('[ProductSharesService] findByShortUrl error:', error.message);
      throw error;
    }
  }

  static async trackClick(shortUrl) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const share = await ProductShare.findOne({ where: { shortUrl } });
      if (!share) return null;

      // Increment click count
      await share.increment('clicks');
      return share;
    } catch (error) {
      console.error('[ProductSharesService] trackClick error:', error.message);
      throw error;
    }
  }

  static async delete(shareId) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const result = await ProductShare.destroy({
        where: { id: shareId }
      });

      return result > 0;
    } catch (error) {
      console.error('[ProductSharesService] delete error:', error.message);
      throw error;
    }
  }

  static async toggleLike(shareId, userId) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const share = await ProductShare.findByPk(shareId);
      if (!share) throw new Error('Share not found');

      // Simple like count increment for MVP
      // In production, would have separate Share_Likes table
      await share.increment('likes');
      
      return {
        shareId,
        userId,
        liked: true,
        likeCount: (share.likes || 0) + 1
      };
    } catch (error) {
      console.error('[ProductSharesService] toggleLike error:', error.message);
      throw error;
    }
  }

  static async getAnalytics(shareId) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const share = await ProductShare.findByPk(shareId, {
        include: [
          { model: models.Product, as: 'product', attributes: ['id', 'name', 'price'] }
        ]
      });

      if (!share) throw new Error('Share not found');

      return {
        shareId,
        productId: share.productId,
        productName: share.product?.name,
        clicks: share.clicks || 0,
        likes: share.likes || 0,
        createdAt: share.createdAt,
        shortUrl: share.shortUrl
      };
    } catch (error) {
      console.error('[ProductSharesService] getAnalytics error:', error.message);
      throw error;
    }
  }

  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const offset = (page - 1) * limit;
      const { count, rows } = await ProductShare.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return { total: count, data: rows };
    } catch (error) {
      console.error('[ProductSharesService] getAll error:', error.message);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const share = await ProductShare.findByPk(id, {
        include: [
          { model: models.Product, as: 'product', required: false },
          { model: models.User, as: 'sharedBy', attributes: ['id', 'username', 'email'] }
        ]
      });

      return share;
    } catch (error) {
      console.error('[ProductSharesService] getById error:', error.message);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const ProductShare = models.ProductShare;
      if (!ProductShare) throw new Error('ProductShare model not initialized');

      const share = await ProductShare.findByPk(id);
      if (!share) throw new Error('Share not found');

      await share.update(data);
      return share;
    } catch (error) {
      console.error('[ProductSharesService] update error:', error.message);
      throw error;
    }
  }
}

module.exports = ProductSharesService;
