/**
 * ============================================================================
 * STORIES CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Handle story CRUD, auto-expiration (24h), engagement
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 13
 */

const { Op, QueryTypes } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { createFashionArtwork, slugify } = require('../dbseeder/utils/image-utils');

const DEFAULT_PRODUCT_IMAGE = '/uploads/default-product.svg';
const DEFAULT_STORY_IMAGE = '/uploads/default-story.svg';

const getCurrentUserId = (req) => req.user?.id || null;
const getStoryViewModel = () => models.StoryView;

const getTaggedProductIds = (item) => {
  const rawIds = item?.productIds || item?.product_ids || [];
  return Array.isArray(rawIds) ? rawIds.filter(Boolean) : [];
};

const getPrimaryMedia = (item) => {
  const mediaUrl = item?.mediaUrl || item?.media_url || item?.media?.url || item?.imageUrl || item?.thumbnailUrl || item?.thumbnail_url || DEFAULT_STORY_IMAGE;
  const mediaType = item?.mediaType || item?.media_type || item?.media?.type || (String(mediaUrl).match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image');
  return {
    url: mediaUrl || DEFAULT_STORY_IMAGE,
    type: mediaType === 'video' ? 'video' : 'image',
    thumbnail: item?.thumbnailUrl || item?.thumbnail_url || null,
    duration: item?.duration || item?.media?.duration || null
  };
};

const buildStoryViewSet = async (storyIds = [], userId = null) => {
  if (!userId || !storyIds.length) {
    return new Set();
  }

  const views = await models.StoryView.findAll({
    where: {
      userId,
      storyId: { [Op.in]: storyIds }
    },
    attributes: ['storyId'],
    raw: true
  });

  return new Set((views || []).map(view => view.storyId));
};

const buildProductPreviewMap = async (productIds = []) => {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return new Map();
  }

  const products = await models.Product.findAll({
    where: { id: uniqueIds },
    attributes: ['id', 'name', 'title', 'price', 'imageUrl'],
    raw: true
  });

  return new Map(products.map((product) => {
    const fallbackImage = product.imageUrl || createFashionArtwork('products', slugify(product.title || product.name || product.id), 0, { subtitle: 'Tagged product' });
    return [product.id, {
      _id: product.id,
      id: product.id,
      name: product.name || product.title || 'Product',
      price: Number(product.price || 0),
      images: [{ url: fallbackImage || DEFAULT_PRODUCT_IMAGE, isPrimary: true }],
      image: fallbackImage || DEFAULT_PRODUCT_IMAGE,
      brand: ''
    }];
  }));
};

