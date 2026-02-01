const ServiceLoader = require('../services/ServiceLoader');
const liveService = ServiceLoader.loadService('liveService');


const { sendResponse, sendError } = require('../utils/response');

class LiveController {
  /**
   * Get all live streams
   * GET /
   */
  static async getAllLiveStreams(req, res) {
    try {
      const { page = 1, limit = 20, status = 'active' } = req.query;
      const streams = await LiveRepository.findAll({ page, limit, status });
      return sendResponse(res, {
        success: true,
        data: streams,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(streams.total / limit),
          total: streams.total
        },
        message: 'Live streams retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get active live streams (alias)
   * GET /
   */
  static async getActiveLiveStreams(req, res) {
    return LiveController.getAllLiveStreams(req, res);
  }

  /**
   * Get live stream by ID
   * GET /:streamId
   */
  static async getLiveStreamById(req, res) {
    try {
      const { streamId } = req.params;
      const stream = await LiveRepository.findById(streamId);
      if (!stream) return sendError(res, 'Stream not found', 404);
      return sendResponse(res, {
        success: true,
        data: stream,
        message: 'Live stream retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get live stream details (alias)
   * GET /:streamId
   */
  static async getLiveStreamDetails(req, res) {
    return LiveController.getLiveStreamById(req, res);
  }

  /**
   * Start a live stream
   * POST /start
   */
  static async startLiveStream(req, res) {
    try {
      const { title, description, thumbnail } = req.body;
      const userId = req.user?.id;
      const stream = await LiveRepository.create({
        userId,
        title,
        description,
        thumbnail,
        status: 'active',
        startedAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: stream,
        message: 'Live stream started successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * End a live stream
   * PUT /:streamId/end
   */
  static async endLiveStream(req, res) {
    try {
      const { streamId } = req.params;
      const stream = await LiveRepository.update(streamId, {
        status: 'ended',
        endedAt: new Date()
      });
      if (!stream) return sendError(res, 'Stream not found', 404);
      return sendResponse(res, {
        success: true,
        data: stream,
        message: 'Live stream ended successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete live stream
   * DELETE /:streamId
   */
  static async deleteLiveStream(req, res) {
    try {
      const { streamId } = req.params;
      await LiveRepository.delete(streamId);
      return sendResponse(res, {
        success: true,
        message: 'Live stream deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Pin product in live stream
   * POST /:streamId/pin-product
   */
  static async pinProduct(req, res) {
    try {
      const { streamId } = req.params;
      const { productId } = req.body;
      const result = await LiveRepository.pinProduct(streamId, productId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'Product pinned successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Remove pinned product from live stream
   * DELETE /:streamId/pin-product/:productId
   */
  static async removePinnedProduct(req, res) {
    try {
      const { streamId, productId } = req.params;
      await LiveRepository.unpinProduct(streamId, productId);
      return sendResponse(res, {
        success: true,
        message: 'Product unpinned successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Unpin product from live stream (alias)
   * DELETE /:streamId/pin-product/:productId
   */
  static async unpinProduct(req, res) {
    return LiveController.removePinnedProduct(req, res);
  }

  /**
   * Get live stream viewers
   * GET /:streamId/viewers
   */
  static async getViewers(req, res) {
    try {
      const { streamId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const viewers = await LiveRepository.getViewers(streamId, { page, limit });
      return sendResponse(res, {
        success: true,
        data: viewers,
        message: 'Viewers retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get stream viewers (alias)
   * GET /:streamId/viewers
   */
  static async getStreamViewers(req, res) {
    return LiveController.getViewers(req, res);
  }

  /**
   * Get trending live streams
   * GET /trending
   */
  static async getTrendingStreams(req, res) {
    try {
      const { limit = 10 } = req.query;
      const trending = await LiveRepository.getTrending(limit);
      return sendResponse(res, {
        success: true,
        data: trending,
        message: 'Trending streams retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Join live stream
   * POST /:streamId/join
   */
  static async joinLiveStream(req, res) {
    try {
      const { streamId } = req.params;
      const userId = req.user?.id;
      return sendResponse(res, {
        success: true,
        data: { streamId, userId, joined: true },
        message: 'Joined live stream successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = LiveController;
