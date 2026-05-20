/**
 * Comments Controller - Complete MongoDB Implementation (Phase 4)
 * 5 methods for posts/reels comments management
 */

const Comment = require('../models/Comment');
const Post = require('../models/Post');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Create a comment on a post
 */
exports.createComment = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { postId } = req.params;
    const { content, images, parentCommentId } = req.body;

    if (!postId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid post ID', 400, 'INVALID_ID');
    }

    if (!content || content.trim().length === 0) {
      throw new ApiError('Comment content is required', 400, 'VALIDATION_ERROR');
    }

    if (content.length > 500) {
      throw new ApiError('Comment cannot exceed 500 characters', 400, 'VALIDATION_ERROR');
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
    }

    // If reply to another comment, verify parent comment exists
    let parentComment = null;
    if (parentCommentId) {
      if (!parentCommentId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new ApiError('Invalid parent comment ID', 400, 'INVALID_ID');
      }
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        throw new ApiError('Parent comment not found', 404, 'COMMENT_NOT_FOUND');
      }
    }

    const comment = await Comment.create({
      post: postId,
      user: req.user._id,
      content,
      images: images || [],
      parentComment: parentCommentId || null
    });

    const populatedComment = await comment.populate('user', 'name email avatar').populate('mentions', 'name avatar');

    // Increment comment count on post
    await Post.findByIdAndUpdate(postId, { $inc: { 'engagement.comments': 1 } });

    // If reply, increment replies count on parent comment
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, { $inc: { 'engagement.replies': 1 } });
    }

    return ApiResponse.created(res, populatedComment, 'Comment created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update comment (Owner only)
 */
exports.updateComment = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { commentId } = req.params;
    const { content, images } = req.body;

    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid comment ID', 400, 'INVALID_ID');
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw new ApiError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      throw new ApiError('Not authorized to update this comment', 403, 'FORBIDDEN');
    }

    if (content) {
      if (content.length > 500) {
        throw new ApiError('Comment cannot exceed 500 characters', 400, 'VALIDATION_ERROR');
      }
      comment.content = content;
      comment.isEdited = true;
    }

    if (images !== undefined) {
      comment.images = images;
    }

    await comment.save();

    const updatedComment = await Comment.findById(commentId)
      .populate('user', 'name email avatar')
      .populate('mentions', 'name avatar');

    return ApiResponse.success(res, updatedComment, 'Comment updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Delete comment (Owner or Admin)
 */
exports.deleteComment = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { commentId } = req.params;

    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid comment ID', 400, 'INVALID_ID');
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw new ApiError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    }

    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new ApiError('Not authorized to delete this comment', 403, 'FORBIDDEN');
    }

    // Decrement comment count on post
    await Post.findByIdAndUpdate(comment.post, { $inc: { 'engagement.comments': -1 } });

    // If this is a reply, decrement replies count on parent
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, { $inc: { 'engagement.replies': -1 } });
    }

    // Delete all replies to this comment if it's a parent comment
    const replyCount = await Comment.countDocuments({ parentComment: commentId });
    if (replyCount > 0) {
      await Comment.deleteMany({ parentComment: commentId });
      // Adjust post comment count
      await Post.findByIdAndUpdate(comment.post, { $inc: { 'engagement.comments': -replyCount } });
    }

    await Comment.findByIdAndDelete(commentId);

    return ApiResponse.success(res, { id: commentId }, 'Comment deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get all comments on a post
 */
exports.getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    if (!postId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid post ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    // Get only top-level comments (not replies)
    const [comments, total] = await Promise.all([
      Comment.find({ post: postId, parentComment: null })
        .populate('user', 'name email avatar')
        .populate('mentions', 'name avatar')
        .populate({
          path: 'parentComment',
          populate: { path: 'user', select: 'name email avatar' }
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Comment.countDocuments({ post: postId, parentComment: null })
    ]);

    return ApiResponse.paginated(res, comments, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Comments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get replies to a comment
 */
exports.getCommentReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid comment ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      throw new ApiError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    }

    const [replies, total] = await Promise.all([
      Comment.find({ parentComment: commentId })
        .populate('user', 'name email avatar')
        .populate('mentions', 'name avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Comment.countDocuments({ parentComment: commentId })
    ]);

    return ApiResponse.paginated(res, replies, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Comment replies retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
