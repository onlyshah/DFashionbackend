/**
 * ============================================================================
 * STORIES CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Handle story CRUD, auto-expiration (24h), engagement
 * Database: PostgreSQL via Sequelize ORM
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

/**
 * Get all active stories (24h window)
 */
exports.getAllStories = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await models.Story.findAndCountAll({
      where: {
        expires_at: { [Op.gt]: new Date() }
      },
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
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

    return ApiResponse.paginated(res, rows, pagination, 'Stories retrieved successfully');
  } catch (error) {
    console.error('❌ getAllStories error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get story by ID
 */
exports.getStoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const story = await models.Story.findByPk(id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    if (story.expires_at < new Date()) {
      return ApiResponse.error(res, 'Story has expired', 410);
    }

    return ApiResponse.success(res, story, 'Story retrieved successfully');
  } catch (error) {
    console.error('❌ getStoryById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Create new story
 */
exports.createStory = async (req, res) => {
  try {
    const { media_url, text_overlay, stickers, filters_applied, can_reply, can_share } = req.body;

    if (!media_url) {
      return ApiResponse.error(res, 'Media URL is required', 422);
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await models.Story.create({
      creator_id: req.user.id,
      media_url,
      text_overlay,
      stickers: stickers || [],
      filters_applied: filters_applied || [],
      can_reply: can_reply !== undefined ? can_reply : true,
      can_share: can_share !== undefined ? can_share : true,
      expires_at: expiresAt
    });

    const storyWithCreator = await models.Story.findByPk(story.id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    return ApiResponse.created(res, storyWithCreator, 'Story created successfully');
  } catch (error) {
    console.error('❌ createStory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update story
 */
exports.updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { text_overlay, stickers, filters_applied } = req.body;

    const story = await models.Story.findByPk(id);
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    if (story.creator_id !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only edit your own stories');
    }

    await story.update({
      text_overlay: text_overlay !== undefined ? text_overlay : story.text_overlay,
      stickers: stickers !== undefined ? stickers : story.stickers,
      filters_applied: filters_applied !== undefined ? filters_applied : story.filters_applied
    });

    const updatedStory = await models.Story.findByPk(id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    return ApiResponse.success(res, updatedStory, 'Story updated successfully');
  } catch (error) {
    console.error('❌ updateStory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete story
 */
exports.deleteStory = async (req, res) => {
  try {
    const { id } = req.params;

    const story = await models.Story.findByPk(id);
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    const user = await models.User.findByPk(req.user.id, {
      include: { model: models.Role }
    });

    if (story.creator_id !== req.user.id && !['admin', 'super_admin'].includes(user.Role?.name)) {
      return ApiResponse.forbidden(res, 'You can only delete your own stories');
    }

    await story.destroy();

    return ApiResponse.success(res, {}, 'Story deleted successfully');
  } catch (error) {
    console.error('❌ deleteStory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Record story view
 */
exports.recordStoryView = async (req, res) => {
  try {
    const { id } = req.params;

    const story = await models.Story.findByPk(id);
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    if (story.expires_at < new Date()) {
      return ApiResponse.error(res, 'Story has expired', 410);
    }

    await story.update({ views_count: (story.views_count || 0) + 1 });

    return ApiResponse.success(res, { viewsCount: story.views_count + 1 }, 'Story view recorded');
  } catch (error) {
    console.error('❌ recordStoryView error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get user's stories
 */
exports.getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const user = await models.User.findByPk(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const { count, rows } = await models.Story.findAndCountAll({
      where: {
        creator_id: userId,
        expires_at: { [Op.gt]: new Date() }
      },
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
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

    return ApiResponse.paginated(res, rows, pagination, 'User stories retrieved successfully');
  } catch (error) {
    console.error('❌ getUserStories error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Stub functions for missing endpoints
exports.likeStory = async (req, res) => {
  try {
    return ApiResponse.success(res, {}, 'Story liked');
  } catch (error) {
    return ApiResponse.serverError(res, error);
  }
};

exports.shareStory = async (req, res) => {
  try {
    return ApiResponse.success(res, {}, 'Story shared');
  } catch (error) {
    return ApiResponse.serverError(res, error);
  }
};

exports.commentOnStory = async (req, res) => {
  try {
    return ApiResponse.success(res, {}, 'Comment added');
  } catch (error) {
    return ApiResponse.serverError(res, error);
  }
};

exports.getStoryComments = async (req, res) => {
  try {
    return ApiResponse.success(res, [], 'Story comments retrieved');
  } catch (error) {
    return ApiResponse.serverError(res, error);
  }
};
