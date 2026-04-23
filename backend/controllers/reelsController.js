/**
 * ============================================================================
 * REELS CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Handle short-form video content (TikTok-style), engagement, trending
 * Database: PostgreSQL via Sequelize ORM
 */

const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');
const { createFashionArtwork, slugify } = require('../dbseeder/utils/image-utils');

const DEFAULT_PRODUCT_IMAGE = '/uploads/default-product.svg';

const getTaggedProductIds = (item) => {
  const rawIds = item?.productIds || item?.product_ids || [];
  return Array.isArray(rawIds) ? rawIds.filter(Boolean) : [];
};

const buildProductPreviewMap = async (productIds = []) => {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return new Map();
  }

  const products = await models.Product.findAll({
    where: { id: uniqueIds },
    attributes: ['id', 'name', 'title', 'price', 'imageUrl']
  });

  return new Map(products.map((product) => {
    const item = product.toJSON ? product.toJSON() : product;
    const fallbackImage = item.imageUrl || createFashionArtwork('products', slugify(item.title || item.name || item.id), 0, { subtitle: 'Tagged product' });
    return [item.id, {
      _id: item.id,
      id: item.id,
      name: item.name || item.title || 'Product',
      price: Number(item.price || 0),
      images: [{ url: fallbackImage || DEFAULT_PRODUCT_IMAGE, isPrimary: true }],
      image: fallbackImage || DEFAULT_PRODUCT_IMAGE,
      brand: ''
    }];
  }));
};

const formatReelForClient = (reel, productPreviewMap) => {
  const item = reel.toJSON ? reel.toJSON() : reel;
  const creator = item.creator || item.author || null;

  return {
    ...item,
    _id: item.id || item._id,
    products: getTaggedProductIds(item).map((productId) => ({
      _id: productId,
      product: productPreviewMap.get(productId) || {
        _id: productId,
        id: productId,
        name: 'Product',
        price: 0,
        images: [{ url: DEFAULT_PRODUCT_IMAGE, isPrimary: true }],
        brand: ''
      }
    })),
    user: creator ? {
      _id: creator.id || creator._id,
      id: creator.id || creator._id,
      username: creator.username,
      fullName: creator.full_name || creator.fullName || creator.username,
      avatar: creator.avatar_url || creator.avatar || '',
      isVerified: !!creator.is_verified
    } : null
  };
};

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

    const productPreviewMap = await buildProductPreviewMap(
      rows.flatMap((reel) => getTaggedProductIds(reel.toJSON ? reel.toJSON() : reel))
    );

    return ApiResponse.paginated(
      res,
      rows.map((reel) => formatReelForClient(reel, productPreviewMap)),
      pagination,
      'Reels feed retrieved successfully'
    );
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

    const productPreviewMap = await buildProductPreviewMap(
      rows.flatMap((reel) => getTaggedProductIds(reel.toJSON ? reel.toJSON() : reel))
    );

    return ApiResponse.paginated(
      res,
      rows.map((reel) => formatReelForClient(reel, productPreviewMap)),
      pagination,
      'Trending reels retrieved successfully'
    );
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

    const productPreviewMap = await buildProductPreviewMap(getTaggedProductIds(reel.toJSON ? reel.toJSON() : reel));
    return ApiResponse.success(res, formatReelForClient(reel, productPreviewMap), 'Reel retrieved successfully');
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
