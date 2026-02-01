/**
 * ============================================================================
 * POSTS CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Handle all post CRUD operations, engagement (likes, comments, shares)
 * Database: PostgreSQL via Sequelize ORM
 * Authentication: JWT + RBAC middleware
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePostsRequest, validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

/**
 * Get all posts (feed) - Public feed
 */
exports.getPostsFeed = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await models.Post.findAndCountAll({
      where: {
        visibility: 'public'
      },
      include: [
        {
          model: models.User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name', 'avatar_url']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const pagination = {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
      hasNext: page < Math.ceil(count / limit),
      hasPrev: page > 1
    };

    return ApiResponse.paginated(res, rows, pagination, 'Posts retrieved successfully');
  } catch (error) {
    console.error('❌ getPostsFeed error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get single post by ID
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

    return ApiResponse.success(res, post, 'Post retrieved successfully');
  } catch (error) {
    console.error('❌ getPostById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Create new post
 */
exports.createPost = async (req, res) => {
  try {
    // Validate request
    const validation = validatePostsRequest(req.body);
    if (!validation.isValid) {
      return ApiResponse.validation(res, validation.errors);
    }

    // Only creators and customers can post
    const user = await models.User.findByPk(req.user.id, {
      include: { model: models.Role }
    });

    if (!user || !['creator', 'customer', 'admin', 'super_admin'].includes(user.Role?.name)) {
      return ApiResponse.forbidden(res, 'Only creators and customers can create posts');
    }

    // Create post
    const post = await models.Post.create({
      caption: req.body.caption,
      image_urls: req.body.image_urls || [],
      video_url: req.body.video_url,
      visibility: req.body.visibility || 'public',
      creator_id: req.user.id,
      hashtags: req.body.hashtags || [],
      mentions: req.body.mentions || []
    });

    // Reload with relations
    const postWithRelations = await models.Post.findByPk(post.id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    return ApiResponse.created(res, postWithRelations, 'Post created successfully');
  } catch (error) {
    console.error('❌ createPost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Like/unlike post
 */
exports.toggleLikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    // Check if user already liked
    const existingLike = await models.PostLike.findOne({
      where: { post_id: id, user_id: userId }
    });

    if (existingLike) {
      // Unlike
      await existingLike.destroy();
      await post.update({ likes_count: Math.max(0, (post.likes_count || 1) - 1) });
      return ApiResponse.success(res, { isLiked: false, likesCount: post.likes_count - 1 }, 'Post unliked');
    } else {
      // Like
      await models.PostLike.create({ post_id: id, user_id: userId });
      await post.update({ likes_count: (post.likes_count || 0) + 1 });
      return ApiResponse.success(res, { isLiked: true, likesCount: post.likes_count + 1 }, 'Post liked');
    }
  } catch (error) {
    console.error('❌ toggleLikePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Save/unsave post
 */
exports.toggleSavePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    // Check if user already saved
    const existingSave = await models.SavedPost.findOne({
      where: { post_id: id, user_id: userId }
    });

    if (existingSave) {
      // Unsave
      await existingSave.destroy();
      return ApiResponse.success(res, { isSaved: false }, 'Post unsaved');
    } else {
      // Save
      await models.SavedPost.create({ post_id: id, user_id: userId });
      return ApiResponse.success(res, { isSaved: true }, 'Post saved');
    }
  } catch (error) {
    console.error('❌ toggleSavePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Add comment to post
 */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Validate
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return ApiResponse.error(res, 'Comment content is required', 422);
    }

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    // Create comment
    const comment = await models.PostComment.create({
      post_id: id,
      author_id: req.user.id,
      content
    });

    // Update post comment count
    await post.update({ comments_count: (post.comments_count || 0) + 1 });

    // Reload comment with author
    const commentWithAuthor = await models.PostComment.findByPk(comment.id, {
      include: {
        model: models.User,
        as: 'author',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    return ApiResponse.created(res, commentWithAuthor, 'Comment added successfully');
  } catch (error) {
    console.error('❌ addComment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Share post
 */
exports.sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    // Create share record
    await models.PostShare.create({
      post_id: id,
      shared_by_user_id: userId
    });

    // Update post share count
    await post.update({ shares_count: (post.shares_count || 0) + 1 });

    return ApiResponse.success(res, { sharesCount: post.shares_count + 1 }, 'Post shared successfully');
  } catch (error) {
    console.error('❌ sharePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get post comments
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
    console.error('❌ getPostComments error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Track product click analytics
 */
exports.trackProductClick = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, action } = req.body;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    // Just acknowledge - can be used for analytics
    return ApiResponse.success(res, {}, 'Analytics tracked successfully');
  } catch (error) {
    console.error('❌ trackProductClick error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get posts by user
 */
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    // Check if user exists
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
    console.error('❌ getUserPosts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete post (own or admin)
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    // Check ownership or admin role
    const user = await models.User.findByPk(req.user.id, {
      include: { model: models.Role }
    });

    if (post.creator_id !== req.user.id && !['admin', 'super_admin'].includes(user.Role?.name)) {
      return ApiResponse.forbidden(res, 'You can only delete your own posts');
    }

    // Soft delete
    await post.destroy();

    return ApiResponse.success(res, {}, 'Post deleted successfully');
  } catch (error) {
    console.error('❌ deletePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update post (own only)
 */
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, visibility } = req.body;

    const post = await models.Post.findByPk(id);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    // Check ownership
    if (post.creator_id !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only edit your own posts');
    }

    // Validate
    const validation = validatePostsRequest({ caption, visibility });
    if (!validation.isValid) {
      return ApiResponse.validation(res, validation.errors);
    }

    // Update
    await post.update({
      caption: caption || post.caption,
      visibility: visibility || post.visibility
    });

    // Reload with relations
    const updatedPost = await models.Post.findByPk(id, {
      include: {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'username', 'full_name', 'avatar_url']
      }
    });

    return ApiResponse.success(res, updatedPost, 'Post updated successfully');
  } catch (error) {
    console.error('❌ updatePost error:', error);
    return ApiResponse.serverError(res, error);
  }
};
