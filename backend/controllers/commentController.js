/**
 * 💬 Comment Controller
 * Handles all comment operations - create, read, update, delete, reply
 */

const Comment = require('../../models/Comment');
const Post = require('../../models/Post');
const User = require('../../models/User');

exports.createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, parentCommentId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    if (!postId || !text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post ID and comment text are required',
        statusCode: 400
      });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        statusCode: 404
      });
    }

    // Get user details for denormalization
    const user = await User.findById(userId).select('username firstName lastName avatar isVerified');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    const authorDetails = {
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isVerified: user.isVerified
    };

    const comment = await Comment.createComment(postId, userId, text, authorDetails, parentCommentId || null);

    // Update post comment count
    const commentCount = await Comment.countDocuments({ postId, isDeleted: false });
    await Post.findByIdAndUpdate(postId, { comments: commentCount }, { new: true });

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: comment,
      statusCode: 201
    });
  } catch (error) {
    console.error('❌ Create Comment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required',
        statusCode: 400
      });
    }

    const result = await Comment.getCommentsByPost(postId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Comments retrieved successfully',
      data: result,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Comments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comments',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!commentId || !text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment ID and text are required',
        statusCode: 400
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
        statusCode: 404
      });
    }

    // Verify ownership
    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own comments',
        statusCode: 403
      });
    }

    const updatedComment = await Comment.updateComment(commentId, text);

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Update Comment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!commentId) {
      return res.status(400).json({
        success: false,
        message: 'Comment ID is required',
        statusCode: 400
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
        statusCode: 404
      });
    }

    // Verify ownership
    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments',
        statusCode: 403
      });
    }

    await Comment.deleteComment(commentId);

    // Update post comment count
    const commentCount = await Comment.countDocuments({ postId: comment.postId, isDeleted: false });
    await Post.findByIdAndUpdate(comment.postId, { comments: commentCount }, { new: true });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Delete Comment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.replyToComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!commentId || !text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment ID and reply text are required',
        statusCode: 400
      });
    }

    // Get parent comment
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found',
        statusCode: 404
      });
    }

    // Create reply comment
    const user = await User.findById(userId).select('username firstName lastName avatar isVerified');
    const authorDetails = {
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isVerified: user.isVerified
    };

    const reply = await Comment.createComment(parentComment.postId, userId, text, authorDetails, commentId);

    // Add reply to parent comment's replies array
    parentComment.replies.push(reply._id);
    await parentComment.save();

    res.status(201).json({
      success: true,
      message: 'Reply created successfully',
      data: reply,
      statusCode: 201
    });
  } catch (error) {
    console.error('❌ Reply to Comment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reply',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!commentId) {
      return res.status(400).json({
        success: false,
        message: 'Comment ID is required',
        statusCode: 400
      });
    }

    const result = await Comment.getReplies(commentId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Replies retrieved successfully',
      data: result,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Replies Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get replies',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({
        success: false,
        message: 'Comment ID is required',
        statusCode: 400
      });
    }

    const comment = await Comment.likeComment(commentId);

    res.status(200).json({
      success: true,
      message: 'Comment liked',
      data: { likes: comment.likes },
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Like Comment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like comment',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({
        success: false,
        message: 'Comment ID is required',
        statusCode: 400
      });
    }

    const comment = await Comment.unlikeComment(commentId);

    res.status(200).json({
      success: true,
      message: 'Comment unliked',
      data: { likes: comment.likes },
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Unlike Comment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlike comment',
      errors: [error.message],
      statusCode: 500
    });
  }
};
