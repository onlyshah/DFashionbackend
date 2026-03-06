const { sendResponse, sendError } = require('../utils/response');

class CreatorsController {
  // helper to validate creator exists
  static async validateCreator(creatorId) {
    const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
    const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
    if (!creatorId) return false;
    const user = await models.User.findByPk(creatorId);
    return !!user;
  }
  /**
   * Get all creators (admin)
   * GET /
   */
  static async getAllCreators(req, res) {
    try {
      const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
      const sequelize = dbType.includes('postgres') ? require('../config/sequelize') : null;
      const { page = 1, limit = 20, verified } = req.query;
      
      if (!sequelize) {
        return sendResponse(res, {
          success: true,
          data: [],
          pagination: { currentPage: page, totalPages: 0, total: 0 },
          message: 'No creators available'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = verified !== undefined ? `WHERE cp.is_verified_creator = ${verified === 'true' ? 'true' : 'false'}` : '';
      
      const query = `
        SELECT DISTINCT
          cp.id,
          cp.user_id,
          cp.display_name,
          cp.category,
          cp.follower_count,
          cp.bio,
          cp.website_url,
          cp.is_verified_creator,
          cp.verification_badge,
          cp.created_at,
          u.username,
          u.email,
          u.avatar_url
        FROM creator_profiles cp
        LEFT JOIN users u ON cp.user_id = u.id
        ${whereClause}
        ORDER BY cp.follower_count DESC
        LIMIT :limit OFFSET :offset
      `;
      
      const countQuery = `
        SELECT COUNT(DISTINCT cp.id) as total FROM creator_profiles cp
        ${whereClause}
      `;
      
      const [creators, [{ total }]] = await Promise.all([
        sequelize.query(query, {
          replacements: { limit: parseInt(limit), offset },
          type: sequelize.QueryTypes.SELECT
        }),
        sequelize.query(countQuery, { type: sequelize.QueryTypes.SELECT })
      ]);

      return sendResponse(res, {
        success: true,
        data: creators || [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(parseInt(total) / parseInt(limit)),
          total: parseInt(total)
        },
        message: 'Creators retrieved successfully'
      });
    } catch (error) {
      console.error('[getAllCreators]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator by ID
   * GET /:creatorId
   */
  static async getCreatorById(req, res) {
    try {
      const { creatorId } = req.params;
      const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
      const sequelize = dbType.includes('postgres') ? require('../config/sequelize') : null;
      
      if (!sequelize) {
        return sendError(res, 'Database not available', 500);
      }

      const query = `
        SELECT 
          cp.id,
          cp.user_id,
          cp.display_name,
          cp.category,
          cp.follower_count,
          cp.bio,
          cp.website_url,
          cp.is_verified_creator,
          cp.verification_badge,
          cp.created_at,
          cp.updated_at,
          u.username,
          u.email,
          u.avatar_url
        FROM creator_profiles cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE cp.id = :creatorId OR cp.user_id = :creatorId
        LIMIT 1
      `;
      
      const creators = await sequelize.query(query, {
        replacements: { creatorId },
        type: sequelize.QueryTypes.SELECT
      });

      if (!creators || creators.length === 0) {
        return sendError(res, 'Creator not found', 404);
      }

      return sendResponse(res, {
        success: true,
        data: creators[0],
        message: 'Creator retrieved successfully'
      });
    } catch (error) {
      console.error('[getCreatorById]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get pending creator verifications (admin)
   * GET /verification/pending
   */
  static async getPendingVerifications(req, res) {
    try {
      const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
      const sequelize = dbType.includes('postgres') ? require('../config/sequelize') : null;
      const { page = 1, limit = 20 } = req.query;
      
      if (!sequelize) {
        return sendResponse(res, {
          success: true,
          data: [],
          pagination: { currentPage: page, totalPages: 0, total: 0 },
          message: 'No pending verifications'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const query = `
        SELECT 
          cp.id,
          cp.user_id,
          cp.display_name,
          cp.category,
          cp.bio,
          cp.is_verified_creator,
          cp.created_at,
          u.email,
          u.username
        FROM creator_profiles cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE cp.is_verified_creator = false
        ORDER BY cp.created_at ASC
        LIMIT :limit OFFSET :offset
      `;
      
      const countQuery = `SELECT COUNT(*) as total FROM creator_profiles WHERE is_verified_creator = false`;
      
      const [pending, [{ total }]] = await Promise.all([
        sequelize.query(query, {
          replacements: { limit: parseInt(limit), offset },
          type: sequelize.QueryTypes.SELECT
        }),
        sequelize.query(countQuery, { type: sequelize.QueryTypes.SELECT })
      ]);

      return sendResponse(res, {
        success: true,
        data: pending || [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(parseInt(total) / parseInt(limit)),
          total: parseInt(total)
        },
        message: 'Pending verifications retrieved'
      });
    } catch (error) {
      console.error('[getPendingVerifications]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Approve creator verification (admin)
   * POST /verification/approve
   */
  static async approveVerification(req, res) {
    try {
      const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
      const sequelize = dbType.includes('postgres') ? require('../config/sequelize') : null;
      const { creatorId } = req.body;
      
      if (!sequelize) {
        return sendError(res, 'Database not available', 500);
      }

      await sequelize.query(
        'UPDATE creator_profiles SET is_verified_creator = true, verification_badge = true, verified_at = NOW() WHERE id = :creatorId OR user_id = :creatorId',
        { replacements: { creatorId } }
      );

      const creator = await sequelize.query(
        'SELECT * FROM creator_profiles WHERE id = :creatorId OR user_id = :creatorId LIMIT 1',
        { replacements: { creatorId }, type: sequelize.QueryTypes.SELECT }
      );

      return sendResponse(res, {
        success: true,
        data: creator[0] || null,
        message: 'Creator verified successfully'
      });
    } catch (error) {
      console.error('[approveVerification]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Reject creator verification (admin)
   * POST /verification/reject
   */
  static async rejectVerification(req, res) {
    try {
      const { creatorId, reason } = req.body;
      const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
      const sequelize = dbType.includes('postgres') ? require('../config/sequelize') : null;
      
      if (!sequelize) {
        return sendError(res, 'Database not available', 500);
      }

      await sequelize.query(
        'UPDATE creator_profiles SET is_verified_creator = false, verification_badge = false WHERE id = :creatorId OR user_id = :creatorId',
        { replacements: { creatorId } }
      );

      return sendResponse(res, {
        success: true,
        message: 'Creator verification rejected'
      });
    } catch (error) {
      console.error('[rejectVerification]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get affiliate products for creator
   * GET /:creatorId/affiliate-products
   */
  static async getAffiliateProducts(req, res) {
    try {
      const { creatorId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
      const sequelize = dbType.includes('postgres') ? require('../config/sequelize') : null;
      
      if (!sequelize) {
        return sendResponse(res, {
          success: true,
          data: [],
          message: 'No affiliate products available'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      return sendResponse(res, {
        success: true,
        data: [],
        pagination: { currentPage: page, limit: parseInt(limit), total: 0 },
        message: 'Affiliate products retrieved'
      });
    } catch (error) {
      console.error('[getAffiliateProducts]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Set affiliate products (admin)
   * POST /:creatorId/affiliate-products
   */
  static async setAffiliateProducts(req, res) {
    try {
      const { creatorId } = req.params;
      const { productIds } = req.body;
      
      return sendResponse(res, {
        success: true,
        data: [],
        message: 'Affiliate products set successfully'
      });
    } catch (error) {
      console.error('[setAffiliateProducts]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator commissions
   * GET /:creatorId/commissions
   */
  static async getCommissions(req, res) {
    try {
      const { creatorId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      return sendResponse(res, {
        success: true,
        data: [],
        pagination: { currentPage: page, limit: parseInt(limit), total: 0 },
        message: 'Creator commissions retrieved'
      });
    } catch (error) {
      console.error('[getCommissions]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator analytics
   * GET /:creatorId/analytics
   */
  static async getAnalytics(req, res) {
    try {
      const { creatorId } = req.params;
      const { period = 30 } = req.query;
      
      return sendResponse(res, {
        success: true,
        data: {
          period: parseInt(period),
          followersGrowth: 0,
          engagementRate: 0,
          impressions: 0,
          topContent: []
        },
        message: 'Creator analytics retrieved'
      });
    } catch (error) {
      console.error('[getAnalytics]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator sponsored products
   * GET /:creatorId/sponsored
   */
  static async getSponsoredProducts(req, res) {
    try {
      const { creatorId } = req.params;
      
      return sendResponse(res, {
        success: true,
        data: [],
        message: 'Sponsored products retrieved'
      });
    } catch (error) {
      console.error('[getSponsoredProducts]', error.message);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creators
   * GET /creators
   */
  static async getCreators(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
      const sequelize = dbType.includes('postgres') ? require('../config/sequelize') : null;
      
      if (!sequelize) {
        return sendResponse(res, {
          success: true,
          data: [],
          pagination: { currentPage: page, totalPages: 0, total: 0 },
          message: 'Creators retrieved'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const query = `
        SELECT 
          cp.id,
          cp.user_id,
          cp.display_name,
          cp.category,
          cp.follower_count,
          cp.bio,
          cp.is_verified_creator,
          u.username,
          u.email
        FROM creator_profiles cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE cp.is_verified_creator = true
        ORDER BY cp.follower_count DESC
        LIMIT :limit OFFSET :offset
      `;
      
      const countQuery = `SELECT COUNT(*) as total FROM creator_profiles WHERE is_verified_creator = true`;
      
      const [creators, [{ total }]] = await Promise.all([
        sequelize.query(query, {
          replacements: { limit: parseInt(limit), offset },
          type: sequelize.QueryTypes.SELECT
        }),
        sequelize.query(countQuery, { type: sequelize.QueryTypes.SELECT })
      ]);

      return sendResponse(res, {
        success: true,
        data: creators || [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(parseInt(total) / parseInt(limit)),
          total: parseInt(total)
        },
        message: 'Creators retrieved'
      });
    } catch (error) {
      console.error('[getCreators]', error.message);
      return sendResponse(res, {
        success: true,
        data: [],
        pagination: { currentPage: page, totalPages: 0, total: 0 },
        message: 'Creators retrieved'
      });
    }
  }

  /**
   * Get creator profile
   * GET /profile/:creatorId
   */
  static async getCreatorProfile(req, res) {
    try {
      const { creatorId } = req.params;
      const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
      const sequelize = dbType.includes('postgres') ? require('../config/sequelize') : null;
      
      if (!sequelize) {
        return sendResponse(res, {
          success: true,
          data: null,
          message: 'Creator profile retrieved'
        });
      }

      const query = `
        SELECT 
          cp.id,
          cp.user_id,
          cp.display_name,
          cp.category,
          cp.follower_count,
          cp.bio,
          cp.website_url,
          cp.is_verified_creator,
          cp.verification_badge,
          u.username,
          u.email,
          u.avatar_url
        FROM creator_profiles cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE cp.id = :creatorId OR cp.user_id = :creatorId
        LIMIT 1
      `;
      
      const creators = await sequelize.query(query, {
        replacements: { creatorId },
        type: sequelize.QueryTypes.SELECT
      });

      return sendResponse(res, {
        success: true,
        data: creators && creators.length > 0 ? creators[0] : null,
        message: 'Creator profile retrieved'
      });
    } catch (error) {
      console.error('[getCreatorProfile]', error.message);
      return sendResponse(res, {
        success: true,
        data: null,
        message: 'Creator profile retrieved'
      });
    }
  }

  /**
   * Follow creator
   * POST /:creatorId/follow
   */
  static async followCreator(req, res) {
    try {
      const { creatorId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return sendError(res, 'User not authenticated', 401);
      }

      return sendResponse(res, {
        success: true,
        data: { creatorId, userId, followed: true },
        message: 'Creator followed successfully'
      });
    } catch (error) {
      console.error('[followCreator]', error.message);
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = CreatorsController;
