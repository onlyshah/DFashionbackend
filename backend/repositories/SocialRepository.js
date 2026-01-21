/**
 * SocialRepository - Database-Agnostic Social Content Data Access Layer
 * Supports both PostgreSQL (Sequelize) and MongoDB (Mongoose)
 * Provides transparent database switching with graceful fallback
 */

const { Op } = require('sequelize');

class SocialRepository {
  constructor(models) {
    this.models = models;
    this.isSequelize = models._raw && models._raw.Post ? true : false;
    this.isMongoDB = models.Post && models.Post.findById ? true : false;
  }

  /**
   * Get all social content (posts, reels, stories)
   * @param {Object} filters - Filter object {type, approved, search, dateFrom, dateTo}
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Records per page
   * @returns {Promise<Object>} Social content with pagination
   */
  async getSocialContent(filters = {}, page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      const where = this._buildWhereClause(filters);

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Post = this.models._raw.Post;
        if (!Post) {
          return {
            success: false,
            data: { content: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
            message: 'Post model not available'
          };
        }

        const { count, rows } = await Post.findAndCountAll({
          where,
          include: [
            {
              model: this.models._raw.User,
              as: 'author',
              attributes: ['id', 'username', 'fullName', 'avatar'],
              required: false
            },
            {
              model: this.models._raw.Product,
              as: 'products',
              attributes: ['id', 'name', 'image'],
              through: { attributes: [] },
              required: false
            }
          ],
          order: [['createdAt', 'DESC']],
          limit,
          offset: skip,
          subQuery: false
        });

        return {
          success: true,
          data: {
            content: rows || [],
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(count / limit),
              totalRecords: count,
              hasNextPage: page < Math.ceil(count / limit),
              hasPrevPage: page > 1
            }
          }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Post = this.models.Post;
        const mongoFilter = this._buildMongoFilter(filters);

        const content = await Post
          .find(mongoFilter)
          .populate('author', 'username fullName avatar email')
          .populate('products', 'name image')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await Post.countDocuments(mongoFilter);

        return {
          success: true,
          data: {
            content: content || [],
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              totalRecords: total,
              hasNextPage: page < Math.ceil(total / limit),
              hasPrevPage: page > 1
            }
          }
        };
      }

