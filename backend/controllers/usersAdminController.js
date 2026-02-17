/**
 * ============================================================================
 * USERS ADMIN CONTROLLER - PostgreSQL/Sequelize + RBAC
 * ============================================================================
 * Purpose: User management, moderation, activity logs (admin tier)
 * Database: PostgreSQL via Sequelize ORM
 * Access: Admin and super_admin roles only
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');

// Constants
const USER_ROLES = ['user', 'admin', 'vendor', 'creator'];
const USER_STATUSES = ['active', 'suspended', 'banned', 'inactive'];

/**
 * Get all users (admin endpoint)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search, department, created_after } = req.query;

    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view all users');
    }

    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = {};
    if (role && USER_ROLES.includes(role)) {
      where.role = role;
    }
    if (status && USER_STATUSES.includes(status)) {
      where.account_status = status;
    }
    if (department) {
      where.department = department;
    }
    if (created_after) {
      where.createdAt = { [Op.gte]: new Date(created_after) };
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Use raw SQL to avoid Sequelize/attribute mapping issues in the admin panel
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    const filters = [];
    const vals = [];
    let i = 1;
    if (role && USER_ROLES.includes(role)) { filters.push(`role = $${i++}`); vals.push(role); }
    if (status && USER_STATUSES.includes(status)) { filters.push(`account_status = $${i++}`); vals.push(status); }
    if (department) { filters.push(`department = $${i++}`); vals.push(department); }
    if (created_after) { filters.push(`created_at >= $${i++}`); vals.push(new Date(created_after)); }
    if (search) { filters.push(`(name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i})`); vals.push(`%${search}%`); i++; }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rowsQuery = `SELECT u.*, up.bio, up.avatar_url, up.date_of_birth FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id ${whereClause} ORDER BY u.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    vals.push(validated_limit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;

    const rowsRes = await client.query(rowsQuery, vals);
    const countRes = await client.query(countQuery, vals.slice(0, vals.length - 2));
    await client.end();

    const rows = rowsRes.rows;
    const count = parseInt(countRes.rows[0].total || 0);

    const pagination = {
      page: parseInt(page),
      limit: validated_limit,
      total: count,
      totalPages: Math.ceil(count / validated_limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'Users retrieved successfully');
  } catch (error) {
    console.error('❌ getAllUsers error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get user by ID (admin endpoint)
 */
exports.getUserById = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view user details');
    }

    const user = await models.User.findByPk(user_id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: models.UserProfile, attributes: ['bio', 'avatar_url', 'date_of_birth', 'phone_verified'] },
        { model: models.Address, attributes: ['id', 'type', 'address_line_1', 'city', 'state'] },
        { model: models.Order, attributes: ['id', 'order_number', 'total_amount', 'status'], limit: 5 }
      ]
    });

    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    return ApiResponse.success(res, user, 'User details retrieved successfully');
  } catch (error) {
    console.error('❌ getUserById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Search users
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 20, role, status } = req.query;

    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can search users');
    }

    if (!q || q.length < 2) {
      return ApiResponse.error(res, 'Search query must be at least 2 characters', 422);
    }

    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
        { phone: { [Op.iLike]: `%${q}%` } }
      ]
    };

    if (role && USER_ROLES.includes(role)) {
      where.role = role;
    }
    if (status && USER_STATUSES.includes(status)) {
      where.account_status = status;
    }

    const { count, rows } = await models.User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [[Sequelize.literal('"User"."created_at"'), 'DESC']],
      limit: validated_limit,
      offset,
      distinct: true
    });

    const pagination = {
      page: parseInt(page),
      limit: validated_limit,
      total: count,
      totalPages: Math.ceil(count / validated_limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'Users search results');
  } catch (error) {
    console.error('❌ searchUsers error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Ban user (admin only)
 */
exports.banUser = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can ban users');
    }

    const { user_id } = req.params;
    const { reason, duration_days } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'Ban reason is required', 422);
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    // Prevent banning self
    if (user_id == req.user.id) {
      return ApiResponse.error(res, 'Cannot ban yourself', 422);
    }

    const ban_until = duration_days ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000) : null;

    const t = await models.sequelize.transaction();
    try {
      await user.update({
        account_status: 'banned',
        ban_reason: reason,
        ban_until,
        banned_at: new Date(),
        banned_by: req.user.id
      }, { transaction: t });

      // Log action
      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'ban_user',
        resource_type: 'User',
        resource_id: user_id,
        details: { reason, duration_days }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        user_id,
        status: 'banned',
        ban_until
      }, 'User banned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ banUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Suspend user (admin only)
 */
