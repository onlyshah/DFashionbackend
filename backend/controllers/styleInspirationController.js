const ServiceLoader = require('../services/ServiceLoader');
const styleInspirationService = ServiceLoader.loadService('styleInspirationService');


const { sendResponse, sendError } = require('../utils/response');

class StyleInspirationController {
  /**
   * Get all style inspiration posts
   * GET /
   */
  static async getAllPosts(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const posts = await StyleInspirationRepository.findAll({ page, limit });
      return sendResponse(res, {
        success: true,
        data: posts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(posts.total / limit),
          total: posts.total
        },
        message: 'Style inspiration posts retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get all inspirations (alias for getAllPosts)
   * GET /
   */
  static async getAllInspirations(req, res) {
    return StyleInspirationController.getAllPosts(req, res);
  }

  /**
   * Get post by ID
   * GET /:postId
   */
  static async getPostById(req, res) {
    try {
      const { postId } = req.params;
      const post = await StyleInspirationRepository.findById(postId);
      if (!post) return sendError(res, 'Post not found', 404);
      return sendResponse(res, {
        success: true,
        data: post,
        message: 'Style post retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get inspiration by ID (alias for getPostById)
   * GET /:id
   */
  static async getInspirationById(req, res) {
    try {
      const { id } = req.params;
      const { postId } = req.params;
      const actualId = id || postId;
      const post = await StyleInspirationRepository.findById(actualId);
      if (!post) return sendError(res, 'Post not found', 404);
      return sendResponse(res, {
        success: true,
        data: post,
        message: 'Style post retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create style post
   * POST /
   */
  static async createPost(req, res) {
    try {
      const { title, description, images, tags, products } = req.body;
      const userId = req.user?.id;
      const post = await StyleInspirationRepository.create({
        userId,
        title,
        description,
        images,
        tags,
        products,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: post,
        message: 'Style post created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create inspiration (alias for createPost)
   * POST /
   */
  static async createInspiration(req, res) {
    return StyleInspirationController.createPost(req, res);
  }

  /**
   * Update post
   * PUT /:postId
   */
  static async updatePost(req, res) {
    try {
      const { postId } = req.params;
      const updates = req.body;
      const post = await StyleInspirationRepository.update(postId, updates);
      if (!post) return sendError(res, 'Post not found', 404);
      return sendResponse(res, {
        success: true,
        data: post,
        message: 'Post updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update inspiration (alias for updatePost)
   * PUT /:id
   */
  static async updateInspiration(req, res) {
    try {
      const { id } = req.params;
      const { postId } = req.params;
      const actualId = id || postId;
      const updates = req.body;
      const post = await StyleInspirationRepository.update(actualId, updates);
      if (!post) return sendError(res, 'Post not found', 404);
      return sendResponse(res, {
        success: true,
        data: post,
        message: 'Post updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete post
   * DELETE /:postId
   */
  static async deletePost(req, res) {
    try {
      const { postId } = req.params;
      await StyleInspirationRepository.delete(postId);
      return sendResponse(res, {
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete inspiration (alias for deletePost)
   * DELETE /:id
   */
  static async deleteInspiration(req, res) {
    try {
      const { id } = req.params;
      const { postId } = req.params;
      const actualId = id || postId;
      await StyleInspirationRepository.delete(actualId);
      return sendResponse(res, {
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get trending styles
   * GET /trending
   */
  static async getTrendingStyles(req, res) {
    try {
      const { limit = 10, period = 7 } = req.query;
      const trending = await StyleInspirationRepository.getTrending(limit, period);
      return sendResponse(res, {
        success: true,
        data: trending,
        message: 'Trending styles retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get styles by category
   * GET /category/:category
   */
  static async getStylesByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const styles = await StyleInspirationRepository.getByCategory(category, { page, limit });
      return sendResponse(res, {
        success: true,
        data: styles,
        message: 'Styles by category retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get styles by tag
   * GET /tag/:tag
   */
  static async getStylesByTag(req, res) {
    try {
      const { tag } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const styles = await StyleInspirationRepository.getByTag(tag, { page, limit });
      return sendResponse(res, {
        success: true,
        data: styles,
        message: 'Styles by tag retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Like a style post
   * POST /:postId/like
   */
  static async likePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.id;
      const result = await StyleInspirationRepository.toggleLike(postId, userId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: result.liked ? 'Post liked' : 'Post unliked'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get style collections
   * GET /collections
   */
  static async getStyleCollections(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      return sendResponse(res, {
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          total: 0
        },
        message: 'Style collections retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get influencer styles
   * GET /influencers
   */
  static async getInfluencerStyles(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      return sendResponse(res, {
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          total: 0
        },
        message: 'Influencer styles retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = StyleInspirationController;
