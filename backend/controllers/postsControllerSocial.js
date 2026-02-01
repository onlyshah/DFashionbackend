/**
 * ============================================================================
 * SOCIAL - POSTS CONTROLLER
 * ============================================================================
 * Purpose: Handle social media post operations (create, read, update, delete)
 * - Create posts with media
 * - Like/unlike posts
 * - Comment on posts
 * - Share posts
 * - Feed generation
 */

const { v4: uuidv4 } = require('uuid');

class PostsController {
  constructor(models) {
    this.Post = models.Post;
    this.PostLike = models.PostLike;
    this.PostComment = models.PostComment;
    this.CommentLike = models.CommentLike;
    this.PostShare = models.PostShare;
    this.User = models.User;
    this.Follow = models.Follow;
  }

  /**
   * CREATE POST
   * POST /api/social/posts
   */
  async createPost(req, res) {
    try {
      const userId = req.user.userId;
      const { caption, imageUrls, videoUrl, visibility = 'public', hashtags = [], mentions = [] } = req.body;

      // Validation
      if (!caption && !imageUrls && !videoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Post must have content (caption, images, or video)',
          code: 'NO_CONTENT'
        });
      }

      // Create post
      const post = await this.Post.create({
        id: uuidv4(),
        creator_id: userId,
        caption,
        image_urls: imageUrls || [],
        video_url: videoUrl,
        visibility,
        hashtags,
        mentions,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: {
          id: post.id,
          caption: post.caption,
          createdAt: post.created_at
        }
      });
    } catch (error) {
      console.error('CreatePost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create post',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET POST
   * GET /api/social/posts/:postId
   */
  async getPost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.userId;

      const post = await this.Post.findByPk(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
          code: 'POST_NOT_FOUND'
        });
      }

      // Check visibility
      if (post.visibility === 'private' && post.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'This post is private',
          code: 'POST_PRIVATE'
        });
      }

      // Get post details
      const creator = await this.User.findByPk(post.creator_id);
      
      let isLikedByUser = false;
      if (userId) {
        const like = await this.PostLike.findOne({
          where: { post_id: postId, user_id: userId }
        });
        isLikedByUser = !!like;
      }

      res.json({
        success: true,
        data: {
          id: post.id,
          creator: {
            id: creator.id,
            username: creator.username,
            avatarUrl: creator.avatar_url
          },
          caption: post.caption,
          imageUrls: post.image_urls,
          videoUrl: post.video_url,
          hashtags: post.hashtags,
          engagement: {
            likes: post.likes_count,
            comments: post.comments_count,
            shares: post.shares_count,
            isLikedByUser
          },
          visibility: post.visibility,
          createdAt: post.created_at,
          updatedAt: post.updated_at
        }
      });
    } catch (error) {
      console.error('GetPost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch post'
      });
    }
  }

  /**
   * UPDATE POST
   * PUT /api/social/posts/:postId
   */
  async updatePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.userId;
      const { caption, visibility } = req.body;

      const post = await this.Post.findByPk(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
          code: 'POST_NOT_FOUND'
        });
      }

      // Check ownership
      if (post.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own posts',
          code: 'NOT_POST_OWNER'
        });
      }

      // Update
      if (caption !== undefined) post.caption = caption;
      if (visibility !== undefined) post.visibility = visibility;
      post.updated_at = new Date();

      await post.save();

      res.json({
        success: true,
        message: 'Post updated successfully',
        data: { id: post.id }
      });
    } catch (error) {
      console.error('UpdatePost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update post'
      });
    }
  }

  /**
   * DELETE POST
   * DELETE /api/social/posts/:postId
   */
  async deletePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.userId;

      const post = await this.Post.findByPk(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
          code: 'POST_NOT_FOUND'
        });
      }

      // Check ownership
      if (post.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own posts',
          code: 'NOT_POST_OWNER'
        });
      }

      // Soft delete
      post.deleted_at = new Date();
      await post.save();

      res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('DeletePost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete post'
      });
    }
  }

  /**
   * GET FEED
   * GET /api/social/posts/feed
   */
  async getFeed(req, res) {
    try {
      const userId = req.user?.userId;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let where = {
        deleted_at: null,
        visibility: ['public', 'followers_only']
      };

      // If user is logged in, show their own posts and followers' posts
      if (userId) {
        const followingUsers = await this.Follow.findAll({
          attributes: ['following_id'],
          where: { follower_id: userId }
        });

        const followingIds = followingUsers.map(f => f.following_id);
        where.$or = [
          { creator_id: userId },  // Own posts
          { creator_id: { $in: followingIds } }  // Following posts
        ];
      } else {
        // Public posts only for guests
        where.visibility = 'public';
      }

      const { count, rows } = await this.Post.findAndCountAll({
        where,
        include: [
          { model: this.User, attributes: ['id', 'username', 'avatar_url'] }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      res.json({
        success: true,
        data: rows.map(post => ({
          id: post.id,
          creator: post.User,
          caption: post.caption,
          imageUrls: post.image_urls,
          engagement: {
            likes: post.likes_count,
            comments: post.comments_count,
            shares: post.shares_count
          },
          createdAt: post.created_at
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('GetFeed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch feed'
      });
    }
  }

  /**
   * LIKE POST
   * POST /api/social/posts/:postId/like
   */
  async likePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.userId;

      const post = await this.Post.findByPk(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
          code: 'POST_NOT_FOUND'
        });
      }

      // Check if already liked
      const existingLike = await this.PostLike.findOne({
        where: { post_id: postId, user_id: userId }
      });

      if (existingLike) {
        return res.status(400).json({
          success: false,
          message: 'You already liked this post',
          code: 'ALREADY_LIKED'
        });
      }

      // Create like
      await this.PostLike.create({
        id: uuidv4(),
        post_id: postId,
        user_id: userId,
        created_at: new Date()
      });

      // Increment like count
      post.likes_count += 1;
      await post.save();

      res.json({
        success: true,
        message: 'Post liked successfully',
        data: { likesCount: post.likes_count }
      });
    } catch (error) {
      console.error('LikePost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to like post'
      });
    }
  }

  /**
   * UNLIKE POST
   * DELETE /api/social/posts/:postId/like
   */
  async unlikePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.userId;

      const like = await this.PostLike.findOne({
        where: { post_id: postId, user_id: userId }
      });

      if (!like) {
        return res.status(404).json({
          success: false,
          message: 'You have not liked this post',
          code: 'NOT_LIKED'
        });
      }

      // Delete like
      await like.destroy();

      // Decrement like count
      const post = await this.Post.findByPk(postId);
      if (post) {
        post.likes_count = Math.max(0, post.likes_count - 1);
        await post.save();
      }

      res.json({
        success: true,
        message: 'Like removed',
        data: { likesCount: post?.likes_count || 0 }
      });
    } catch (error) {
      console.error('UnlikePost error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unlike post'
      });
    }
  }

  /**
   * GET POST LIKES
   * GET /api/social/posts/:postId/likes
   */
  async getPostLikes(req, res) {
    try {
      const { postId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await this.PostLike.findAndCountAll({
        where: { post_id: postId },
        include: [{
          model: this.User,
          attributes: ['id', 'username', 'avatar_url']
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      res.json({
        success: true,
        data: rows.map(like => ({
          user: like.User,
          likedAt: like.created_at
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('GetPostLikes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch likes'
      });
    }
  }
}

module.exports = PostsController;