const formatStoryForClient = (story, productPreviewMap, seenStoryIds = new Set()) => {
  const item = story.toJSON ? story.toJSON() : story;
  const creator = item.author || item.creator || item.user || null;
  const media = getPrimaryMedia(item);
  const productIds = getTaggedProductIds(item);
  const storyId = item.id || item._id;
  const isSeen = seenStoryIds.has(storyId);

  return {
    ...item,
    _id: storyId,
    id: storyId,
    story_id: storyId,
    media,
    mediaUrl: media.url,
    mediaType: media.type,
    productId: productIds[0] || item.productId || item.product_id || null,
    product_id: productIds[0] || item.productId || item.product_id || null,
    is_seen: isSeen,
    unseen: !isSeen,
    products: productIds.map((productId) => ({
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
      avatar: creator.avatar_url || creator.avatar || ''
    } : null,
    analytics: {
      views: item.viewsCount || item.views_count || 0,
      likes: item.likesCount || item.likes_count || 0,
      shares: item.sharesCount || item.shares_count || 0,
      productClicks: item.productClicks || item.product_clicks || 0,
      purchases: item.purchases || 0
    }
  };
};

/**
 * Get all active stories (24h window)
 */
exports.getAllStories = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const query = {
      where: {
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [{
        model: models.User,
        as: 'author',
        required: false,
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    };

    let { count, rows } = await models.Story.findAndCountAll(query);

    // Fallback for no active stories
    if (count === 0) {
      query.where = {};
      ({ count, rows } = await models.Story.findAndCountAll(query));
      console.info('🔄 getAllStories fallback: returning all stories, count=', count);
    }

    // Additional fallback using raw SQL
    if (count === 0) {
      try {
        const rawResults = await models.sequelize.query(
          `SELECT s.*, u.id as author_id, u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar_url
           FROM stories s
           LEFT JOIN users u ON s.user_id = u.id
           WHERE s.status != 'deleted'
           ORDER BY s.created_at DESC
           LIMIT $1 OFFSET $2`,
          {
            replacements: [limit, offset],
            type: QueryTypes.SELECT
          }
        );

        if (Array.isArray(rawResults) && rawResults.length > 0) {
          rows = rawResults.map(row => ({
            ...row,
            author: {
              id: row.author_id,
              username: row.author_username,
              full_name: row.author_full_name,
              avatar_url: row.author_avatar_url
            }
          }));
          count = rows.length;
          console.info('🔄 getAllStories raw SQL fallback used, count=', count);
        }
      } catch (fallbackError) {
        console.warn('⚠️ getAllStories raw SQL fallback error:', fallbackError);
      }
    }

    const pagination = {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit))
    };

    const productPreviewMap = await buildProductPreviewMap(
      rows.flatMap((story) => getTaggedProductIds(story.toJSON ? story.toJSON() : story))
    );
    const currentUserId = getCurrentUserId(req);
    const seenStoryIds = await buildStoryViewSet(
      rows.map((story) => story.id).filter(Boolean),
      currentUserId
    );
    const stories = rows.map((story) => formatStoryForClient(story, productPreviewMap, seenStoryIds));

    return res.status(200).json({
      success: true,
      message: 'Stories retrieved successfully',
      stories,
      data: stories,
      pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ getAllStories error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get stories preview (limited set for homepage/sidebar)
 */
exports.getStoriesPreview = async (req, res) => {
  try {
    const limit = 5; // Show 5 stories in preview

    const query = {
      where: {
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [{
        model: models.User,
        as: 'author',
        required: false,
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      distinct: true
    };

    let { count, rows } = await models.Story.findAndCountAll(query);

    if (count === 0) {
      query.where = {};
      ({ count, rows } = await models.Story.findAndCountAll(query));
      console.info('🔄 getStoriesPreview fallback: using all stories, count=', count);
    }

    const productPreviewMap = await buildProductPreviewMap(
      rows.flatMap((story) => getTaggedProductIds(story.toJSON ? story.toJSON() : story))
    );
    const currentUserId = getCurrentUserId(req);
    const seenStoryIds = await buildStoryViewSet(
      rows.map((story) => story.id).filter(Boolean),
      currentUserId
    );
    const stories = rows.map((story) => formatStoryForClient(story, productPreviewMap, seenStoryIds));

    return res.status(200).json({
      success: true,
      message: 'Stories preview retrieved successfully',
      stories,
      data: stories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ getStoriesPreview error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get story by ID
 */
exports.getStoryById = async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await models.Story.findByPk(storyId, {
      include: [{
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }]
    });

    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    if (story.expiresAt < new Date()) {
      return ApiResponse.error(res, 'Story has expired', 410);
    }

    const productPreviewMap = await buildProductPreviewMap(getTaggedProductIds(story.toJSON ? story.toJSON() : story));
    const currentUserId = getCurrentUserId(req);
    const seenStoryIds = await buildStoryViewSet([story.id].filter(Boolean), currentUserId);
    const storyData = formatStoryForClient(story, productPreviewMap, seenStoryIds);

    return ApiResponse.success(res, storyData, 'Story retrieved successfully');
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
    const mediaUrl = req.body.mediaUrl || req.body.media_url || req.body.media?.url;
    const mediaType = req.body.mediaType || req.body.media_type || req.body.media?.type || 'image';
    const productIds = Array.isArray(req.body.productIds)
      ? req.body.productIds
      : (req.body.product_id ? [req.body.product_id] : []);
    const caption = req.body.caption || req.body.text_overlay || '';
    const duration = req.body.duration || req.body.media?.duration || null;

    if (!mediaUrl) {
      return ApiResponse.error(res, 'Media URL is required', 422);
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await models.Story.create({
      userId: req.user.id,
      mediaUrl,
      mediaType,
      caption,
      duration,
      productIds,
      expiresAt,
      status: 'active'
    });

    const storyWithCreator = await models.Story.findByPk(story.id, {
      include: [{
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }]
    });

    const productPreviewMap = await buildProductPreviewMap(productIds);
    return ApiResponse.created(res, formatStoryForClient(storyWithCreator, productPreviewMap), 'Story created successfully');
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
    const { caption, mediaUrl, mediaType, productIds } = req.body;

    const story = await models.Story.findByPk(id);
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    if (story.userId !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only edit your own stories');
    }

    await story.update({
      caption: caption !== undefined ? caption : story.caption,
      mediaUrl: mediaUrl !== undefined ? mediaUrl : story.mediaUrl,
      mediaType: mediaType !== undefined ? mediaType : story.mediaType,
      productIds: productIds !== undefined ? productIds : story.productIds
    });

    const updatedStory = await models.Story.findByPk(id, {
      include: [{
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }]
    });

    const productPreviewMap = await buildProductPreviewMap(getTaggedProductIds(updatedStory.toJSON ? updatedStory.toJSON() : updatedStory));
    return ApiResponse.success(res, formatStoryForClient(updatedStory, productPreviewMap), 'Story updated successfully');
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

    const story = await models.Story.findByPk(id, {
      include: [{
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }]
    });

    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    const user = await models.User.findByPk(req.user.id, {
      include: [{ model: models.Role }]
    });

    if (story.userId !== req.user.id && !['admin', 'super_admin'].includes(user?.Role?.name)) {
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
    const storyId = req.params.storyId || req.params.id;
    const userId = getCurrentUserId(req);

    if (!userId) {
      return ApiResponse.error(res, 'Login required to view stories', 401);
    }

    const story = await models.Story.findByPk(storyId);
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    if (story.expiresAt < new Date()) {
      return ApiResponse.error(res, 'Story has expired', 410);
    }

    const [viewRecord, created] = await models.StoryView.findOrCreate({
      where: { userId, storyId },
      defaults: { userId, storyId, viewedAt: new Date() }
    });

    if (created) {
      const currentViews = Number(story.viewsCount || 0);
      await story.update({ viewsCount: currentViews + 1 });
    }

    return ApiResponse.success(res, {
      storyId,
      viewed: true,
      alreadySeen: !created,
      viewsCount: Number(story.viewsCount || 0) + (created ? 1 : 0),
      viewedAt: viewRecord.viewedAt || new Date()
    }, 'Story view recorded');
  } catch (error) {
    console.error('❌ recordStoryView error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get story viewers
 */
exports.getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;

    const viewers = await models.StoryView.findAll({
      where: { storyId },
      include: [{
        model: models.User,
        as: 'viewer',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }],
      order: [['viewedAt', 'DESC']]
    });

    return ApiResponse.success(res, viewers, 'Story viewers retrieved successfully');
  } catch (error) {
    console.error('❌ getStoryViewers error:', error);
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

    const user = await models.User.findByPk(userId, {
      include: [
        { model: models.Role, as: 'roleData' },
        { model: models.Department, as: 'department' }
      ]
    });

    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const { count, rows } = await models.Story.findAndCountAll({
      where: {
        userId,
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [{
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }],
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

    const productPreviewMap = await buildProductPreviewMap(
      rows.flatMap((story) => getTaggedProductIds(story.toJSON ? story.toJSON() : story))
    );
    const currentUserId = getCurrentUserId(req);
    const seenStoryIds = await buildStoryViewSet(
      rows.map((story) => story.id).filter(Boolean),
      currentUserId
    );
    const stories = rows.map((story) => formatStoryForClient(story, productPreviewMap, seenStoryIds));

    return ApiResponse.paginated(res, stories, pagination, 'User stories retrieved successfully');
  } catch (error) {
    console.error('❌ getUserStories error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Like story
 */
exports.likeStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = getCurrentUserId(req);

    if (!userId) {
      return ApiResponse.error(res, 'Login required', 401);
    }

    const story = await models.Story.findByPk(storyId);
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    const currentLikes = Number(story.likesCount || 0);
    await story.update({ likesCount: currentLikes + 1 });

    return ApiResponse.success(res, { likesCount: currentLikes + 1 }, 'Story liked');
  } catch (error) {
    console.error('❌ likeStory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Share story
 */
exports.shareStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = getCurrentUserId(req);

    if (!userId) {
      return ApiResponse.error(res, 'Login required', 401);
    }

    const story = await models.Story.findByPk(storyId);
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    const currentShares = Number(story.sharesCount || 0);
    await story.update({ sharesCount: currentShares + 1 });

    return ApiResponse.success(res, { sharesCount: currentShares + 1 }, 'Story shared');
  } catch (error) {
    console.error('❌ shareStory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Comment on story
 */
exports.commentOnStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { text } = req.body;
    const userId = getCurrentUserId(req);

    if (!userId) {
      return ApiResponse.error(res, 'Login required', 401);
    }

    if (!text) {
      return ApiResponse.error(res, 'Comment text required', 422);
    }

    const story = await models.Story.findByPk(storyId);
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    const comment = await models.StoryComment?.create({
      storyId,
      userId,
      text
    });

    return ApiResponse.created(res, comment, 'Comment added');
  } catch (error) {
    console.error('❌ commentOnStory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get story comments
 */
exports.getStoryComments = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const comments = await models.StoryComment?.findAll({
      where: { storyId },
      include: [{
        model: models.User,
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    }) || [];

    return ApiResponse.success(res, comments, 'Story comments retrieved');
  } catch (error) {
    console.error('❌ getStoryComments error:', error);
    return ApiResponse.serverError(res, error);
  }
};


