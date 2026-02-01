/**
 * MongoDB User Service
 * Pure MongoDB/Mongoose database operations for User model
 */

const mongoose = require('mongoose');
const User = mongoose.model('User');

class UserService {
  /**
   * Get all users with filtering and pagination
   */
  static async getAllUsers(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const mongoFilter = {};

      if (filters.role) mongoFilter.role = filters.role;
      if (filters.search) {
        mongoFilter.$or = [
          { email: { $regex: filters.search, $options: 'i' } },
          { fullName: { $regex: filters.search, $options: 'i' } },
          { username: { $regex: filters.search, $options: 'i' } }
        ];
      }
      if (filters.department) mongoFilter.department = filters.department;
      if (filters.isActive !== undefined) mongoFilter.isActive = filters.isActive;

      const users = await User
        .find(mongoFilter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await User.countDocuments(mongoFilter);

      return {
        success: true,
        data: users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('[UserService-MongoDB] getAllUsers error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id) {
    try {
      const user = await User.findById(id).select('-password').lean();
      return { success: !!user, data: user };
    } catch (error) {
      console.error('[UserService-MongoDB] getUserById error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email }).lean();
      return { success: !!user, data: user };
    } catch (error) {
      console.error('[UserService-MongoDB] getUserByEmail error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get users by role with pagination
   */
  static async getUsersByRole(role, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const users = await User
        .find({ role })
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      const total = await User.countDocuments({ role });

      return {
        success: true,
        data: users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      console.error('[UserService-MongoDB] getUsersByRole error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Create user
   */
  static async createUser(userData) {
    try {
      const user = new User(userData);
      await user.save();
      return { success: true, data: user };
    } catch (error) {
      console.error('[UserService-MongoDB] createUser error:', error.message);
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

      const user = await User.findByIdAndUpdate(id, safeUpdates, { new: true }).select('-password');
      return { success: !!user, data: user };
    } catch (error) {
      console.error('[UserService-MongoDB] updateUser error:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(id) {
    try {
      const result = await User.findByIdAndDelete(id);
      return { success: !!result, data: result };
    } catch (error) {
      console.error('[UserService-MongoDB] deleteUser error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Count users by role
   */
  static async countByRole(role) {
    try {
      const count = await User.countDocuments({ role });
      return { success: true, data: count };
    } catch (error) {
      console.error('[UserService-MongoDB] countByRole error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get admin statistics
   */
  static async getAdminStats() {
    try {
      const totalUsers = await User.countDocuments({});
      const adminCount = await User.countDocuments({ role: 'admin' });
      const superAdminCount = await User.countDocuments({ role: 'super_admin' });
      const vendorCount = await User.countDocuments({ role: 'vendor' });
      const customerCount = await User.countDocuments({ role: 'customer' });

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
      console.error('[UserService-MongoDB] getAdminStats error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = UserService;
