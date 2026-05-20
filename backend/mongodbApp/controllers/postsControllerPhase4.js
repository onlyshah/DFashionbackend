/**
 * Posts Controller - Complete MongoDB Implementation (Phase 4)
 * 9 methods for complete social posts management
 */

const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Create a new post (Authenticated users)
 */
exports.createPost = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { content, images, videos, hashtags, mentions, products, visibility } = req.body;

    if (!content || content.trim().length === 0) {
      throw new ApiError('Content is required', 400, 'VALIDATION_ERROR');
    }

    if (content.length > 2000) {
      throw new ApiError('Content cannot exceed 2000 characters', 400, 'VALIDATION_ERROR');
    }

    const post = await Post.create({
      user: req.user._id,
      content,
      images: images || [],
      videos: videos || [],
      hashtags: hashtags || [],
      mentions: mentions || [],
      products: products || [],
      visibility: visibility || 'public',
      isPublished: true
    });

    const populatedPost = await post.populate('user', 'name email avatar').populate('products', 'name price images');

    return ApiResponse.created(res, populatedPost, 'Post created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get all posts with pagination and filtering
 */
exports.getPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, userId, visibility = 'public', sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = { isPublished: true };

    if (visibility) filter.visibility = visibility;
    if (userId) filter.user = userId;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('user', 'name email avatar')
        .populate('products', 'name price images')
        .populate('mentions', 'name avatar')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Post.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, posts, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Posts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get single post by ID
 */
exports.getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid post ID', 400, 'INVALID_ID');
    }

    const post = await Post.findById(id)
      .populate('user', 'name email avatar')
      .populate('products', 'name price images')
      .populate('mentions', 'name avatar');

    if (!post || !post.isPublished) {
      throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
    }

    // Increment view count
    await Post.findByIdAndUpdate(id, { $inc: { 'engagement.views': 1 } });

    return ApiResponse.success(res, post, 'Post retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update post (Owner only)
 */
exports.updatePost = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { content, images, videos, hashtags, visibility } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid post ID', 400, 'INVALID_ID');
    }

    const post = await Post.findById(id);

    if (!post) {
      throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
    }

    if (post.user.toString() !== req.user._id.toString()) {
      throw new ApiError('Not authorized to update this post', 403, 'FORBIDDEN');
    }

    if (content !== undefined) {
      if (content.length > 2000) {
        throw new ApiError('Content cannot exceed 2000 characters', 400, 'VALIDATION_ERROR');
      }
      post.content = content;
    }

    if (images !== undefined) post.images = images;
    if (videos !== undefined) post.videos = videos;
    if (hashtags !== undefined) post.hashtags = hashtags;
    if (visibility !== undefined) post.visibility = visibility;

    await post.save();

    const updatedPost = await Post.findById(id)
      .populate('user', 'name email avatar')
      .populate('products', 'name price images');

    return ApiResponse.success(res, updatedPost, 'Post updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete post (Owner only)
 */
exports.deletePost = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid post ID', 400, 'INVALID_ID');
    }

    const post = await Post.findById(id);

    if (!post) {
      throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
    }

    if (post.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new ApiError('Not authorized to delete this post', 403, 'FORBIDDEN');
    }

    await Post.findByIdAndDelete(id);

    // Delete all comments on this post
    await Comment.deleteMany({ post: id });

    return ApiResponse.success(res, { id }, 'Post deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Like a post
 */
exports.likePost = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid post ID', 400, 'INVALID_ID');
    }

    const post = await Post.findById(id);

    if (!post) {
      throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
    }

    const userId = req.user._id;
    const alreadyLiked = post.likedBy.includes(userId);

    if (alreadyLiked) {
      throw new ApiError('You already liked this post', 400, 'ALREADY_LIKED');
    }

    post.likedBy.push(userId);
    post.engagement.likes = post.likedBy.length;

    await post.save();

    return ApiResponse.success(res, post, 'Post liked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Unlike a post
 */
exports.unlikePost = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid post ID', 400, 'INVALID_ID');
    }

    const post = await Post.findById(id);

    if (!post) {
      throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
    }

    const userId = req.user._id;
    const likeIndex = post.likedBy.indexOf(userId);

    if (likeIndex === -1) {
      throw new ApiError('You have not liked this post', 400, 'NOT_LIKED');
    }

    post.likedBy.splice(likeIndex, 1);
    post.engagement.likes = post.likedBy.length;

    await post.save();

    return ApiResponse.success(res, post, 'Post unliked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get feed for logged-in user (posts from followed users)
 */
exports.getFeedPosts = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    // Get users that current user follows
    const Follow = require('../models/Follow');
    const following = await Follow.find({ follower: req.user._id }).select('following').lean();
    const followingIds = following.map(f => f.following);
    followingIds.push(req.user._id); // Include own posts

    const [posts, total] = await Promise.all([
      Post.find({ user: { $in: followingIds }, isPublished: true })
        .populate('user', 'name email avatar')
        .populate('products', 'name price images')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Post.countDocuments({ user: { $in: followingIds }, isPublished: true })
    ]);

    return ApiResponse.paginated(res, posts, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Feed posts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Get user's own posts
 */
exports.getMyPosts = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      Post.find({ user: req.user._id })
        .populate('products', 'name price images')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Post.countDocuments({ user: req.user._id })
    ]);

    return ApiResponse.paginated(res, posts, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'User posts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
