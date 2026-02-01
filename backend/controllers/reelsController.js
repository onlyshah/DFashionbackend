/**
 * ============================================================================
 * REELS CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Handle short-form video content (TikTok-style), engagement, trending
 * Database: PostgreSQL via Sequelize ORM
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

/**
 * Get reels feed (For You Page)
 */
exports.getReelsFeed = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await models.Reel.findAndCountAll({
      where: { is_deleted: false },
      include: [
        {
          model: models.User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name', 'avatar_url', 'is_verified']
        },
        {
          model: models.ReelLike,
          attributes: ['id'],
          where: { user_id: req.user?.id || null },
          required: false
        }
      ],
      order: [['views_count', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const pagination = {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'Reels feed retrieved successfully');
  } catch (error) {
    console.error('❌ getReelsFeed error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get trending reels
 */
exports.getTrendingReels = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await models.Reel.findAndCountAll({
      where: { is_deleted: false },
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url', 'is_verified']
      },
      order: [['engagement_score', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const pagination = {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'Trending reels retrieved successfully');
  } catch (error) {
    console.error('❌ getTrendingReels error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get reel by ID
 */
exports.getReelById = async (req, res) => {
  try {
    const { id } = req.params;

    const reel = await models.Reel.findByPk(id, {
      include: [
        {
          model: models.User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name', 'avatar_url', 'is_verified']
        },
        {
          model: models.ReelLike,
          attributes: ['id'],
          where: { user_id: req.user?.id || null },
          required: false
        }
      ]
    });

    if (!reel || reel.is_deleted) {
      return ApiResponse.notFound(res, 'Reel');
    }

    // Increment views
    await reel.increment('views_count');

    return ApiResponse.success(res, reel, 'Reel retrieved successfully');
  } catch (error) {
    console.error('❌ getReelById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Create reel
 */
exports.createReel = async (req, res) => {
  try {
    const { video_url, thumbnail_url, caption, hashtags, music_id, duration } = req.body;

    if (!video_url) {
      return ApiResponse.error(res, 'Video URL is required', 422);
    }

    const reel = await models.Reel.create({
      creator_id: req.user.id,
      video_url,
      thumbnail_url,
      caption,
      hashtags: hashtags || [],
      music_id,
      duration,
      views_count: 0,
      engagement_score: 0,
      is_deleted: false
    });

    const reelWithCreator = await models.Reel.findByPk(reel.id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url', 'is_verified']
      }
    });

    return ApiResponse.created(res, reelWithCreator, 'Reel created successfully');
  } catch (error) {
    console.error('❌ createReel error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update reel
 */
exports.updateReel = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, hashtags } = req.body;

    const reel = await models.Reel.findByPk(id);
    if (!reel) {
      return ApiResponse.notFound(res, 'Reel');
    }

    if (reel.creator_id !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only edit your own reels');
    }

    await reel.update({
      caption: caption !== undefined ? caption : reel.caption,
      hashtags: hashtags !== undefined ? hashtags : reel.hashtags
    });

    const updatedReel = await models.Reel.findByPk(id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url', 'is_verified']
      }
    });

    return ApiResponse.success(res, updatedReel, 'Reel updated successfully');
  } catch (error) {
    console.error('❌ updateReel error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete reel (soft delete)
 */
exports.deleteReel = async (req, res) => {
  try {
    const { id } = req.params;

    const reel = await models.Reel.findByPk(id);
    if (!reel) {
      return ApiResponse.notFound(res, 'Reel');
    }

    const user = await models.User.findByPk(req.user.id, {
      include: { model: models.Role }
    });

    if (reel.creator_id !== req.user.id && !['admin', 'super_admin'].includes(user.Role?.name)) {
      return ApiResponse.forbidden(res, 'You can only delete your own reels');
    }

    await reel.update({ is_deleted: true });

    return ApiResponse.success(res, {}, 'Reel deleted successfully');
  } catch (error) {
    console.error('❌ deleteReel error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Toggle like on reel
 */
exports.toggleLikeReel = async (req, res) => {
  try {
    const { id } = req.params;

    const reel = await models.Reel.findByPk(id);
    if (!reel || reel.is_deleted) {
      return ApiResponse.notFound(res, 'Reel');
    }

    const existingLike = await models.ReelLike.findOne({
      where: { reel_id: id, user_id: req.user.id }
    });

    if (existingLike) {
      await existingLike.destroy();
      await reel.decrement('likes_count');
      return ApiResponse.success(res, { liked: false }, 'Reel unliked');
    } else {
      await models.ReelLike.create({
        reel_id: id,
        user_id: req.user.id
      });
      await reel.increment('likes_count');
      return ApiResponse.success(res, { liked: true }, 'Reel liked');
    }
  } catch (error) {
    console.error('❌ toggleLikeReel error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Save reel
 */
exports.saveReel = async (req, res) => {
  try {
    const { id } = req.params;

    const reel = await models.Reel.findByPk(id);
    if (!reel || reel.is_deleted) {
      return ApiResponse.notFound(res, 'Reel');
    }

    const existingSave = await models.SavedReel.findOne({
      where: { reel_id: id, user_id: req.user.id }
    });

    if (existingSave) {
      await existingSave.destroy();
      return ApiResponse.success(res, { saved: false }, 'Reel unsaved');
    } else {
      await models.SavedReel.create({
        reel_id: id,
        user_id: req.user.id
      });
      return ApiResponse.success(res, { saved: true }, 'Reel saved');
    }
  } catch (error) {
    console.error('❌ saveReel error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get user's reels
 */
exports.getUserReels = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const user = await models.User.findByPk(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const { count, rows } = await models.Reel.findAndCountAll({
      where: {
        creator_id: userId,
        is_deleted: false
      },
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url', 'is_verified']
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const pagination = {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'User reels retrieved successfully');
  } catch (error) {
    console.error('❌ getUserReels error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Search reels
 */
exports.searchReels = async (req, res) => {
  try {
    const { query } = req.query;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    if (!query) {
      return ApiResponse.error(res, 'Search query is required', 422);
    }

    const { count, rows } = await models.Reel.findAndCountAll({
      where: {
        [Op.or]: [
          { caption: { [Op.iLike]: `%${query}%` } },
          { hashtags: { [Op.contains]: [query] } }
        ],
        is_deleted: false
      },
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url', 'is_verified']
      },
      order: [['views_count', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const pagination = {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'Reels search completed successfully');
  } catch (error) {
    console.error('❌ searchReels error:', error);
    return ApiResponse.serverError(res, error);
  }
};
