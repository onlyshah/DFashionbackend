const ServiceLoader = require('../services/ServiceLoader');
const smartCollectionsService = ServiceLoader.loadService('smartCollectionsService');


const { sendResponse, sendError } = require('../utils/response');

class SmartCollectionsController {
  /**
   * Get all smart collections
   * GET /
   */
  static async getAllCollections(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const collections = await SmartCollectionsRepository.findAll({ page, limit });
      return sendResponse(res, {
        success: true,
        data: collections,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(collections.total / limit),
          total: collections.total
        },
        message: 'Smart collections retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get smart collections (alias)
   * GET /
   */
  static async getSmartCollections(req, res) {
    return SmartCollectionsController.getAllCollections(req, res);
  }

  /**
   * Get trending collections
   * GET /trending
   */
  static async getTrendingCollections(req, res) {
    try {
      const { limit = 10 } = req.query;
      const trending = await SmartCollectionsRepository.getTrending(limit);
      return sendResponse(res, {
        success: true,
        data: trending,
        message: 'Trending collections retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get suggested collections
   * GET /suggested
   */
  static async getSuggestedCollections(req, res) {
    try {
      const userId = req.user?.id;
      const { limit = 10 } = req.query;
      const suggested = await SmartCollectionsRepository.getSuggested(userId, limit);
      return sendResponse(res, {
        success: true,
        data: suggested,
        message: 'Suggested collections retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get influencers
   * GET /influencers
   */
  static async getInfluencers(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const influencers = await SmartCollectionsRepository.getInfluencers({ page, limit });
      return sendResponse(res, {
        success: true,
        data: influencers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(influencers.total / limit),
          total: influencers.total
        },
        message: 'Influencers retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get collection by ID
   * GET /:collectionId
   */
  static async getCollectionById(req, res) {
    try {
      const { collectionId } = req.params;
      const collection = await SmartCollectionsRepository.findById(collectionId);
      if (!collection) return sendError(res, 'Collection not found', 404);
      return sendResponse(res, {
        success: true,
        data: collection,
        message: 'Collection retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get collection products
   * GET /:collectionId/products
   */
  static async getCollectionProducts(req, res) {
    try {
      const { collectionId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const products = await SmartCollectionsRepository.getProducts(collectionId, { page, limit });
      return sendResponse(res, {
        success: true,
        data: products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(products.total / limit),
          total: products.total
        },
        message: 'Collection products retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a smart collection (admin)
   * POST /
   */
  static async createCollection(req, res) {
    try {
      const { name, description, rules } = req.body;
      const collection = await SmartCollectionsRepository.create({
        name,
        description,
        rules,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: collection,
        message: 'Collection created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update a smart collection (admin)
   * PUT /:collectionId
   */
  static async updateCollection(req, res) {
    try {
      const { collectionId } = req.params;
      const { name, description, rules } = req.body;
      const collection = await SmartCollectionsRepository.update(collectionId, {
        name,
        description,
        rules
      });
      if (!collection) return sendError(res, 'Collection not found', 404);
      return sendResponse(res, {
        success: true,
        data: collection,
        message: 'Collection updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete a smart collection (admin)
   * DELETE /:collectionId
   */
  static async deleteCollection(req, res) {
    try {
      const { collectionId } = req.params;
      await SmartCollectionsRepository.delete(collectionId);
      return sendResponse(res, {
        success: true,
        message: 'Collection deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get featured collections
   * GET /featured
   */
  static async getFeaturedCollections(req, res) {
    try {
      const { limit = 10 } = req.query;
      const featured = await SmartCollectionsRepository.getFeatured(limit);
      return sendResponse(res, {
        success: true,
        data: featured,
        message: 'Featured collections retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get collection statistics
   * GET /:collectionId/statistics
   */
  static async getCollectionStats(req, res) {
    try {
      const { collectionId } = req.params;
      const stats = await SmartCollectionsRepository.getStats(collectionId);
      return sendResponse(res, {
        success: true,
        data: stats,
        message: 'Collection statistics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = SmartCollectionsController;
