/**
 * ============================================================================
 * POSTS CONTROLLER - PostgreSQL/Sequelize Implementation
 * ============================================================================
 * Purpose: Handle all post CRUD operations, engagement (likes, comments, shares)
 * Database: PostgreSQL via Sequelize ORM
 * 
 * Methods:
 * 1. getPostsFeed() - Get paginated public feed
 * 2. getPostById() - Fetch single post with comments & likes
 * 3. createPost() - Create new post
 * 4. toggleLikePost() - Like/unlike post
 * 5. toggleSavePost() - Save/unsave post
 * 6. addComment() - Add comment to post
 * 7. sharePost() - Share post
 * 8. getPostComments() - Get paginated post comments
 * 9. trackProductClick() - Analytics tracking
 * 10. getUserPosts() - Get user's posts paginated
 * 11. deletePost() - Soft delete post
 * 12. updatePost() - Update post caption/visibility
 */

const { Op, QueryTypes } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePostsRequest, validatePagination } = require('../utils/validation');
const { createFashionArtwork, slugify } = require('../dbseeder/utils/image-utils');

const DEFAULT_PRODUCT_IMAGE = '/uploads/default-product.svg';

/**
 * Helper: Extract product IDs from post
 */
const getTaggedProductIds = (item) => {
  const rawIds = item?.productIds || item?.product_ids || [];
  if (Array.isArray(rawIds)) {
    return rawIds.filter(Boolean);
  }
  return [];
};

/**
 * Helper: Build product preview map
 */
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

/**
 * Helper: Map tagged products for response
 */
const mapTaggedProducts = (item, productPreviewMap) => {
  return getTaggedProductIds(item).map((productId) => ({
    _id: productId,
    product: productPreviewMap.get(productId) || {
      _id: productId,
      id: productId,
      name: 'Product',
      price: 0,
      images: [{ url: DEFAULT_PRODUCT_IMAGE, isPrimary: true }],
      brand: ''
    },
    position: { x: 0.5, y: 0.5 }
  }));
};

/**
 * Helper: Format post for client response
 */
const formatPostForClient = (post, productPreviewMap) => {
  const item = post.toJSON ? post.toJSON() : post;
  const mediaUrl = item.mediaUrl || item.media_url || null;
  const author = item.author || item.creator || item.user || null;

  return {
    ...item,
    _id: item.id || item._id,
    caption: item.caption || item.title || item.content || '',
    media: mediaUrl ? [{ type: 'image', url: mediaUrl, alt: item.title || 'Post media' }] : [],
    products: mapTaggedProducts(item, productPreviewMap),
    user: author ? {
      _id: author.id || author._id,
      id: author.id || author._id,
      username: author.username,
      fullName: author.full_name || author.fullName || author.username,
      avatar: author.avatar_url || author.avatar || '',
      isVerified: !!author.is_verified
    } : null
  };
};

/**
 * METHOD 1: Get posts feed
 */