exports.suspendUser = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can suspend users');
    }

    const { user_id } = req.params;
    const { reason, duration_days } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'Suspension reason is required', 422);
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const suspend_until = duration_days ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000) : null;

    const t = await models.sequelize.transaction();
    try {
      await user.update({
        account_status: 'suspended',
        suspension_reason: reason,
        suspend_until,
        suspended_at: new Date(),
        suspended_by: req.user.id
      }, { transaction: t });

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'suspend_user',
        resource_type: 'User',
        resource_id: user_id,
        details: { reason, duration_days }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        user_id,
        status: 'suspended',
        suspend_until
      }, 'User suspended successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ suspendUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Verify user email (admin only)
 */
exports.verifyUser = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can verify users');
    }

    const { user_id } = req.params;

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    if (user.email_verified) {
      return ApiResponse.error(res, 'User email is already verified', 409);
    }

    await user.update({
      email_verified: true,
      email_verified_at: new Date()
    });

    return ApiResponse.success(res, {
      user_id,
      email_verified: true
    }, 'User email verified successfully');
  } catch (error) {
    console.error('❌ verifyUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Unban/unsuspend user (admin only)
 */
exports.unbanUser = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can unban users');
    }

    const { user_id } = req.params;

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const t = await models.sequelize.transaction();
    try {
      await user.update({
        account_status: 'active',
        ban_reason: null,
        ban_until: null,
        banned_at: null,
        banned_by: null,
        suspension_reason: null,
        suspend_until: null,
        suspended_at: null,
        suspended_by: null
      }, { transaction: t });

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'unban_user',
        resource_type: 'User',
        resource_id: user_id,
        details: {}
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        user_id,
        status: 'active'
      }, 'User unbanned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ unbanUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get user activity logs
 */
exports.getUserActivityLogs = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view activity logs');
    }

    const { user_id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const { count, rows } = await models.UserActivityLog.findAndCountAll({
      where: { user_id },
      order: [[Sequelize.literal('"UserActivityLog"."created_at"'), 'DESC']],
      limit: validated_limit,
      offset,
      distinct: true
    });

    const pagination = {
      page: parseInt(page),
      limit: validated_limit,
      total: count,
      totalPages: Math.ceil(count / validated_limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'User activity logs retrieved successfully');
  } catch (error) {
    console.error('❌ getUserActivityLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Bulk user actions (ban/suspend multiple users)
 */
exports.bulkUserActions = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can perform bulk actions');
    }

    const { user_ids, action, reason } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return ApiResponse.error(res, 'user_ids array is required', 422);
    }

    if (!['ban', 'suspend', 'unban', 'verify'].includes(action)) {
      return ApiResponse.error(res, 'Invalid action. Must be: ban, suspend, unban, or verify', 422);
    }

    const t = await models.sequelize.transaction();
    try {
      const updates = {};

      switch (action) {
        case 'ban':
          updates.account_status = 'banned';
          updates.ban_reason = reason || 'Admin action';
          updates.banned_at = new Date();
          updates.banned_by = req.user.id;
          break;
        case 'suspend':
          updates.account_status = 'suspended';
          updates.suspension_reason = reason || 'Admin action';
          updates.suspended_at = new Date();
          updates.suspended_by = req.user.id;
          break;
        case 'unban':
          updates.account_status = 'active';
          updates.ban_reason = null;
          updates.ban_until = null;
          updates.suspension_reason = null;
          updates.suspend_until = null;
          break;
        case 'verify':
          updates.email_verified = true;
          updates.email_verified_at = new Date();
          break;
      }

      await models.User.update(updates, {
        where: { id: { [Op.in]: user_ids } },
        transaction: t
      });

      // Log bulk action
      for (const user_id of user_ids) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id,
          action: `bulk_${action}`,
          resource_type: 'User',
          resource_id: user_id,
          details: { reason }
        }, { transaction: t });
      }

      await t.commit();

      return ApiResponse.success(res, {
        action,
        affected_users: user_ids.length
      }, `Bulk ${action} completed successfully`);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ bulkUserActions error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 👥 Get Customers (EndUsers only) with aggregated engagement & order metrics
 * - Filters: role = 'user' ONLY
 * - Aggregates: Posts, Likes, Comments, Shares, Orders per user
 * - Avoids N+1 via MongoDB aggregation pipeline
 * - RBAC: SuperAdmin/Admin only
 */
