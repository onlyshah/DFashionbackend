/**
 * PostgreSQL User Service
 * Pure Sequelize database operations for User model
 */

const { Op } = require('sequelize');
const models = require('../../models');
const User = models.User;

class UserService {
  /**
   * Get all users with filtering and pagination
   */
  static async getAllUsers(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const where = {};

      if (filters.role) where.role = filters.role;
      if (filters.search) {
        where[Op.or] = [
          { email: { [Op.iLike]: `%${filters.search}%` } },
          { fullName: { [Op.iLike]: `%${filters.search}%` } },
          { username: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }
      if (filters.department) where.department = filters.department;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;

      const { count, rows } = await User.findAndCountAll({
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
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalUsers: count,
          hasNextPage: page < Math.ceil(count / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('[UserService-PostgreSQL] getAllUsers error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id) {
    try {
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });
      return { success: !!user, data: user };
    } catch (error) {
      console.error('[UserService-PostgreSQL] getUserById error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email) {
    try {
      const user = await User.findOne({
        where: { email },
        attributes: { exclude: ['password'] }
      });
      return { success: !!user, data: user };
    } catch (error) {
      console.error('[UserService-PostgreSQL] getUserByEmail error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get users by role with pagination
   */
  static async getUsersByRole(role, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const { count, rows } = await User.findAndCountAll({
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
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          total: count
        }
      };
    } catch (error) {
      console.error('[UserService-PostgreSQL] getUsersByRole error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Create user
   */
  static async createUser(userData) {
    try {
      const user = await User.create(userData);
      return { success: true, data: user };
    } catch (error) {
      console.error('[UserService-PostgreSQL] createUser error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Update user
   */
  static async updateUser(id, updates) {
    try {
      const safeUpdates = { ...updates };
      delete safeUpdates.password;

      await User.update(safeUpdates, { where: { id } });
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });
      return { success: !!user, data: user };
    } catch (error) {
      console.error('[UserService-PostgreSQL] updateUser error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(id) {
    try {
      const result = await User.destroy({ where: { id } });
      return { success: result > 0, data: { deletedCount: result } };
    } catch (error) {
      console.error('[UserService-PostgreSQL] deleteUser error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Count users by role
   */
  static async countByRole(role) {
    try {
      const count = await User.count({ where: { role } });
      return { success: true, data: count };
    } catch (error) {
      console.error('[UserService-PostgreSQL] countByRole error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get admin statistics
   */
  static async getAdminStats() {
    try {
      const totalUsers = await User.count();
      const adminCount = await User.count({ where: { role: 'admin' } });
      const superAdminCount = await User.count({ where: { role: 'super_admin' } });
      const vendorCount = await User.count({ where: { role: 'vendor' } });
      const customerCount = await User.count({ where: { role: 'customer' } });

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
    } catch (error) {
      console.error('[UserService-PostgreSQL] getAdminStats error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = UserService;
