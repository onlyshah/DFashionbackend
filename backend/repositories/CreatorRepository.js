/**
 * CreatorRepository - Database-Agnostic Creator Management Data Access Layer
 * Supports both PostgreSQL (Sequelize) and MongoDB (Mongoose)
 * Provides transparent database switching with graceful fallback
 */

const { Op } = require('sequelize');

class CreatorRepository {
  constructor(models) {
    this.models = models;
    this.isSequelize = models._raw && models._raw.Creator ? true : false;
    this.isMongoDB = models.Creator && models.Creator.findById ? true : false;
  }

  /**
   * Get all creators with filtering and pagination
   * @param {Object} filters - Filter object {status, tier, search, sortBy}
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Records per page
   * @returns {Promise<Object>} Creators with pagination
   */
  async getCreators(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const where = this._buildWhereClause(filters);
      const order = this._buildOrderClause(filters.sortBy);

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Creator = this.models._raw.Creator;
        const User = this.models._raw.User;

        if (!Creator) {
          return {
            success: false,
            data: { creators: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
            message: 'Creator model not available'
          };
        }

        const { count, rows } = await Creator.findAndCountAll({
          where,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'fullName', 'email', 'avatar'],
              required: false
            }
          ],
          order,
          limit,
          offset: skip,
          subQuery: false
        });

        return {
          success: true,
          data: {
            creators: rows || [],
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
        const Creator = this.models.Creator;
        const mongoFilter = this._buildMongoFilter(filters);
        const mongoOrder = this._buildMongoOrder(filters.sortBy);

        const creators = await Creator
          .find(mongoFilter)
          .populate('userId', 'username fullName email avatar')
          .sort(mongoOrder)
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await Creator.countDocuments(mongoFilter);

        return {
          success: true,
          data: {
            creators: creators || [],
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
        data: { creators: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[CreatorRepository] getCreators error:', error);
      return {
        success: false,
        data: { creators: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
        message: 'Failed to fetch creators',
        error: error.message
      };
    }
  }

  /**
   * Get creator by ID with detailed information
   * @param {string} creatorId - Creator ID
   * @returns {Promise<Object>} Creator details
   */
  async getCreatorById(creatorId) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Creator = this.models._raw.Creator;
        const User = this.models._raw.User;

        if (!Creator) {
          return {
            success: false,
            data: null,
            message: 'Creator model not available'
          };
        }

        const creator = await Creator.findByPk(creatorId, {
          include: [
            {
              model: User,
              as: 'user',
              attributes: { exclude: ['password'] },
              required: false
            }
          ]
        });

        if (!creator) {
          return {
            success: false,
            data: null,
            message: 'Creator not found'
          };
        }

        return {
          success: true,
          data: creator.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Creator = this.models.Creator;
        const creator = await Creator
          .findById(creatorId)
          .populate('userId', '-password')
          .lean();

        if (!creator) {
          return {
            success: false,
            data: null,
            message: 'Creator not found'
          };
        }

        return {
          success: true,
          data: creator
        };
      }

      // Fallback
      return {
        success: false,
        data: null,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[CreatorRepository] getCreatorById error:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to fetch creator',
        error: error.message
      };
    }
  }

  /**
   * Get creator statistics and overview
   * @param {Object} filters - Filter object {period}
   * @returns {Promise<Object>} Statistics data
   */
  async getCreatorStats(filters = {}) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Creator = this.models._raw.Creator;
        if (!Creator) {
          return {
            success: false,
            data: { stats: {} },
            message: 'Creator model not available'
          };
        }

        const creators = await Creator.findAll({
          attributes: ['id', 'status', 'tier', 'followers', 'totalEarnings'],
          raw: true
        });

        const stats = this._calculateStats(creators);
        return {
          success: true,
          data: { stats }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Creator = this.models.Creator;
        const creators = await Creator.find({}).lean();
        const stats = this._calculateStats(creators);

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
      console.error('[CreatorRepository] getCreatorStats error:', error);
      return {
        success: false,
        data: { stats: {} },
        message: 'Failed to calculate statistics',
        error: error.message
      };
    }
  }

  /**
   * Get pending creator verifications
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @returns {Promise<Object>} Pending verifications
   */
  async getPendingVerifications(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const where = { status: 'pending' };

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Creator = this.models._raw.Creator;
        if (!Creator) {
          return {
            success: false,
            data: { verifications: [] },
            message: 'Creator model not available'
          };
        }

        const { count, rows } = await Creator.findAndCountAll({
          where,
          include: [
            {
              model: this.models._raw.User,
              as: 'user',
              attributes: ['id', 'username', 'email', 'fullName'],
              required: false
            }
          ],
          order: [['createdAt', 'ASC']],
          limit,
          offset: skip
        });

        return {
          success: true,
          data: {
            verifications: rows || [],
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(count / limit),
              totalRecords: count
            }
          }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Creator = this.models.Creator;
        const verifications = await Creator
          .find(where)
          .populate('userId', 'username email fullName')
          .sort({ createdAt: 1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await Creator.countDocuments(where);

        return {
          success: true,
          data: {
            verifications: verifications || [],
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              totalRecords: total
            }
          }
        };
      }

      // Fallback
      return {
        success: false,
        data: { verifications: [] },
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[CreatorRepository] getPendingVerifications error:', error);
      return {
        success: false,
        data: { verifications: [] },
        message: 'Failed to fetch pending verifications',
        error: error.message
      };
    }
  }

  /**
   * Update creator verification status
   * @param {string} creatorId - Creator ID
   * @param {Object} verificationData - {status, tier, notes, bankVerified, identityVerified}
   * @returns {Promise<Object>} Updated creator
   */
  async verifyCreator(creatorId, verificationData) {
    try {
      const validStatuses = ['verified', 'pending', 'rejected'];
      const validTiers = ['platinum', 'gold', 'silver', 'bronze'];

      if (!validStatuses.includes(verificationData.status)) {
        return {
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        };
      }

      if (!validTiers.includes(verificationData.tier)) {
        return {
          success: false,
          message: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
        };
      }

      const updateData = {
        status: verificationData.status,
        tier: verificationData.tier,
        verificationNotes: verificationData.notes,
        bankAccountVerified: verificationData.bankVerified || false,
        identityVerified: verificationData.identityVerified || false
      };

      if (verificationData.status === 'verified') {
        updateData.verificationDate = new Date();
      }

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Creator = this.models._raw.Creator;
        if (!Creator) {
          return {
            success: false,
            message: 'Creator model not available'
          };
        }

        const [updated] = await Creator.update(updateData, {
          where: { id: creatorId },
          returning: true
        });

        if (updated === 0) {
          return {
            success: false,
            message: 'Creator not found'
          };
        }

        const creator = await Creator.findByPk(creatorId);
        return {
          success: true,
          message: 'Creator verified successfully',
          data: creator.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Creator = this.models.Creator;
        const creator = await Creator.findByIdAndUpdate(creatorId, updateData, { new: true });

        if (!creator) {
          return {
            success: false,
            message: 'Creator not found'
          };
        }

        return {
          success: true,
          message: 'Creator verified successfully',
          data: creator.toObject()
        };
      }

      // Fallback
      return {
        success: false,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[CreatorRepository] verifyCreator error:', error);
      return {
        success: false,
        message: 'Failed to verify creator',
        error: error.message
      };
    }
  }

  /**
   * Update creator information
   * @param {string} creatorId - Creator ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated creator
   */
  async updateCreator(creatorId, updates) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Creator = this.models._raw.Creator;
        if (!Creator) {
          return {
            success: false,
            message: 'Creator model not available'
          };
        }

        const [updated] = await Creator.update(updates, {
          where: { id: creatorId },
          returning: true
        });

        if (updated === 0) {
          return {
            success: false,
            message: 'Creator not found'
          };
        }

        const creator = await Creator.findByPk(creatorId);
        return {
          success: true,
          message: 'Creator updated successfully',
          data: creator.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Creator = this.models.Creator;
        const creator = await Creator.findByIdAndUpdate(creatorId, updates, { new: true });

        if (!creator) {
          return {
            success: false,
            message: 'Creator not found'
          };
        }

        return {
          success: true,
          message: 'Creator updated successfully',
          data: creator.toObject()
        };
      }

      // Fallback
      return {
        success: false,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[CreatorRepository] updateCreator error:', error);
      return {
        success: false,
        message: 'Failed to update creator',
        error: error.message
      };
    }
  }

  /**
   * Get creator by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Creator data
   */
  async getCreatorByUserId(userId) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Creator = this.models._raw.Creator;
        if (!Creator) {
          return {
            success: false,
            data: null,
            message: 'Creator model not available'
          };
        }

        const creator = await Creator.findOne({
          where: { userId }
        });

        if (!creator) {
          return {
            success: false,
            data: null,
            message: 'Creator not found'
          };
        }

        return {
          success: true,
          data: creator.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Creator = this.models.Creator;
        const creator = await Creator.findOne({ userId }).lean();

        if (!creator) {
          return {
            success: false,
            data: null,
            message: 'Creator not found'
          };
        }

        return {
          success: true,
          data: creator
        };
      }

      // Fallback
      return {
        success: false,
        data: null,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[CreatorRepository] getCreatorByUserId error:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to fetch creator',
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

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.tier && filters.tier !== 'all') {
      where.tier = filters.tier;
    }

    if (filters.search) {
      where[Op.or] = [
        { '$user.username$': { [Op.iLike]: `%${filters.search}%` } },
        { '$user.fullName$': { [Op.iLike]: `%${filters.search}%` } },
        { '$user.email$': { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    return where;
  }

  /**
   * Build MongoDB filter
   * @private
   */
  _buildMongoFilter(filters) {
    const mongoFilter = {};

    if (filters.status && filters.status !== 'all') {
      mongoFilter.status = filters.status;
    }

    if (filters.tier && filters.tier !== 'all') {
      mongoFilter.tier = filters.tier;
    }

    if (filters.search) {
      mongoFilter.$or = [
        { 'user.username': new RegExp(filters.search, 'i') },
        { 'user.fullName': new RegExp(filters.search, 'i') },
        { 'user.email': new RegExp(filters.search, 'i') }
      ];
    }

    return mongoFilter;
  }

  /**
   * Build Sequelize ORDER clause
   * @private
   */
  _buildOrderClause(sortBy) {
    const validSorts = {
      followers: ['followers', 'DESC'],
      engagement: ['engagementRate', 'DESC'],
      earnings: ['totalEarnings', 'DESC'],
      createdAt: ['createdAt', 'DESC'],
      default: ['createdAt', 'DESC']
    };

    return [validSorts[sortBy] || validSorts.default];
  }

  /**
   * Build MongoDB sort order
   * @private
   */
  _buildMongoOrder(sortBy) {
    const validSorts = {
      followers: { followers: -1 },
      engagement: { engagementRate: -1 },
      earnings: { totalEarnings: -1 },
      createdAt: { createdAt: -1 },
      default: { createdAt: -1 }
    };

    return validSorts[sortBy] || validSorts.default;
  }

  /**
   * Calculate creator statistics
   * @private
   */
  _calculateStats(creators) {
    if (!creators || creators.length === 0) {
      return {
        totalCreators: 0,
        verifiedCreators: 0,
        pendingCreators: 0,
        rejectedCreators: 0,
        totalEarnings: 0,
        monthlyEarnings: 0,
        byTier: {}
      };
    }

    const verified = creators.filter(c => c.status === 'verified').length;
    const pending = creators.filter(c => c.status === 'pending').length;
    const rejected = creators.filter(c => c.status === 'rejected').length;

    const totalEarnings = creators.reduce((sum, c) => sum + (c.totalEarnings || 0), 0);
    const monthlyEarnings = creators.reduce((sum, c) => sum + (c.monthlyEarnings || 0), 0);

    // Group by tier
    const byTier = {};
    creators.forEach(c => {
      if (!byTier[c.tier]) {
        byTier[c.tier] = { count: 0, totalEarnings: 0, avgFollowers: 0 };
      }
      byTier[c.tier].count += 1;
      byTier[c.tier].totalEarnings += c.totalEarnings || 0;
      byTier[c.tier].avgFollowers += c.followers || 0;
    });

    // Calculate averages
    Object.keys(byTier).forEach(tier => {
      byTier[tier].avgFollowers = Math.round(byTier[tier].avgFollowers / byTier[tier].count);
    });

    return {
      totalCreators: creators.length,
      verifiedCreators: verified,
      pendingCreators: pending,
      rejectedCreators: rejected,
      totalEarnings,
      monthlyEarnings,
      byTier
    };
  }
}

module.exports = CreatorRepository;