exports.getCustomers = async (req, res) => {
  try {
    // RBAC: Only SuperAdmin/Admin can access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view customers');
    }

    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    // Use Sequelize User model (PostgreSQL)
    const User = models.User;
    const Role = models.Role;
    const sequelize = models.sequelize;

    if (!User) {
      return ApiResponse.error(res, 'User model not available', 500);
    }

    // Get user role ID (query by Role.name since User.role field is null)
    const userRole = await Role.findOne({ where: { name: 'user' }, attributes: ['id'], raw: true });
    if (!userRole) {
      return ApiResponse.paginated(res, [], { page: parseInt(page), limit: validated_limit, total: 0, totalPages: 0 }, 'Customers retrieved successfully');
    }

    // Build WHERE clause to filter EndUsers only (roleId = user role)
    const whereClause = { roleId: userRole.id };
    
    // Only add search filter if search term is provided
    if (search && search.trim()) {
      whereClause[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), Op.like, `%${search.toLowerCase()}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), Op.like, `%${search.toLowerCase()}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('phone')), Op.like, `%${search.toLowerCase()}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('firstName')), Op.like, `%${search.toLowerCase()}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('lastName')), Op.like, `%${search.toLowerCase()}%`)
      ];
    }

    // Filter by status if provided
    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    console.log('🔍 getCustomers - whereClause:', JSON.stringify(whereClause, null, 2));

    // Get total count
    const total = await User.count({ where: whereClause });
    console.log('📊 getCustomers - total count:', total);

    // Fetch customers with pagination
    const customers = await User.findAll({
      where: whereClause,
      attributes: [
        'id', 'username', 'email', 'phone', 'firstName', 'lastName',
        'isActive', 'lastLogin', 'isEmailVerified'
      ],
      order: [[Sequelize.literal('"User"."created_at"'), 'DESC']],
      offset,
      limit: validated_limit,
      raw: false  // Keep as Sequelize instances for proper field mapping
    });

    console.log('👥 getCustomers - Sequelize query result count:', customers?.length || 0);
    if (customers && customers.length > 0) {
      const firstCustomer = customers[0];
      console.log('📋 First customer raw:', firstCustomer);
      console.log('📋 First customer JSON:', JSON.stringify(firstCustomer.toJSON?.() || firstCustomer, null, 2));
    }

    // Transform data to match expected frontend format
    const transformedCustomers = customers.map(customer => {
      const customerData = customer.toJSON?.() || customer;
      console.log('🔄 Transforming customer:', customerData.username);
      return {
        _id: customer.id,
        username: customer.username,
        email: customer.email,
        phone: customer.phone || '-',
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: `${customer.firstName} ${customer.lastName}`,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        lastLogin: customer.lastLogin,
        
        // Placeholder data for engagement metrics (stub for now)
        // In production, these would come from MongoDB collections
        totalOrders: 0,
        totalSpent: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        posts: [],
        orders: []
      };
    });

    const pagination = {
      page: parseInt(page),
      limit: validated_limit,
      total,
      totalPages: Math.ceil(total / validated_limit)
    };

    return ApiResponse.paginated(
      res,
      transformedCustomers,
      pagination,
      'Customers retrieved successfully'
    );
  } catch (error) {
    console.error('❌ getCustomers error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🚫 Block / Unblock Customer
 */
exports.blockCustomer = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can block customers');
    }

    const { customerId } = req.params;
    const { reason } = req.body;

    const User = models.User;
    const user = await User.findByIdAndUpdate(customerId, { isActive: false, blockedReason: reason }, { new: true });

    if (!user) {
      return ApiResponse.notFound(res, 'Customer');
    }

    // Log action
    if (models.AdminAuditLog) {
      await models.AdminAuditLog.create({
        adminId: req.user.id,
        action: 'block_customer',
        resourceType: 'User',
        resourceId: customerId,
        details: { reason }
      });
    }

    return ApiResponse.success(res, user, 'Customer blocked successfully');
  } catch (error) {
    console.error('❌ blockCustomer error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🔓 Unblock Customer
 */
exports.unblockCustomer = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can unblock customers');
    }

    const { customerId } = req.params;
    const User = models.User;
    const user = await User.findByIdAndUpdate(customerId, { isActive: true, blockedReason: null }, { new: true });

    if (!user) {
      return ApiResponse.notFound(res, 'Customer');
    }

    if (models.AdminAuditLog) {
      await models.AdminAuditLog.create({
        adminId: req.user.id,
        action: 'unblock_customer',
        resourceType: 'User',
        resourceId: customerId,
        details: {}
      });
    }

    return ApiResponse.success(res, user, 'Customer unblocked successfully');
  } catch (error) {
    console.error('❌ unblockCustomer error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🔑 Reset Customer Password
 */
exports.resetCustomerPassword = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can reset passwords');
    }

    const { customerId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return ApiResponse.error(res, 'New password must be at least 6 characters', 422);
    }

    const bcrypt = require('bcryptjs');
    const User = models.User;
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const user = await User.findByIdAndUpdate(customerId, { passwordHash: hashedPassword }, { new: true });

    if (!user) {
      return ApiResponse.notFound(res, 'Customer');
    }

    if (models.AdminAuditLog) {
      await models.AdminAuditLog.create({
        adminId: req.user.id,
        action: 'reset_password',
        resourceType: 'User',
        resourceId: customerId,
        details: { action: 'password_reset_by_admin' }
      });
    }

    return ApiResponse.success(res, { customerId }, 'Customer password reset successfully');
  } catch (error) {
    console.error('❌ resetCustomerPassword error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 📝 Get Customer's Posts/Reels
 */
exports.getCustomerPosts = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view customer posts');
    }

    const { customerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const Post = models.Post;
    const posts = await Post.find({ user: customerId })
      .skip(offset)
      .limit(validated_limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Post.countDocuments({ user: customerId });

    const pagination = {
      page: parseInt(page),
      limit: validated_limit,
      total,
      totalPages: Math.ceil(total / validated_limit)
    };

    return ApiResponse.paginated(res, posts, pagination, 'Customer posts retrieved');
  } catch (error) {
    console.error('❌ getCustomerPosts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🗑️ Delete Customer's Post (by admin)
 */
exports.deleteCustomerPost = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can delete customer posts');
    }

    const { customerId, postId } = req.params;
    const Post = models.Post;

    const post = await Post.findOneAndDelete({ _id: postId, user: customerId });

    if (!post) {
      return ApiResponse.notFound(res, 'Post');
    }

    if (models.AdminAuditLog) {
      await models.AdminAuditLog.create({
        adminId: req.user.id,
        action: 'delete_post',
        resourceType: 'Post',
        resourceId: postId,
        details: { customerId }
      });
    }

    return ApiResponse.success(res, {}, 'Post deleted successfully');
  } catch (error) {
    console.error('❌ deleteCustomerPost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 📊 Get Customer Activity & Engagement
 */
exports.getCustomerEngagement = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view engagement');
    }

    const { customerId } = req.params;
    const Post = models.Post;

    const user = models.User;
    const userData = await user.findById(customerId).lean();

    if (!userData) {
      return ApiResponse.notFound(res, 'Customer');
    }

    // Aggregate engagement metrics
    const postMetrics = await Post.aggregate([
      { $match: { user: userData._id } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } },
          totalShares: { $sum: { $size: '$shares' } },
          totalViews: { $sum: '$analytics.views' }
        }
      }
    ]);

    const metrics = postMetrics[0] || {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0
    };

    return ApiResponse.success(res, metrics, 'Customer engagement retrieved');
  } catch (error) {
    console.error('❌ getCustomerEngagement error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🏪 Get All Vendors (role='vendor' or 'seller')
 */
exports.getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const User = models.User;
    const Role = models.Role;
    const sequelize = models.sequelize;
    
    // Get vendor/seller role IDs
    const vendorRoles = await Role.findAll({ where: { name: { [Op.in]: ['vendor', 'seller'] } }, attributes: ['id'], raw: true });
    if (vendorRoles.length === 0) {
      return ApiResponse.paginated(res, [], { page: parseInt(page), limit: validated_limit, total: 0, totalPages: 0 }, 'Vendors retrieved successfully');
    }
    const vendorRoleIds = vendorRoles.map(r => r.id);
    
    const whereClause = { roleId: { [Op.in]: vendorRoleIds } };

    if (search) {
      const searchLower = search.toLowerCase();
      whereClause[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), Op.like, `%${searchLower}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), Op.like, `%${searchLower}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('firstName')), Op.like, `%${searchLower}%`)
      ];
    }

    if (status === 'active') whereClause.isActive = true;
    else if (status === 'inactive') whereClause.isActive = false;

    const total = await User.count({ where: whereClause });
    const vendors = await User.findAll({
      where: whereClause,
      attributes: ['id', 'username', 'email', 'phone', 'firstName', 'lastName', 'isActive'],
      order: [[Sequelize.literal('"User"."created_at"'), 'DESC']],
      offset,
      limit: validated_limit
    });

    const transformedVendors = vendors.map(v => ({
      _id: v.id,
      username: v.username,
      email: v.email,
      phone: v.phone,
      firstName: v.firstName,
      lastName: v.lastName,
      storeName: `${v.firstName} ${v.lastName} Store`,
      owner: `${v.firstName} ${v.lastName}`,
      products: 0,
      totalSales: 0,
      rating: 0,
      verified: true,
      isActive: v.isActive,
      createdAt: v.createdAt
    }));

    return ApiResponse.paginated(res, transformedVendors, { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 'Vendors retrieved successfully');
  } catch (error) {
    console.error('❌ getVendors error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🎬 Get All Creators (role='creator')
 */
exports.getCreators = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const User = models.User;
    const Role = models.Role;
    const sequelize = models.sequelize;
    
    // Get creator role ID
    const creatorRole = await Role.findOne({ where: { name: 'creator' }, attributes: ['id'], raw: true });
    if (!creatorRole) {
      return ApiResponse.paginated(res, [], { page: parseInt(page), limit: validated_limit, total: 0, totalPages: 0 }, 'Creators retrieved successfully');
    }
    
    const whereClause = { roleId: creatorRole.id };

    if (search) {
      const searchLower = search.toLowerCase();
      whereClause[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), Op.like, `%${searchLower}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), Op.like, `%${searchLower}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('firstName')), Op.like, `%${searchLower}%`)
      ];
    }

    if (status === 'active') whereClause.isActive = true;
    else if (status === 'inactive') whereClause.isActive = false;

    const total = await User.count({ where: whereClause });
    const creators = await User.findAll({
      where: whereClause,
      attributes: ['id', 'username', 'email', 'phone', 'firstName', 'lastName', 'isActive'],
      order: [[Sequelize.literal('"User"."created_at"'), 'DESC']],
      offset,
      limit: validated_limit
    });

    const transformedCreators = creators.map(c => ({
      _id: c.id,
      username: c.username,
      email: c.email,
      phone: c.phone,
      firstName: c.firstName,
      lastName: c.lastName,
      channelName: `${c.firstName} ${c.lastName}`,
      posts: 0,
      followers: 0,
      engagement: 0,
      isActive: c.isActive,
      createdAt: c.createdAt
    }));

    return ApiResponse.paginated(res, transformedCreators, { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 'Creators retrieved successfully');
  } catch (error) {
    console.error('❌ getCreators error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 👨‍💼 Get All Admins (role='admin' or 'super_admin')
 */
exports.getAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const User = models.User;
    const Role = models.Role;
    const sequelize = models.sequelize;
    
    // Get admin and super_admin role IDs
    const adminRoles = await Role.findAll({ where: { name: { [Op.in]: ['admin', 'super_admin'] } }, attributes: ['id'], raw: true });
    if (adminRoles.length === 0) {
      return ApiResponse.paginated(res, [], { page: parseInt(page), limit: validated_limit, total: 0, totalPages: 0 }, 'Admins retrieved successfully');
    }
    const adminRoleIds = adminRoles.map(r => r.id);
    
    const whereClause = { roleId: { [Op.in]: adminRoleIds } };

    if (search) {
      const searchLower = search.toLowerCase();
      whereClause[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), Op.like, `%${searchLower}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), Op.like, `%${searchLower}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('firstName')), Op.like, `%${searchLower}%`)
      ];
    }

    if (status === 'active') whereClause.isActive = true;
    else if (status === 'inactive') whereClause.isActive = false;

    const total = await User.count({ where: whereClause });
    const admins = await User.findAll({
      where: whereClause,
      attributes: ['id', 'username', 'email', 'phone', 'firstName', 'lastName', 'role', 'isActive'],
      order: [[Sequelize.literal('"User"."created_at"'), 'DESC']],
      offset,
      limit: validated_limit
    });

    const transformedAdmins = admins.map(a => ({
      _id: a.id,
      username: a.username,
      email: a.email,
      phone: a.phone,
      firstName: a.firstName,
      lastName: a.lastName,
      adminName: `${a.firstName} ${a.lastName}`,
      role: a.role,
      isSuperAdmin: a.role === 'super_admin',
      isActive: a.isActive,
      createdAt: a.createdAt
    }));

    return ApiResponse.paginated(res, transformedAdmins, { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 'Admins retrieved successfully');
  } catch (error) {
    console.error('❌ getAdmins error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 📋 Get Activity Logs (admin audit trail)
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, userId, startDate, endDate } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    // Check if AdminAuditLog model exists
    if (!models.AdminAuditLog) {
      return ApiResponse.success(res, { logs: [], pagination: { page: parseInt(page), limit: validated_limit, total: 0, totalPages: 0 } }, 'Activity logs retrieved');
    }

    const AuditLog = models.AdminAuditLog;
    const whereClause = {};

    if (action) whereClause.action = action;
    if (userId) whereClause.adminId = userId;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const total = await AuditLog.count({ where: whereClause });
    const logs = await AuditLog.findAll({
      where: whereClause,
      attributes: ['id', 'adminId', 'action', 'resourceType', 'resourceId', 'details'],
      order: [sequelize.literal('"AuditLog"."created_at" DESC')],
      offset,
      limit: validated_limit
    });

    const transformedLogs = logs.map(log => ({
      _id: log.id,
      adminId: log.adminId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: log.details,
      timestamp: log.createdAt,
      description: `${log.action.toUpperCase()} on ${log.resourceType} (ID: ${log.resourceId})`
    }));

    return ApiResponse.paginated(res, transformedLogs, { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 'Activity logs retrieved successfully');
  } catch (error) {
    console.error('❌ getActivityLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🔑 Get All Available Roles
 */
exports.getRoles = async (req, res) => {
  try {
    if (!models.Role) {
      return ApiResponse.success(res, [], 'Roles retrieved');
    }

    const Role = models.Role;
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']]
    });

    const transformedRoles = roles.map(r => ({
      _id: r.id,
      name: r.name,
      description: r.description || ''
    }));

    return ApiResponse.success(res, transformedRoles, 'Roles retrieved successfully');
  } catch (error) {
    console.error('❌ getRoles error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🏢 Get All Departments
 */
exports.getDepartments = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    if (!models.Department) {
      return ApiResponse.success(res, { departments: [], pagination: { page: parseInt(page), limit: validated_limit, total: 0 } }, 'Departments retrieved');
    }

    const Department = models.Department;
    const total = await Department.count();
    const departments = await Department.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']],
      offset,
      limit: validated_limit
    });

    const transformedDepts = departments.map(d => ({
      _id: d.id,
      name: d.name,
      description: d.description || ''
    }));

    return ApiResponse.paginated(res, transformedDepts, { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 'Departments retrieved successfully');
  } catch (error) {
    console.error('❌ getDepartments error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * ✏️ Update Customer Details
 */
exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can update customers');
    }

    const { customerId } = req.params;
    const { email, phone, firstName, lastName, isActive } = req.body;

    const User = models.User;
    const updates = {};
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (typeof isActive !== 'undefined') updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(customerId, updates, { new: true });

    if (!user) {
      return ApiResponse.notFound(res, 'Customer');
    }

    if (models.AdminAuditLog) {
      await models.AdminAuditLog.create({
        adminId: req.user.id,
        action: 'update_customer',
        resourceType: 'User',
        resourceId: customerId,
        details: updates
      });
    }

    return ApiResponse.success(res, user, 'Customer updated successfully');
  } catch (error) {
    console.error('❌ updateUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * 🗑️ Delete Customer (soft delete)
 */
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can delete customers');
    }

    const { customerId } = req.params;
    const User = models.User;

    // Soft delete: set deletedAt timestamp
    const user = await User.findByIdAndUpdate(customerId, { deletedAt: new Date() }, { new: true });

    if (!user) {
      return ApiResponse.notFound(res, 'Customer');
    }

    if (models.AdminAuditLog) {
      await models.AdminAuditLog.create({
        adminId: req.user.id,
        action: 'delete_customer',
        resourceType: 'User',
        resourceId: customerId,
        details: { action: 'soft_delete' }
      });
    }

    return ApiResponse.success(res, {}, 'Customer deleted successfully');
  } catch (error) {
    console.error('❌ deleteUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getUserStatistics = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view statistics');
    }

    const total_users = await models.User.count();
    const active_users = await models.User.count({ where: { account_status: 'active' } });
    const banned_users = await models.User.count({ where: { account_status: 'banned' } });
    const suspended_users = await models.User.count({ where: { account_status: 'suspended' } });

    const users_by_role = await models.User.findAll({
      attributes: ['role', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true
    });

    const new_users_today = await models.User.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    return ApiResponse.success(res, {
      total_users,
      active_users,
      banned_users,
      suspended_users,
      new_users_today,
      users_by_role
    }, 'User statistics retrieved successfully');
  } catch (error) {
    console.error('❌ getUserStatistics error:', error);
    return ApiResponse.serverError(res, error);
  }
};