      // Fallback
      return {
        success: false,
        data: { content: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[SocialRepository] getSocialContent error:', error);
      return {
        success: false,
        data: { content: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
        message: 'Failed to fetch social content',
        error: error.message
      };
    }
  }

  /**
   * Get social content statistics
   * @param {Object} filters - Filter object {period, contentType}
   * @returns {Promise<Object>} Statistics data
   */
  async getSocialStats(filters = {}) {
    try {
      const where = this._buildWhereClause(filters);

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Post = this.models._raw.Post;
        if (!Post) {
          return {
            success: false,
            data: { stats: {} },
            message: 'Post model not available'
          };
        }

        const posts = await Post.findAll({
          where,
          attributes: ['id', 'approved', 'type', 'likes', 'comments'],
          raw: true
        });

        const stats = this._calculateStats(posts);
        return {
          success: true,
          data: { stats }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Post = this.models.Post;
        const mongoFilter = this._buildMongoFilter(filters);

        const posts = await Post.find(mongoFilter).lean();
        const stats = this._calculateStats(posts);

        return {
          success: true,
          data: { stats }
        };
      }

      // Fallback
      return {
        success: false,
        data: { stats: {} },
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[SocialRepository] getSocialStats error:', error);
      return {
        success: false,
        data: { stats: {} },
        message: 'Failed to calculate statistics',
        error: error.message
      };
    }
  }

  /**
   * Get creator engagement metrics
   * @param {string} creatorId - Creator/User ID
   * @param {Object} filters - Filter object {period}
   * @returns {Promise<Object>} Creator metrics
   */
  async getCreatorMetrics(creatorId, filters = {}) {
    try {
      const dateFilter = this._getDateFilter(filters.period);

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Post = this.models._raw.Post;
        const User = this.models._raw.User;

        if (!Post || !User) {
          return {
            success: false,
            data: null,
            message: 'Models not available'
          };
        }

        // Get creator info
        const creator = await User.findByPk(creatorId, {
          attributes: ['id', 'username', 'fullName', 'followers']
        });

        if (!creator) {
          return {
            success: false,
            data: null,
            message: 'Creator not found'
          };
        }

        // Get creator's posts
        const where = {
          authorId: creatorId,
          ...dateFilter
        };

        const posts = await Post.findAll({
          where,
          attributes: ['id', 'likes', 'comments', 'shares', 'createdAt'],
          order: [['createdAt', 'DESC']],
          raw: true
        });

        const metrics = this._calculateCreatorMetrics(posts, creator);

        return {
          success: true,
          data: {
            creator: creator.get({ plain: true }),
            metrics
          }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Post = this.models.Post;
        const User = this.models.User;

        const creator = await User.findById(creatorId).select('username fullName followers').lean();
        if (!creator) {
          return {
            success: false,
            data: null,
            message: 'Creator not found'
          };
        }

        const mongoFilter = {
          author: creatorId,
          ...this._getMongoDateFilter(filters.period)
        };

        const posts = await Post
          .find(mongoFilter)
          .select('id likes comments shares createdAt')
          .sort({ createdAt: -1 })
          .lean();

        const metrics = this._calculateCreatorMetrics(posts, creator);

        return {
          success: true,
          data: { creator, metrics }
        };
      }

      // Fallback
      return {
        success: false,
        data: null,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[SocialRepository] getCreatorMetrics error:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to fetch creator metrics',
        error: error.message
      };
    }
  }

  /**
   * Approve/reject social content
   * @param {string} contentId - Content ID
   * @param {string} action - 'approve' or 'reject'
   * @param {string} reason - Reason for action
   * @returns {Promise<Object>} Updated content
   */
  async updateContentStatus(contentId, action, reason = '') {
    try {
      if (!['approve', 'reject'].includes(action)) {
        return {
          success: false,
          message: 'Invalid action. Must be "approve" or "reject"'
        };
      }

      const status = action === 'approve' ? 'approved' : 'rejected';

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Post = this.models._raw.Post;
        if (!Post) {
          return {
            success: false,
            message: 'Post model not available'
          };
        }

        const [updated] = await Post.update(
          { approved: status === 'approved', rejectReason: reason },
          { where: { id: contentId }, returning: true }
        );

        if (updated === 0) {
          return {
            success: false,
            message: 'Content not found'
          };
        }

        const content = await Post.findByPk(contentId);
        return {
          success: true,
          message: `Content ${status} successfully`,
          data: content.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Post = this.models.Post;
        const content = await Post.findByIdAndUpdate(
          contentId,
          {
            approved: status === 'approved',
            rejectReason: reason,
            updatedAt: new Date()
          },
          { new: true }
        );

        if (!content) {
          return {
            success: false,
            message: 'Content not found'
          };
        }

        return {
          success: true,
          message: `Content ${status} successfully`,
          data: content.toObject()
        };
      }

      // Fallback
      return {
        success: false,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[SocialRepository] updateContentStatus error:', error);
      return {
        success: false,
        message: 'Failed to update content status',
        error: error.message
      };
    }
  }

  /**
   * Get single content details
   * @param {string} contentId - Content ID
   * @returns {Promise<Object>} Content details
   */
  async getContentById(contentId) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Post = this.models._raw.Post;
        if (!Post) {
          return {
            success: false,
            data: null,
            message: 'Post model not available'
          };
        }

        const content = await Post.findByPk(contentId, {
          include: [
            { model: this.models._raw.User, as: 'author', required: false },
            { model: this.models._raw.Product, as: 'products', required: false }
          ]
        });

        if (!content) {
          return {
            success: false,
            data: null,
            message: 'Content not found'
          };
        }

        return {
          success: true,
          data: content.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Post = this.models.Post;
        const content = await Post
          .findById(contentId)
          .populate('author')
          .populate('products')
          .lean();

        if (!content) {
          return {
            success: false,
            data: null,
            message: 'Content not found'
          };
        }

        return {
          success: true,
          data: content
        };
      }

      // Fallback
      return {
        success: false,
        data: null,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[SocialRepository] getContentById error:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to fetch content',
        error: error.message
      };
    }
  }

  /**
   * Delete social content
   * @param {string} contentId - Content ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteContent(contentId) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Post = this.models._raw.Post;
        if (!Post) {
          return {
            success: false,
            message: 'Post model not available'
          };
        }

        const deleted = await Post.destroy({ where: { id: contentId } });

        if (deleted === 0) {
          return {
            success: false,
            message: 'Content not found'
          };
        }

        return {
          success: true,
          message: 'Content deleted successfully'
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Post = this.models.Post;
        const result = await Post.findByIdAndDelete(contentId);

        if (!result) {
          return {
            success: false,
            message: 'Content not found'
          };
        }

        return {
          success: true,
          message: 'Content deleted successfully'
        };
      }

      // Fallback
      return {
        success: false,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[SocialRepository] deleteContent error:', error);
      return {
        success: false,
        message: 'Failed to delete content',
        error: error.message
      };
    }
  }

  /**
   * Build Sequelize WHERE clause
   * @private
   */
  _buildWhereClause(filters) {
    const where = {};

    if (filters.approved !== undefined && filters.approved !== 'all') {
      where.approved = filters.approved === 'true' || filters.approved === true;
    }

    if (filters.type && filters.type !== 'all') {
      where.type = filters.type;
    }

    if (filters.search) {
      where[Op.or] = [
        { content: { [Op.iLike]: `%${filters.search}%` } },
        { '$author.username$': { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    if (filters.dateFrom) {
      where.createdAt = { [Op.gte]: new Date(filters.dateFrom) };
    }

    if (filters.dateTo) {
      if (!where.createdAt) where.createdAt = {};
      where.createdAt[Op.lte] = new Date(filters.dateTo);
    }

    return where;
  }

  /**
   * Build MongoDB filter
   * @private
   */
  _buildMongoFilter(filters) {
    const mongoFilter = {};

    if (filters.approved !== undefined && filters.approved !== 'all') {
      mongoFilter.approved = filters.approved === 'true' || filters.approved === true;
    }

    if (filters.type && filters.type !== 'all') {
      mongoFilter.type = filters.type;
    }

    if (filters.search) {
      mongoFilter.$or = [
        { content: new RegExp(filters.search, 'i') },
        { 'author.username': new RegExp(filters.search, 'i') }
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      mongoFilter.createdAt = {};
      if (filters.dateFrom) {
        mongoFilter.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        mongoFilter.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    return mongoFilter;
  }

  /**
   * Get date filter for Sequelize
   * @private
   */
  _getDateFilter(period) {
    if (!period || period === 'all') {
      return {};
    }

    const days = parseInt(period) || 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return {
      createdAt: { [Op.gte]: dateFrom }
    };
  }

  /**
   * Get date filter for MongoDB
   * @private
   */
  _getMongoDateFilter(period) {
    if (!period || period === 'all') {
      return {};
    }

    const days = parseInt(period) || 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return {
      createdAt: { $gte: dateFrom }
    };
  }

  /**
   * Calculate content statistics
   * @private
   */
  _calculateStats(posts) {
    if (!posts || posts.length === 0) {
      return {
        totalPosts: 0,
        approvedPosts: 0,
        pendingPosts: 0,
        rejectedPosts: 0,
        totalEngagement: 0,
        avgEngagementPerPost: 0,
        topPost: null
      };
    }

    const approved = posts.filter(p => p.approved === true).length;
    const rejected = posts.filter(p => p.approved === false).length;
    const pending = posts.length - approved - rejected;

    let totalEngagement = 0;
    let topPost = posts[0];

    posts.forEach(post => {
      const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
      totalEngagement += engagement;

      const topEngagement = (topPost.likes || 0) + (topPost.comments || 0) + (topPost.shares || 0);
      if (engagement > topEngagement) {
        topPost = post;
      }
    });

    return {
      totalPosts: posts.length,
      approvedPosts: approved,
      pendingPosts: pending,
      rejectedPosts: rejected,
      totalEngagement,
      avgEngagementPerPost: Math.round(totalEngagement / posts.length),
      topPost
    };
  }

  /**
   * Calculate creator metrics
   * @private
   */
  _calculateCreatorMetrics(posts, creator) {
    if (!posts || posts.length === 0) {
      return {
        totalPosts: 0,
        totalEngagement: 0,
        avgEngagementPerPost: 0,
        engagementRate: 0
      };
    }

    let totalEngagement = 0;
    posts.forEach(post => {
      totalEngagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    });

    const engagementRate = creator.followers > 0
      ? ((totalEngagement / (posts.length * creator.followers)) * 100).toFixed(2)
      : 0;

    return {
      totalPosts: posts.length,
      totalEngagement,
      avgEngagementPerPost: Math.round(totalEngagement / posts.length),
      engagementRate
    };
  }
}

module.exports = SocialRepository;
