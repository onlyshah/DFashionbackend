/**
 * 👍 Post Like Controller
 * Handles all post like operations - add, remove, get stats
 */

const PostLike = require('../../models/PostLike');
const Post = require('../../models/Post');

exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required',
        statusCode: 400
      });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
        statusCode: 404
      });
    }

    // Check if user already liked this post
    const existingLike = await PostLike.findOne({ postId, userId });
    if (existingLike) {
      return res.status(409).json({
        success: false,
        message: 'You have already liked this post',
        statusCode: 409
      });
    }

    // Add like
    const like = await PostLike.addLike(postId, userId);
    
    // Update post like count (denormalization for performance)
    const likeCount = await PostLike.getLikeCount(postId);
    await Post.findByIdAndUpdate(postId, { likes: likeCount }, { new: true });

    res.status(201).json({
      success: true,
      message: 'Post liked successfully',
      data: {
        likeId: like._id,
        postId,
        userId,
        likeCount
      },
      statusCode: 201
    });
  } catch (error) {
    console.error('❌ Like Post Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like post',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required',
        statusCode: 400
      });
    }

    // Remove like
    await PostLike.removeLike(postId, userId);

    // Update post like count
    const likeCount = await PostLike.getLikeCount(postId);
    await Post.findByIdAndUpdate(postId, { likes: likeCount }, { new: true });

    res.status(200).json({
      success: true,
      message: 'Post unliked successfully',
      data: { likeCount },
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Unlike Post Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlike post',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getLikeCount = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required',
        statusCode: 400
      });
    }

    const likeCount = await PostLike.getLikeCount(postId);

    res.status(200).json({
      success: true,
      message: 'Like count retrieved successfully',
      data: { postId, likeCount },
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Like Count Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get like count',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.checkUserLiked = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required',
        statusCode: 400
      });
    }

    const hasLiked = await PostLike.userHasLiked(postId, userId);

    res.status(200).json({
      success: true,
      message: 'Like status retrieved',
      data: { postId, userId, hasLiked },
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Check User Liked Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check like status',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getPostLikers = async (req, res) => {
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

    const result = await PostLike.getLikersByPost(postId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Post likers retrieved successfully',
      data: result,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Post Likers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get post likers',
      errors: [error.message],
      statusCode: 500
    });
  }
};
