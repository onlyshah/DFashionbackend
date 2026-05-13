/**
 * 💬 Comment Controller - PostgreSQL/Sequelize Version
 * Handles all comment operations - create, read, update, delete, reply
 * Methods: 8
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, parentCommentId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    if (!postId || !text || text.trim().length === 0) {
      return ApiResponse.error(res, 'Post ID and comment text are required', 422);
    }

    const post = await models.Post.findByPk(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    const user = await models.User.findByPk(userId, { attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'isVerified'] });
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const comment = await models.Comment.create({
      postId,
      userId,
      text,
      parentCommentId: parentCommentId || null,
      authorDetails: { username: user.username, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar, isVerified: user.isVerified }
    });

    const commentCount = await models.Comment.count({ where: { postId, isDeleted: false } });
    await post.update({ comments: commentCount });

    return ApiResponse.created(res, comment, 'Comment created successfully');
  } catch (error) {
    console.error('❌ createComment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!postId) {
      return ApiResponse.error(res, 'Post ID is required', 422);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: comments } = await models.Comment.findAndCountAll({
      where: { postId, isDeleted: false, parentCommentId: null },
      include: [{ model: models.Comment, as: 'replies', where: { isDeleted: false }, required: false }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return ApiResponse.paginated(res, comments, page, limit, count, 'Comments retrieved successfully');
  } catch (error) {
    console.error('❌ getPostComments error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user?.id;

    if (!commentId || !text || text.trim().length === 0) {
      return ApiResponse.error(res, 'Comment ID and text are required', 422);
    }

    const comment = await models.Comment.findByPk(commentId);
    if (!comment) {
      return ApiResponse.notFound(res, 'Comment');
    }

    if (comment.userId !== userId) {
      return ApiResponse.forbidden(res, 'You can only edit your own comments');
    }

    await comment.update({ text });

    return ApiResponse.success(res, comment, 'Comment updated successfully');
  } catch (error) {
    console.error('❌ updateComment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!commentId) {
      return ApiResponse.error(res, 'Comment ID is required', 422);
    }

    const comment = await models.Comment.findByPk(commentId);
    if (!comment) {
      return ApiResponse.notFound(res, 'Comment');
    }

    if (comment.userId !== userId) {
      return ApiResponse.forbidden(res, 'You can only delete your own comments');
    }

    await comment.update({ isDeleted: true });

    const commentCount = await models.Comment.count({ where: { postId: comment.postId, isDeleted: false } });
    await models.Post.update({ comments: commentCount }, { where: { id: comment.postId } });

    return ApiResponse.success(res, {}, 'Comment deleted successfully');
  } catch (error) {
    console.error('❌ deleteComment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.replyToComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user?.id;

    if (!commentId || !text || text.trim().length === 0) {
      return ApiResponse.error(res, 'Comment ID and reply text are required', 422);
    }

    const parentComment = await models.Comment.findByPk(commentId);
    if (!parentComment) {
      return ApiResponse.notFound(res, 'Parent comment');
    }

    const user = await models.User.findByPk(userId, { attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'isVerified'] });
    const reply = await models.Comment.create({
      postId: parentComment.postId,
      userId,
      text,
      parentCommentId: commentId,
      authorDetails: { username: user.username, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar, isVerified: user.isVerified }
    });

    return ApiResponse.created(res, reply, 'Reply created successfully');
  } catch (error) {
    console.error('❌ replyToComment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!commentId) {
      return ApiResponse.error(res, 'Comment ID is required', 422);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: replies } = await models.Comment.findAndCountAll({
      where: { parentCommentId: commentId, isDeleted: false },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return ApiResponse.paginated(res, replies, page, limit, count, 'Replies retrieved successfully');
  } catch (error) {
    console.error('❌ getReplies error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!commentId) {
      return ApiResponse.error(res, 'Comment ID is required', 422);
    }

    const comment = await models.Comment.findByPk(commentId);
    if (!comment) {
      return ApiResponse.notFound(res, 'Comment');
    }

    const existingLike = await models.CommentLike.findOne({ where: { commentId, userId } });
    if (existingLike) {
      await existingLike.destroy();
      return ApiResponse.success(res, { liked: false }, 'Comment unliked successfully');
    }

    await models.CommentLike.create({ commentId, userId });
    return ApiResponse.success(res, { liked: true }, 'Comment liked successfully');
  } catch (error) {
    console.error('❌ likeComment error:', error);
    return ApiResponse.serverError(res, error);
  }
};


