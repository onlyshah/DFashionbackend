/**
 * UserRepository - Database-Agnostic User Data Access Layer
 * Supports both MongoDB and PostgreSQL
 */

const { Op } = require('sequelize');

class UserRepository {
  constructor(models) {
    this.models = models;
    this.isMongoDB = models.User && typeof models.User.find === 'function';
    this.isSequelize = models.User && typeof models.User.findAll === 'function';
  }

  /**
   * Get all users with filtering and pagination
   */
  async getAllUsers(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      if (this.isSequelize) {
        const where = {};
        if (filters.role) where.role = filters.role;
        if (filters.search) {
          where[Op.or] = [
            { email: { [Op.iLike]: `%${filters.search}%` } },
            { fullName: { [Op.iLike]: `%${filters.search}%` } }
          ];
        }

        const { count, rows } = await this.models.User.findAndCountAll({
          where,
          attributes: { exclude: ['password'] },
          order: [['createdAt', 'DESC']],
          limit,
          offset: skip
        });

        return {
          success: true,
          data: rows,
          pagination: {
            current: page,
            pages: Math.ceil(count / limit),
            total: count
          }
        };
      } else if (this.isMongoDB) {
        const mongoFilter = {};
        if (filters.role) mongoFilter.role = filters.role;
        if (filters.search) {
          mongoFilter.$or = [
            { email: { $regex: filters.search, $options: 'i' } },
            { fullName: { $regex: filters.search, $options: 'i' } }
          ];
        }

        const users = await this.models.User
          .find(mongoFilter)
          .select('-password')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await this.models.User.countDocuments(mongoFilter);

        return {
          success: true,
          data: users,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        };
      }

      return {
        success: true,
        data: [],
        pagination: { current: page, pages: 0, total: 0 }
      };
    } catch (error) {
      console.error('[UserRepository] getAllUsers error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    try {
      if (this.isSequelize) {
        const user = await this.models.User.findByPk(id, {
          attributes: { exclude: ['password'] }
        });
        return { success: !!user, data: user };
      } else if (this.isMongoDB) {
        const user = await this.models.User.findById(id).select('-password').lean();
        return { success: !!user, data: user };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('[UserRepository] getUserById error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      if (this.isSequelize) {
        const user = await this.models.User.findOne({
          where: { email }
        });
        return { success: !!user, data: user };
      } else if (this.isMongoDB) {
        const user = await this.models.User.findOne({ email }).lean();
        return { success: !!user, data: user };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('[UserRepository] getUserByEmail error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      if (this.isSequelize) {
        const { count, rows } = await this.models.User.findAndCountAll({
          where: { role },
          attributes: { exclude: ['password'] },
          limit,
          offset: skip,
          order: [['createdAt', 'DESC']]
        });

        return {
          success: true,
          data: rows,
          pagination: {
            current: page,
            pages: Math.ceil(count / limit),
            total: count
          }
        };
      } else if (this.isMongoDB) {
        const users = await this.models.User
          .find({ role })
          .select('-password')
          .limit(limit)
          .skip(skip)
          .sort({ createdAt: -1 })
          .lean();

        const total = await this.models.User.countDocuments({ role });

        return {
          success: true,
          data: users,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        };
      }

      return { success: true, data: [], pagination: { current: page, pages: 0, total: 0 } };
    } catch (error) {
      console.error('[UserRepository] getUsersByRole error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Create user
   */
  async createUser(userData) {
    try {
      if (this.isSequelize) {
        const user = await this.models.User.create(userData);
        return { success: true, data: user };
      } else if (this.isMongoDB) {
        const user = new this.models.User(userData);
        await user.save();
        return { success: true, data: user };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('[UserRepository] createUser error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Update user
   */
  async updateUser(id, updates) {
    try {
      // Don't allow direct password updates through repository
      const safeUpdates = { ...updates };
      delete safeUpdates.password;

      if (this.isSequelize) {
        await this.models.User.update(safeUpdates, { where: { id } });
        const user = await this.models.User.findByPk(id, {
          attributes: { exclude: ['password'] }
        });
        return { success: true, data: user };
      } else if (this.isMongoDB) {
        const user = await this.models.User.findByIdAndUpdate(id, safeUpdates, { new: true }).select('-password');
        return { success: true, data: user };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('[UserRepository] updateUser error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Count users by role
   */
  async countByRole(role) {
    try {
      if (this.isSequelize) {
        const count = await this.models.User.count({ where: { role } });
        return { success: true, data: count };
      } else if (this.isMongoDB) {
        const count = await this.models.User.countDocuments({ role });
        return { success: true, data: count };
      }
      return { success: true, data: 0 };
    } catch (error) {
      console.error('[UserRepository] countByRole error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get admin statistics
   */
  async getAdminStats() {
    try {
      if (this.isSequelize) {
        const totalUsers = await this.models.User.count();
        const adminCount = await this.models.User.count({ where: { role: 'admin' } });
        const superAdminCount = await this.models.User.count({ where: { role: 'super_admin' } });
        const vendorCount = await this.models.User.count({ where: { role: 'vendor' } });
        const customerCount = await this.models.User.count({ where: { role: 'customer' } });

        return {
          success: true,
          data: {
            totalUsers,
            adminCount,
            superAdminCount,
            vendorCount,
            customerCount
          }
        };
      } else if (this.isMongoDB) {
        const totalUsers = await this.models.User.countDocuments({});
        const adminCount = await this.models.User.countDocuments({ role: 'admin' });
        const superAdminCount = await this.models.User.countDocuments({ role: 'super_admin' });
        const vendorCount = await this.models.User.countDocuments({ role: 'vendor' });
        const customerCount = await this.models.User.countDocuments({ role: 'customer' });

        return {
          success: true,
          data: {
            totalUsers,
            adminCount,
            superAdminCount,
            vendorCount,
            customerCount
          }
        };
      }

      return {
        success: true,
        data: {
          totalUsers: 0,
          adminCount: 0,
          superAdminCount: 0,
          vendorCount: 0,
          customerCount: 0
        }
      };
    } catch (error) {
      console.error('[UserRepository] getAdminStats error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = UserRepository;
