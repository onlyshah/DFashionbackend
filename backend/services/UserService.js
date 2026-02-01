/**
 * ============================================================================
 * USER SERVICE - Business Logic Layer
 * ============================================================================
 * Purpose: Handle all user-related business logic
 * Separation of concerns from controllers
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class UserService {
  constructor(models) {
    this.User = models.User;
    this.Role = models.Role;
    this.CreatorProfile = models.CreatorProfile;
    this.SellerProfile = models.SellerProfile;
    this.LoginAttempt = models.LoginAttempt;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      const { username, email, password, fullName, roleId } = userData;

      // Validate input
      if (!username || !email || !password || !fullName) {
        throw {
          code: 'MISSING_FIELDS',
          message: 'Missing required fields'
        };
      }

      // Check if user exists
      const existingUser = await this.User.findOne({
        where: {
          $or: [{ email }, { username }]
        }
      });

      if (existingUser) {
        throw {
          code: 'USER_EXISTS',
          message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await this.User.create({
        username,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role_id: roleId,
        is_active: true,
        is_verified: false
      });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role_id,
        createdAt: user.created_at
      };
    } catch (error) {
      console.error('UserService.createUser error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId, includeDetails = false) {
    try {
      const user = await this.User.findByPk(userId);

      if (!user) {
        throw {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        };
      }

      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        roleId: user.role_id,
        isActive: user.is_active,
        isVerified: user.is_verified,
        isEmailVerified: user.is_email_verified
      };

      if (includeDetails) {
        // Add role information
        const role = await this.Role.findByPk(user.role_id);
        userData.role = role?.name;

        // Add profile details if creator or seller
        if (user.role_id === 'creator') {
          const creatorProfile = await this.CreatorProfile.findOne({
            where: { user_id: userId }
          });
          if (creatorProfile) {
            userData.creatorProfile = {
              displayName: creatorProfile.display_name,
              category: creatorProfile.category,
              followerCount: creatorProfile.follower_count,
              isVerified: creatorProfile.is_verified_creator,
              totalEarnings: creatorProfile.total_earnings
            };
          }
        }

        if (user.role_id === 'seller') {
          const sellerProfile = await this.SellerProfile.findOne({
            where: { user_id: userId }
          });
          if (sellerProfile) {
            userData.sellerProfile = {
              shopName: sellerProfile.shop_name,
              verificationStatus: sellerProfile.verification_status,
              totalSales: sellerProfile.total_sales,
              averageRating: sellerProfile.average_rating
            };
          }
        }
      }

      return userData;
    } catch (error) {
      console.error('UserService.getUserById error:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      const user = await this.User.findOne({
        where: { email }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        roleId: user.role_id,
        isActive: user.is_active,
        passwordHash: user.password_hash,
        loginAttempts: user.login_attempts,
        accountLockedUntil: user.account_locked_until
      };
    } catch (error) {
      console.error('UserService.getUserByEmail error:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    try {
      const { fullName, bio, avatarUrl } = updateData;

      const user = await this.User.findByPk(userId);
      if (!user) {
        throw {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        };
      }

      // Update fields
      if (fullName) user.full_name = fullName;
      if (bio !== undefined) user.bio = bio;
      if (avatarUrl) user.avatar_url = avatarUrl;
      user.updated_at = new Date();

      await user.save();

      return {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        bio: user.bio,
        avatarUrl: user.avatar_url
      };
    } catch (error) {
      console.error('UserService.updateUser error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await this.User.findByPk(userId);
      if (!user) {
        throw {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        };
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        throw {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        };
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters'
        };
      }

      // Hash and save new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      user.password_hash = newPasswordHash;
      user.updated_at = new Date();

      await user.save();

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('UserService.changePassword error:', error);
      throw error;
    }
  }

  /**
   * Ban user
   */
  async banUser(userId, reason) {
    try {
      const user = await this.User.findByPk(userId);
      if (!user) {
        throw {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        };
      }

      user.is_active = false;
      user.updated_at = new Date();

      await user.save();

      // TODO: Log ban action
      // TODO: Send notification email

      return { success: true, message: 'User banned successfully' };
    } catch (error) {
      console.error('UserService.banUser error:', error);
      throw error;
    }
  }

  /**
   * List users with pagination and filters
   */
  async listUsers(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const { role, isActive, search } = filters;

      let where = {};

      if (role) {
        where.role_id = role;
      }

      if (isActive !== undefined) {
        where.is_active = isActive;
      }

      if (search) {
        where.$or = [
          { username: { $like: `%${search}%` } },
          { email: { $like: `%${search}%` } },
          { full_name: { $like: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await this.User.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      return {
        data: rows.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          roleId: user.role_id,
          isActive: user.is_active,
          createdAt: user.created_at
        })),
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('UserService.listUsers error:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const stats = {
        totalUsers: await this.User.count(),
        activeUsers: await this.User.count({ where: { is_active: true } }),
        verifiedUsers: await this.User.count({ where: { is_verified: true } }),
        usersByRole: {}
      };

      // Count by role
      const roles = await this.Role.findAll();
      for (const role of roles) {
        stats.usersByRole[role.name] = await this.User.count({
          where: { role_id: role.id }
        });
      }

      return stats;
    } catch (error) {
      console.error('UserService.getUserStats error:', error);
      throw error;
    }
  }

  /**
   * Record login attempt
   */
  async recordLoginAttempt(email, ipAddress, userAgent, success, failureReason) {
    try {
      const user = await this.User.findOne({ where: { email } });

      if (this.LoginAttempt) {
        await this.LoginAttempt.create({
          user_id: user ? user.id : null,
          email,
          ip_address: ipAddress,
          user_agent: userAgent,
          success,
          failure_reason: failureReason
        });
      }
    } catch (error) {
      console.error('UserService.recordLoginAttempt error:', error);
    }
  }

  /**
   * Get login history for user
   */
  async getLoginHistory(userId, limit = 20) {
    try {
      if (!this.LoginAttempt) {
        return [];
      }

      const attempts = await this.LoginAttempt.findAll({
        where: { user_id: userId, success: true },
        order: [['created_at', 'DESC']],
        limit
      });

      return attempts.map(attempt => ({
        ipAddress: attempt.ip_address,
        timestamp: attempt.created_at,
        device: attempt.user_agent
      }));
    } catch (error) {
      console.error('UserService.getLoginHistory error:', error);
      return [];
    }
  }
}

module.exports = UserService;
