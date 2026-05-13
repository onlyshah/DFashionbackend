/**
 * ============================================================================
 * USERS ADMIN CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: User management, moderation, activity logs (admin tier)
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 25
 */

const { Op, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');

const USER_ROLES = ['user', 'admin', 'vendor', 'creator'];
const USER_STATUSES = ['active', 'suspended', 'banned', 'inactive'];

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view all users');
    }

    const { page = 1, limit = 20, role, status, search, department, created_after } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    const filters = [], vals = [];
    let i = 1;
    if (role && USER_ROLES.includes(role)) { filters.push(`role = $${i++}`); vals.push(role); }
    if (status && USER_STATUSES.includes(status)) { filters.push(`account_status = $${i++}`); vals.push(status); }
    if (department) { filters.push(`department = $${i++}`); vals.push(department); }
    if (created_after) { filters.push(`created_at >= $${i++}`); vals.push(new Date(created_after)); }
    if (search) { filters.push(`(name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i})`); vals.push(`%${search}%`); i++; }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rowsQuery = `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    vals.push(validated_limit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const rowsRes = await client.query(rowsQuery, vals);
    const countRes = await client.query(countQuery, vals.slice(0, vals.length - 2));
    await client.end();

    const count = parseInt(countRes.rows[0].total || 0);
    return ApiResponse.paginated(res, rowsRes.rows, 
      { page: parseInt(page), limit: validated_limit, total: count, totalPages: Math.ceil(count / validated_limit) }, 
      'Users retrieved successfully');
  } catch (error) {
    console.error('❌ getAllUsers error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view user details');
    }

    const { user_id } = req.params;
    const user = await models.User.findByPk(user_id, { attributes: { exclude: ['password'] } });
    if (!user) return ApiResponse.notFound(res, 'User');
    return ApiResponse.success(res, user, 'User details retrieved successfully');
  } catch (error) {
    console.error('❌ getUserById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can search users');
    }

    const { q, page = 1, limit = 20, role, status } = req.query;
    if (!q || q.length < 2) return ApiResponse.error(res, 'Search query must be at least 2 characters', 422);

    const { limit: validated_limit, offset } = validatePagination(page, limit);
    const where = { [Op.or]: [{ name: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }, { phone: { [Op.iLike]: `%${q}%` } }] };

    if (role && USER_ROLES.includes(role)) where.role = role;
    if (status && USER_STATUSES.includes(status)) where.account_status = status;

    const { count, rows } = await models.User.findAndCountAll({
      where, attributes: { exclude: ['password'] }, order: [['created_at', 'DESC']], limit: validated_limit, offset, distinct: true
    });

    return ApiResponse.paginated(res, rows, 
      { page: parseInt(page), limit: validated_limit, total: count, totalPages: Math.ceil(count / validated_limit) }, 
      'Users search results');
  } catch (error) {
    console.error('❌ searchUsers error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Ban user
exports.banUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can ban users');
    }

    const { user_id } = req.params;
    const { reason, duration_days } = req.body;
    if (!reason) return ApiResponse.error(res, 'Ban reason is required', 422);

    const user = await models.User.findByPk(user_id);
    if (!user) return ApiResponse.notFound(res, 'User');
    if (user_id == req.user.id) return ApiResponse.error(res, 'Cannot ban yourself', 422);

    const ban_until = duration_days ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000) : null;
    const t = await models.sequelize.transaction();

    try {
      await user.update({
        account_status: 'banned', ban_reason: reason, ban_until, banned_at: new Date(), banned_by: req.user.id
      }, { transaction: t });

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: 'ban_user', resource_type: 'User', resource_id: user_id, details: { reason, duration_days }
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { user_id, status: 'banned', ban_until }, 'User banned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ banUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Suspend user
exports.suspendUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can suspend users');
    }

    const { user_id } = req.params;
    const { reason, duration_days } = req.body;
    if (!reason) return ApiResponse.error(res, 'Suspension reason is required', 422);

    const user = await models.User.findByPk(user_id);
    if (!user) return ApiResponse.notFound(res, 'User');

    const suspend_until = duration_days ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000) : null;
    const t = await models.sequelize.transaction();

    try {
      await user.update({
        account_status: 'suspended', suspension_reason: reason, suspend_until, suspended_at: new Date(), suspended_by: req.user.id
      }, { transaction: t });

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: 'suspend_user', resource_type: 'User', resource_id: user_id, details: { reason, duration_days }
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { user_id, status: 'suspended', suspend_until }, 'User suspended successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ suspendUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Verify user
exports.verifyUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can verify users');
    }

    const { user_id } = req.params;
    const user = await models.User.findByPk(user_id);
    if (!user) return ApiResponse.notFound(res, 'User');
    if (user.email_verified) return ApiResponse.error(res, 'User email is already verified', 409);

    await user.update({ email_verified: true, email_verified_at: new Date() });
    return ApiResponse.success(res, { user_id, email_verified: true }, 'User email verified successfully');
  } catch (error) {
    console.error('❌ verifyUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Unban user
exports.unbanUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can unban users');
    }

    const { user_id } = req.params;
    const user = await models.User.findByPk(user_id);
    if (!user) return ApiResponse.notFound(res, 'User');

    const t = await models.sequelize.transaction();
    try {
      await user.update({
        account_status: 'active', ban_reason: null, ban_until: null, banned_at: null, banned_by: null, 
        suspension_reason: null, suspend_until: null, suspended_at: null, suspended_by: null
      }, { transaction: t });

      if (models.AdminAuditLog) {
        await models.AdminAuditLog.create({
          admin_id: req.user.id, action: 'unban_user', resource_type: 'User', resource_id: user_id, details: {}
        }, { transaction: t });
      }

      await t.commit();
      return ApiResponse.success(res, { user_id, status: 'active' }, 'User unbanned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ unbanUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get user activity logs
exports.getUserActivityLogs = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view activity logs');
    }

    const { user_id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const user = await models.User.findByPk(user_id);
    if (!user) return ApiResponse.notFound(res, 'User');

    const { limit: validated_limit, offset } = validatePagination(page, limit);
    const { count, rows } = await models.UserActivityLog.findAndCountAll({
      where: { user_id }, order: [['created_at', 'DESC']], limit: validated_limit, offset, distinct: true
    });

    return ApiResponse.paginated(res, rows, 
      { page: parseInt(page), limit: validated_limit, total: count, totalPages: Math.ceil(count / validated_limit) }, 
      'User activity logs retrieved successfully');
  } catch (error) {
    console.error('❌ getUserActivityLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Bulk user actions
exports.bulkUserActions = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can perform bulk actions');
    }

    const { user_ids, action, reason } = req.body;
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return ApiResponse.error(res, 'user_ids array is required', 422);
    }
    if (!['ban', 'suspend', 'unban', 'verify'].includes(action)) {
      return ApiResponse.error(res, 'Invalid action', 422);
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
          Object.assign(updates, { account_status: 'active', ban_reason: null, ban_until: null, suspended_at: null, suspended_by: null });
          break;
        case 'verify':
          updates.email_verified = true;
          updates.email_verified_at = new Date();
          break;
      }

      await models.User.update(updates, { where: { id: { [Op.in]: user_ids } }, transaction: t });

      for (const uid of user_ids) {
        if (models.AdminAuditLog) {
          await models.AdminAuditLog.create({
            admin_id: req.user.id, action: `bulk_${action}`, resource_type: 'User', resource_id: uid, details: { reason }
          }, { transaction: t });
        }
      }

      await t.commit();
      return ApiResponse.success(res, { action, affected_users: user_ids.length }, `Bulk ${action} completed successfully`);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ bulkUserActions error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get customers
exports.getCustomers = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view customers');
    }

    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const whereClause = { role: 'user' };
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status === 'active') whereClause.is_active = true;
    else if (status === 'inactive') whereClause.is_active = false;

    const total = await models.User.count({ where: whereClause });
    const customers = await models.User.findAll({
      where: whereClause,
      attributes: ['id', 'username', 'email', 'phone', 'firstName', 'lastName', 'is_active'],
      offset, limit: validated_limit, order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, customers, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 
      'Customers retrieved successfully');
  } catch (error) {
    console.error('❌ getCustomers error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Block customer
exports.blockCustomer = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can block customers');
    }

    const { customerId } = req.params;
    const { reason } = req.body;
    const user = await models.User.findByPk(customerId);
    if (!user) return ApiResponse.notFound(res, 'Customer');

    await user.update({ is_active: false, blocked_reason: reason });
    return ApiResponse.success(res, user, 'Customer blocked successfully');
  } catch (error) {
    console.error('❌ blockCustomer error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Unblock customer
exports.unblockCustomer = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can unblock customers');
    }

    const { customerId } = req.params;
    const user = await models.User.findByPk(customerId);
    if (!user) return ApiResponse.notFound(res, 'Customer');

    await user.update({ is_active: true, blocked_reason: null });
    return ApiResponse.success(res, user, 'Customer unblocked successfully');
  } catch (error) {
    console.error('❌ unblockCustomer error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Reset customer password
exports.resetCustomerPassword = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can reset passwords');
    }

    const { customerId } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return ApiResponse.error(res, 'New password must be at least 6 characters', 422);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const user = await models.User.findByPk(customerId);
    if (!user) return ApiResponse.notFound(res, 'Customer');

    await user.update({ password_hash: hashedPassword });
    return ApiResponse.success(res, { customerId }, 'Customer password reset successfully');
  } catch (error) {
    console.error('❌ resetCustomerPassword error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get customer posts
exports.getCustomerPosts = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view customer posts');
    }

    const { customerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    // PostgreSQL version: use models.Post with user_id filter
    const { count, rows } = await models.Post.findAndCountAll({
      where: { user_id: customerId },
      offset, limit: validated_limit, order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, rows, 
      { page: parseInt(page), limit: validated_limit, total: count, totalPages: Math.ceil(count / validated_limit) }, 
      'Customer posts retrieved');
  } catch (error) {
    console.error('❌ getCustomerPosts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Delete customer post
exports.deleteCustomerPost = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can delete customer posts');
    }

    const { customerId, postId } = req.params;
    const post = await models.Post.destroy({ where: { id: postId, user_id: customerId } });

    if (!post) return ApiResponse.notFound(res, 'Post');
    return ApiResponse.success(res, {}, 'Post deleted successfully');
  } catch (error) {
    console.error('❌ deleteCustomerPost error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get customer engagement
exports.getCustomerEngagement = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view engagement');
    }

    const { customerId } = req.params;
    const user = await models.User.findByPk(customerId);
    if (!user) return ApiResponse.notFound(res, 'Customer');

    // Return engagement stub for PostgreSQL
    return ApiResponse.success(res, {
      totalPosts: 0, totalLikes: 0, totalComments: 0, totalShares: 0, totalViews: 0
    }, 'Customer engagement retrieved');
  } catch (error) {
    console.error('❌ getCustomerEngagement error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get vendors
exports.getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const whereClause = { role: { [Op.in]: ['vendor', 'seller'] } };
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status === 'active') whereClause.is_active = true;
    else if (status === 'inactive') whereClause.is_active = false;

    const total = await models.User.count({ where: whereClause });
    const vendors = await models.User.findAll({
      where: whereClause, attributes: ['id', 'username', 'email', 'phone', 'firstName', 'lastName', 'is_active'],
      offset, limit: validated_limit, order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, vendors, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 
      'Vendors retrieved successfully');
  } catch (error) {
    console.error('❌ getVendors error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get creators
exports.getCreators = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const whereClause = { role: { [Op.in]: ['creator', 'user', 'vendor', 'admin'] } };
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status === 'active') whereClause.is_active = true;

    const total = await models.User.count({ where: whereClause });
    const creators = await models.User.findAll({
      where: whereClause, attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'is_active'],
      offset, limit: validated_limit, order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, creators, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 
      'Creators retrieved successfully');
  } catch (error) {
    console.error('❌ getCreators error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get admins
exports.getAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const whereClause = { role: { [Op.in]: ['admin', 'super_admin'] } };
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status === 'active') whereClause.is_active = true;

    const total = await models.User.count({ where: whereClause });
    const admins = await models.User.findAll({
      where: whereClause, attributes: ['id', 'username', 'email', 'role', 'is_active'],
      offset, limit: validated_limit, order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, admins, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 
      'Admins retrieved successfully');
  } catch (error) {
    console.error('❌ getAdmins error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, userId } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const whereClause = {};
    if (action) whereClause.action = action;
    if (userId) whereClause.admin_id = userId;

    const AuditLog = models.AuditLog || models.AdminAuditLog;
    if (!AuditLog) {
      return ApiResponse.paginated(res, [], 
        { page: parseInt(page), limit: validated_limit, total: 0, totalPages: 0 }, 
        'Activity logs model not available');
    }

    const total = await AuditLog.count({ where: whereClause });
    const logs = await AuditLog.findAll({
      where: whereClause, attributes: ['id', 'admin_id', 'action', 'resource_type', 'resource_id', 'details', 'created_at'],
      offset, limit: validated_limit, order: [['created_at', 'DESC']]
    });

    return ApiResponse.paginated(res, logs, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 
      'Activity logs retrieved successfully');
  } catch (error) {
    console.error('❌ getActivityLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await models.Role.findAll({ attributes: ['id', 'name', 'description'], order: [['name', 'ASC']] });
    return ApiResponse.success(res, roles, 'Roles retrieved successfully');
  } catch (error) {
    console.error('❌ getRoles error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get departments
exports.getDepartments = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    if (!models.Department) {
      return ApiResponse.success(res, { departments: [], pagination: { total: 0 } }, 'Departments retrieved');
    }

    const total = await models.Department.count();
    const departments = await models.Department.findAll({
      attributes: ['id', 'name', 'description'], offset, limit: validated_limit, order: [['name', 'ASC']]
    });

    return ApiResponse.paginated(res, departments, 
      { page: parseInt(page), limit: validated_limit, total, totalPages: Math.ceil(total / validated_limit) }, 
      'Departments retrieved successfully');
  } catch (error) {
    console.error('❌ getDepartments error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can update users');
    }

    const { customerId } = req.params;
    const { email, phone, firstName, lastName, isActive } = req.body;

    const updates = {};
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (typeof isActive !== 'undefined') updates.is_active = isActive;

    const [updated] = await models.User.update(updates, { where: { id: customerId } });
    if (!updated) return ApiResponse.notFound(res, 'Customer');

    const user = await models.User.findByPk(customerId);
    return ApiResponse.success(res, user, 'Customer updated successfully');
  } catch (error) {
    console.error('❌ updateUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can delete users');
    }

    const { customerId } = req.params;
    const destroyed = await models.User.destroy({ where: { id: customerId } });
    if (!destroyed) return ApiResponse.notFound(res, 'Customer');

    return ApiResponse.success(res, {}, 'Customer deleted successfully');
  } catch (error) {
    console.error('❌ deleteUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// Get user statistics
exports.getUserStatistics = async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view statistics');
    }

    const total_users = await models.User.count();
    const active_users = await models.User.count({ where: { account_status: 'active' } });
    const banned_users = await models.User.count({ where: { account_status: 'banned' } });
    const suspended_users = await models.User.count({ where: { account_status: 'suspended' } });

    const users_by_role = await models.User.findAll({
      attributes: ['role', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
      group: ['role'], raw: true
    });

    return ApiResponse.success(res, {
      total_users, active_users, banned_users, suspended_users, users_by_role
    }, 'User statistics retrieved successfully');
  } catch (error) {
    console.error('❌ getUserStatistics error:', error);
    return ApiResponse.serverError(res, error);
  }
};