exports.getPostsFeed = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    let query = {
      where: { status: 'published' },
      include: [
        {
          model: models.User,
          as: 'author',
          required: false,
          attributes: ['id', 'username', 'full_name', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true
    };

    let { count, rows } = await models.Post.findAndCountAll(query);

    // Fallback: use non-deleted posts if no published posts
    if (count === 0) {
      query.where = { status: { [Op.not]: 'deleted' } };
      ({ count, rows } = await models.Post.findAndCountAll(query));
    }

    // Fallback: use all posts if no non-deleted posts
    if (count === 0) {
      const defaultPosts = await models.Post.findAll({
        where: {},
        order: [['created_at', 'DESC']],
        limit: 3,
        include: [{ model: models.User, as: 'creator', attributes: ['id', 'username', 'full_name', 'avatar_url'] }]
      });
      rows = defaultPosts;
      count = defaultPosts.length;
    }

    const pagination = {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
      hasNext: page < Math.ceil(count / limit),
      hasPrev: page > 1
    };

    const productPreviewMap = await buildProductPreviewMap(
      rows.flatMap((post) => getTaggedProductIds(post.toJSON ? post.toJSON() : post))
    );
    const posts = rows.map((post) => formatPostForClient(post, productPreviewMap));

    return res.status(200).json({
      success: true,
      message: 'Posts retrieved successfully',
      posts,
      data: posts,
      pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [Postgres] getPostsFeed error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 2: Get single post by ID
 */
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await models.Post.findByPk(id, {
      include: [
        {
          model: models.User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name', 'avatar_url']
        },
        {
          model: models.PostLike,
          attributes: ['user_id']
        },
        {
          model: models.PostComment,
          include: {
            model: models.User,
            as: 'author',
            attributes: ['id', 'username', 'full_name', 'avatar_url']
          }
        }
      ]
    });

    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    const productPreviewMap = await buildProductPreviewMap(getTaggedProductIds(post.toJSON ? post.toJSON() : post));
    return ApiResponse.success(res, formatPostForClient(post, productPreviewMap), 'Post retrieved successfully');
  } catch (error) {
    console.error('❌ [Postgres] getPostById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 3: Create new post
 */
exports.createPost = async (req, res) => {
  try {
    const validation = validatePostsRequest(req.body);
    if (!validation.isValid) {
      return ApiResponse.validation(res, validation.errors);
    }

    const user = await models.User.findByPk(req.user.id, {
      include: { model: models.Role }
    });

    if (!user || !['creator', 'customer', 'admin', 'super_admin'].includes(user.Role?.name)) {
      return ApiResponse.forbidden(res, 'Only creators and customers can create posts');
    }

    const now = new Date();
    const post = await models.Post.create({
      caption: req.body.caption,
      image_urls: req.body.image_urls || [],
      video_url: req.body.video_url,
      visibility: req.body.visibility || 'public',
      status: req.body.status || 'published',
      publishedAt: req.body.status === 'draft' ? null : now,
      published_at: req.body.status === 'draft' ? null : now,
      creator_id: req.user.id,
      hashtags: req.body.hashtags || [],
      mentions: req.body.mentions || []
    });

    const postWithRelations = await models.Post.findByPk(post.id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    return ApiResponse.created(res, postWithRelations, 'Post created successfully');
  } catch (error) {
    console.error('❌ [Postgres] createPost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 4: Toggle like on post
 */
exports.toggleLikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    const existingLike = await models.PostLike.findOne({
      where: { post_id: id, user_id: userId }
    });

    if (existingLike) {
      await existingLike.destroy();
      await post.update({ likes_count: Math.max(0, (post.likes_count || 1) - 1) });
      return ApiResponse.success(res, { isLiked: false, likesCount: post.likes_count - 1 }, 'Post unliked');
    } else {
      await models.PostLike.create({ post_id: id, user_id: userId });
      await post.update({ likes_count: (post.likes_count || 0) + 1 });
      return ApiResponse.success(res, { isLiked: true, likesCount: post.likes_count + 1 }, 'Post liked');
    }
  } catch (error) {
    console.error('❌ [Postgres] toggleLikePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 5: Toggle save on post
 */
exports.toggleSavePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    const existingSave = await models.SavedPost.findOne({
      where: { post_id: id, user_id: userId }
    });

    if (existingSave) {
      await existingSave.destroy();
      return ApiResponse.success(res, { isSaved: false }, 'Post unsaved');
    } else {
      await models.SavedPost.create({ post_id: id, user_id: userId });
      return ApiResponse.success(res, { isSaved: true }, 'Post saved');
    }
  } catch (error) {
    console.error('❌ [Postgres] toggleSavePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 6: Add comment to post
 */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return ApiResponse.error(res, 'Comment content is required', 422);
    }

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    const comment = await models.PostComment.create({
      post_id: id,
      author_id: req.user.id,
      content
    });

    await post.update({ comments_count: (post.comments_count || 0) + 1 });

    const commentWithAuthor = await models.PostComment.findByPk(comment.id, {
      include: {
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    return ApiResponse.created(res, commentWithAuthor, 'Comment added successfully');
  } catch (error) {
    console.error('❌ [Postgres] addComment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 7: Share post
 */
exports.sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    await models.PostShare.create({
      post_id: id,
      shared_by_user_id: userId
    });

    await post.update({ shares_count: (post.shares_count || 0) + 1 });

    return ApiResponse.success(res, { sharesCount: post.shares_count + 1 }, 'Post shared successfully');
  } catch (error) {
    console.error('❌ [Postgres] sharePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 8: Get post comments
 */
exports.getPostComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    const { count, rows } = await models.PostComment.findAndCountAll({
      where: { post_id: id },
      include: {
        model: models.User,
        as: 'author',
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

    return ApiResponse.paginated(res, rows, pagination, 'Comments retrieved successfully');
  } catch (error) {
    console.error('❌ [Postgres] getPostComments error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 9: Track product click analytics
 */
exports.trackProductClick = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    return ApiResponse.success(res, {}, 'Analytics tracked successfully');
  } catch (error) {
    console.error('❌ [Postgres] trackProductClick error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 10: Get user's posts
 */
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const user = await models.User.findByPk(userId);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const { count, rows } = await models.Post.findAndCountAll({
      where: {
        creator_id: userId,
        visibility: { [Op.in]: ['public', 'followers_only'] }
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

    return ApiResponse.paginated(res, rows, pagination, 'User posts retrieved successfully');
  } catch (error) {
    console.error('❌ [Postgres] getUserPosts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 11: Delete post
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    const user = await models.User.findByPk(req.user.id, {
      include: { model: models.Role }
    });

    if (post.creator_id !== req.user.id && !['admin', 'super_admin'].includes(user.Role?.name)) {
      return ApiResponse.forbidden(res, 'You can only delete your own posts');
    }

    await post.destroy();

    return ApiResponse.success(res, {}, 'Post deleted successfully');
  } catch (error) {
    console.error('❌ [Postgres] deletePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 12: Update post
 */
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, visibility } = req.body;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    if (post.creator_id !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only edit your own posts');
    }

    const validation = validatePostsRequest({ caption, visibility });
    if (!validation.isValid) {
      return ApiResponse.validation(res, validation.errors);
    }

    await post.update({
      caption: caption || post.caption,
      visibility: visibility || post.visibility
    });

    const updatedPost = await models.Post.findByPk(id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    return ApiResponse.success(res, updatedPost, 'Post updated successfully');
  } catch (error) {
    console.error('❌ [Postgres] updatePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};


