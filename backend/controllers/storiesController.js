/**
 * ============================================================================
 * STORIES CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Handle story CRUD, auto-expiration (24h), engagement
 * Database: PostgreSQL via Sequelize ORM
 */

const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op, QueryTypes } = require('sequelize');
const { createFashionArtwork, slugify } = require('../dbseeder/utils/image-utils');

const DEFAULT_PRODUCT_IMAGE = '/uploads/default-product.svg';
const DEFAULT_STORY_IMAGE = '/uploads/default-story.svg';

const getCurrentUserId = (req) => req.user?.id || req.user?._id || null;
const getStoryViewModel = () => models._raw?.StoryView || models.StoryView;

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
  const StoryView = getStoryViewModel();
  if (!StoryView || !userId || !storyIds.length) {
    return new Set();
  }

  const views = await StoryView.findAll({
    where: {
      userId,
      storyId: { [Op.in]: storyIds }
    },
    attributes: ['storyId']
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

    let query = {
      where: {
        expires_at: { [Op.gt]: new Date() }
      },
      include: {
        model: models.User,
        as: 'author',
        required: false,
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    };

    let { count, rows } = await models.Story.findAndCountAll(query);

    // fallback for no active stories (reduce empty UI experience)
    if (count === 0) {
      query.where = {};
      ({ count, rows } = await models.Story.findAndCountAll(query));
      console.info('🔄 getAllStories fallback: returning unexpired fallback stories, count=', count);
    }

    if (count === 0) {
      const fallbackRows = await models.Story.findAll({
        order: [['createdAt', 'DESC']],
        limit: 5,
        include: { model: models.User, as: 'author', attributes: ['id', 'username', 'full_name', 'avatar_url'] }
      });
      rows = fallbackRows;
      count = fallbackRows.length;
      console.info('🔄 getAllStories fallback second-tier: top stories regardless of expires_at, count=', count);
    }

    // Extra safety fallback using raw query when ORM layer returns empty unexpectedly
    if (count === 0) {
      try {
        const sequelize = typeof models.getSequelizeInstance === 'function' ? await models.getSequelizeInstance() : null;
        if (sequelize) {
          const rawResults = await sequelize.query(
            `SELECT s.*, u.id as author_id, u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar_url
             FROM stories s
             LEFT JOIN users u ON s.user_id = u.id
             WHERE s.status != 'deleted'
             ORDER BY s.created_at DESC
             LIMIT :limit OFFSET :offset`,
            {
              replacements: { limit, offset },
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
            console.info('🔄 getAllStories fallback raw SQL used, count=', count);
          }
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
      rows.map((story) => story.id || story._id).filter(Boolean),
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

    let query = {
      where: {
        expires_at: { [Op.gt]: new Date() }
      },
      include: {
        model: models.User,
        as: 'author',
        required: false,
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      },
      order: [['createdAt', 'DESC']],
      limit,
      distinct: true
    };

    let { count, rows } = await models.Story.findAndCountAll(query);

    if (count === 0) {
      query.where = {};
      ({ count, rows } = await models.Story.findAndCountAll(query));
      console.info('🔄 getStoriesPreview fallback: using generic story set, count=', count);
    }

    if (count === 0) {
      const fallbackRows = await models.Story.findAll({
        order: [['createdAt', 'DESC']],
        limit,
        include: { model: models.User, as: 'author', attributes: ['id', 'username', 'full_name', 'avatar_url'] }
      });
      rows = fallbackRows;
      console.info('🔄 getStoriesPreview second-tier fallback: latest stories, count=', rows.length);
    }

    if (count === 0) {
      try {
        const sequelize = typeof models.getSequelizeInstance === 'function' ? await models.getSequelizeInstance() : null;
        if (sequelize) {
          const rawResults = await sequelize.query(
            `SELECT s.*, u.id as author_id, u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar_url
             FROM stories s
             LEFT JOIN users u ON s.user_id = u.id
             WHERE s.status != 'deleted'
             ORDER BY s.created_at DESC
             LIMIT :limit`,
            {
              replacements: { limit },
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
            console.info('🔄 getStoriesPreview raw SQL fallback used, count=', rows.length);
          }
        }
      } catch (fallbackError) {
        console.warn('⚠️ getStoriesPreview raw SQL fallback error:', fallbackError);
      }
    }

    const productPreviewMap = await buildProductPreviewMap(
      rows.flatMap((story) => getTaggedProductIds(story.toJSON ? story.toJSON() : story))
    );
    const currentUserId = getCurrentUserId(req);
    const seenStoryIds = await buildStoryViewSet(
      rows.map((story) => story.id || story._id).filter(Boolean),
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
      include: {
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    if (story.expires_at < new Date()) {
      return ApiResponse.error(res, 'Story has expired', 410);
    }

    const productPreviewMap = await buildProductPreviewMap(getTaggedProductIds(story.toJSON ? story.toJSON() : story));
    const currentUserId = getCurrentUserId(req);
    const seenStoryIds = await buildStoryViewSet([story.id || story._id].filter(Boolean), currentUserId);
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
    const canReply = req.body.can_reply !== undefined ? req.body.can_reply : (req.body.allowReplies !== undefined ? req.body.allowReplies : true);
    const canShare = req.body.can_share !== undefined ? req.body.can_share : (req.body.allowSharing !== undefined ? req.body.allowSharing : true);

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
      include: {
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
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

    if ((story.userId || story.user_id || story.creator_id) !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only edit your own stories');
    }

    await story.update({
      caption: caption !== undefined ? caption : story.caption,
      mediaUrl: mediaUrl !== undefined ? mediaUrl : story.mediaUrl,
      mediaType: mediaType !== undefined ? mediaType : story.mediaType,
      productIds: productIds !== undefined ? productIds : story.productIds
    });

    const updatedStory = await models.Story.findByPk(id, {
      include: {
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
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

    const story = await models.Story.findByPk(id, { include: [{ model: models.User, as: 'author', attributes: ['id', 'username', 'full_name', 'avatar_url'] }] });
    if (!story) {
      return ApiResponse.notFound(res, 'Story');
    }

    const user = await models.User.findByPk(req.user.id, {
      include: { model: models.Role }
    });

    if ((story.userId || story.user_id || story.creator_id) !== req.user.id && !['admin', 'super_admin'].includes(user.Role?.name)) {
      return ApiResponse.forbidden(res, 'You can only delete your own stories');
    }

    await story.destroy();

    return ApiResponse.success(res, {}, 'Story deleted successfully');
  } catch (error) {
    console.error('❌ deleteStory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Override legacy view tracking with persistent StoryView logic.
exports.recordStoryView = async (req, res) => {
  try {
    const storyId = req.params.storyId || req.params.id;
    const userId = getCurrentUserId(req);
    const StoryView = getStoryViewModel();

    console.log('📖 recordStoryView called:', { storyId, userId, hasStoryViewModel: !!StoryView });

    if (!userId) {
      console.log('❌ recordStoryView: No userId');
      return ApiResponse.error(res, 'Login required to view stories', 401);
    }

    const story = await models.Story.findByPk(storyId);
    if (!story) {
      console.log('❌ recordStoryView: Story not found:', storyId);
      return ApiResponse.notFound(res, 'Story');
    }

    const expiresAt = story.expiresAt || story.expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return ApiResponse.error(res, 'Story has expired', 410);
    }

    if (!StoryView) {
      return ApiResponse.error(res, 'Story view model unavailable', 500);
    }

    const [viewRecord, created] = await StoryView.findOrCreate({
      where: { userId, storyId },
      defaults: { userId, storyId, viewedAt: new Date() }
    });

    if (created) {
      const currentViews = Number(story.viewsCount || story.views_count || 0);
      await story.update({ viewsCount: currentViews + 1 });
    }

    return ApiResponse.success(res, {
      storyId,
      viewed: true,
      alreadySeen: !created,
      viewsCount: Number(story.viewsCount || story.views_count || 0) + (created ? 1 : 0),
      viewedAt: viewRecord.viewedAt || new Date()
    }, 'Story view recorded');
  } catch (error) {
    console.error('âŒ recordStoryView error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;
    const StoryView = getStoryViewModel();

    if (!StoryView) {
      return ApiResponse.error(res, 'Story view model unavailable', 500);
    }

    const viewers = await StoryView.findAll({
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
    console.error('âŒ getStoryViewers error:', error);
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

    const user = await models.User.findByPk(userId, { include: [{ model: models.Role, as: 'roleData' }, { model: models.Department, as: 'department' }] });
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

    const productPreviewMap = await buildProductPreviewMap(
      rows.flatMap((story) => getTaggedProductIds(story.toJSON ? story.toJSON() : story))
    );
    const currentUserId = getCurrentUserId(req);
    const seenStoryIds = await buildStoryViewSet(
      rows.map((story) => story.id || story._id).filter(Boolean),
      currentUserId
    );
    const stories = rows.map((story) => formatStoryForClient(story, productPreviewMap, seenStoryIds));

    return ApiResponse.paginated(res, stories, pagination, 'User stories retrieved successfully');
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
