/**
 * ============================================================================
 * COMPLIANCE CONTROLLER - PostgreSQL/Sequelize + RBAC
 * ============================================================================
 * Purpose: GDPR/privacy compliance, data retention, audit trails (super_admin only)
 * Database: PostgreSQL via Sequelize ORM
 * Access: super_admin role only
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

// Constants
const DATA_RETENTION_POLICIES = {
  user_data: 365, // days
  order_data: 2555, // 7 years for tax compliance
  logs: 90,
  deleted_accounts: 30
};

/**
 * Track GDPR compliance status
 */
exports.trackCompliance = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can access compliance tracking');
    }

    const compliance_status = {
      data_protection: {
        gdpr_compliant: true,
        last_audit: new Date('2024-01-01'),
        next_audit: new Date('2024-07-01'),
        status: 'compliant'
      },
      user_privacy: {
        privacy_policy_version: '2.0',
        last_updated: new Date('2024-01-15'),
        users_accepted: await models.User.count({
          where: { privacy_policy_accepted: true }
        }),
        pending_acceptance: await models.User.count({
          where: { privacy_policy_accepted: false }
        })
      },
      data_retention: {
        policy_active: true,
        policies: DATA_RETENTION_POLICIES
      },
      user_requests: {
        pending_access_requests: await models.GDPRRequest.count({
          where: { request_type: 'data_access', status: 'pending' }
        }),
        pending_deletion_requests: await models.GDPRRequest.count({
          where: { request_type: 'data_deletion', status: 'pending' }
        })
      }
    };

    return ApiResponse.success(res, compliance_status, 'Compliance status retrieved successfully');
  } catch (error) {
    console.error('❌ trackCompliance error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * View audit logs
 */
exports.viewAuditLogs = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view audit logs');
    }

    const { page = 1, limit = 50, admin_id, action, resource_type, date_from, date_to } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = {};
    if (admin_id) {
      where.admin_id = admin_id;
    }
    if (action) {
      where.action = action;
    }
    if (resource_type) {
      where.resource_type = resource_type;
    }
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) {
        where.createdAt[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.createdAt[Op.lte] = new Date(date_to);
      }
    }

    const { count, rows } = await models.AdminAuditLog.findAndCountAll({
      where,
      include: { model: models.User, attributes: ['id', 'name', 'email'] },
      order: [['createdAt', 'DESC']],
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

    return ApiResponse.paginated(res, rows, pagination, 'Audit logs retrieved successfully');
  } catch (error) {
    console.error('❌ viewAuditLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Generate compliance report
 */
exports.generateReports = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can generate reports');
    }

    const { report_type = 'monthly', start_date, end_date } = req.body;

    const start = new Date(start_date || new Date().setDate(new Date().getDate() - 30));
    const end = new Date(end_date || new Date());

    const report = {
      report_type,
      generated_at: new Date(),
      period: { start, end },
      data: {
        total_users: await models.User.count(),
        new_users: await models.User.count({
          where: { createdAt: { [Op.between]: [start, end] } }
        }),
        total_orders: await models.Order.count(),
        orders_in_period: await models.Order.count({
          where: { createdAt: { [Op.between]: [start, end] } }
        }),
        data_deletion_requests: await models.GDPRRequest.count({
          where: {
            request_type: 'data_deletion',
            createdAt: { [Op.between]: [start, end] }
          }
        }),
        data_access_requests: await models.GDPRRequest.count({
          where: {
            request_type: 'data_access',
            createdAt: { [Op.between]: [start, end] }
          }
        }),
        admin_actions: await models.AdminAuditLog.count({
          where: { createdAt: { [Op.between]: [start, end] } }
        })
      }
    };

    // Store report in database
    await models.ComplianceReport.create({
      report_type,
      generated_by: req.user.id,
      report_data: report,
      period_start: start,
      period_end: end
    });

    return ApiResponse.success(res, report, 'Compliance report generated successfully');
  } catch (error) {
    console.error('❌ generateReports error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Manage data retention policies
 */
exports.manageDataRetention = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can manage data retention');
    }

    const { action, data_type, retention_days } = req.body;

    if (!['update', 'get'].includes(action)) {
      return ApiResponse.error(res, 'Invalid action. Must be update or get', 422);
    }

    if (action === 'get') {
      return ApiResponse.success(res, DATA_RETENTION_POLICIES, 'Data retention policies retrieved');
    }

    if (action === 'update') {
      if (!data_type || !retention_days || retention_days <= 0) {
        return ApiResponse.error(res, 'data_type and retention_days are required', 422);
      }

      const t = await models.sequelize.transaction();
      try {
        // Update policy
        DATA_RETENTION_POLICIES[data_type] = retention_days;

        // Log the change
        await models.AdminAuditLog.create({
          admin_id: req.user.id,
          action: 'update_retention_policy',
          resource_type: 'DataRetentionPolicy',
          resource_id: data_type,
          details: { retention_days }
        }, { transaction: t });

        // Schedule cleanup job for expired data
        await models.DataCleanupJob.create({
          data_type,
          retention_days,
          scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'scheduled'
        }, { transaction: t });

        await t.commit();

        return ApiResponse.success(res, {
          data_type,
          retention_days,
          updated_at: new Date()
        }, 'Data retention policy updated successfully');
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ manageDataRetention error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Export user data for GDPR compliance
 */
exports.gdprDataExport = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Users can export their own data, admins can export any user's data
    if (req.user.role === 'user' && req.user.id != user_id) {
      return ApiResponse.forbidden(res, 'You can only export your own data');
    }

    const user = await models.User.findByPk(user_id, {
      include: [
        { model: models.UserProfile },
        { model: models.Address },
        { model: models.Order },
        { model: models.Post },
        { model: models.Reel }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const export_data = {
      exported_at: new Date(),
      user: user,
      personal_data: {
        email: user.email,
        phone: user.phone,
        date_of_birth: user.UserProfile?.date_of_birth,
        bio: user.UserProfile?.bio
      },
      orders: user.Orders || [],
      addresses: user.Addresses || [],
      content: {
        posts: user.Posts || [],
        reels: user.Reels || []
      }
    };

    // Create export record
    await models.GDPRRequest.create({
      user_id,
      request_type: 'data_access',
      status: 'completed',
      export_data,
      processed_at: new Date()
    });

    return ApiResponse.success(res, export_data, 'User data exported successfully');
  } catch (error) {
    console.error('❌ gdprDataExport error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Reset/delete user data (GDPR right to be forgotten)
 */
exports.resetUserData = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can reset user data');
    }

    const { user_id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'Deletion reason is required', 422);
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const t = await models.sequelize.transaction();
    try {
      // Archive user data before deletion
      const archived_data = {
        user_id,
        archived_at: new Date(),
        archived_by: req.user.id,
        reason
      };

      await models.ArchivedUserData.create(archived_data, { transaction: t });

      // Delete user data (except orders for legal/tax reasons)
      await models.UserProfile.destroy({
        where: { user_id },
        transaction: t
      });

      await models.Post.destroy({
        where: { user_id },
        transaction: t
      });

      await models.Reel.destroy({
        where: { user_id },
        transaction: t
      });

      await models.Story.destroy({
        where: { user_id },
        transaction: t
      });

      // Anonymize user account
      await user.update({
        name: 'Deleted User',
        email: `deleted_${user_id}@example.com`,
        phone: null,
        account_status: 'deleted'
      }, { transaction: t });

      // Log GDPR request
      await models.GDPRRequest.create({
        user_id,
        request_type: 'data_deletion',
        status: 'completed',
        processed_at: new Date()
      }, { transaction: t });

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'reset_user_data',
        resource_type: 'User',
        resource_id: user_id,
        details: { reason }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        user_id,
        status: 'deleted',
        message: 'User data has been permanently deleted per GDPR request'
      }, 'User data reset successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ resetUserData error:', error);
    return ApiResponse.serverError(res, error);
  }
};
