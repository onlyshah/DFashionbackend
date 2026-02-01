/**
 * ============================================================================
 * AUDIT LOG CONTROLLER - PostgreSQL/Sequelize + RBAC
 * ============================================================================
 * Purpose: System-wide activity logging, filtering, analytics (super_admin only)
 * Database: PostgreSQL via Sequelize ORM
 * Access: super_admin role only
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

/**
 * Get audit logs with filtering
 */
exports.getAuditLogs = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view audit logs');
    }

    const { page = 1, limit = 50, admin_id, action, resource_type, resource_id, date_from, date_to } = req.query;
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
    if (resource_id) {
      where.resource_id = resource_id;
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
      include: { model: models.User, attributes: ['id', 'name', 'email', 'role'] },
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
    console.error('❌ getAuditLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Filter by admin user
 */
exports.filterByUser = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can filter audit logs');
    }

    const { admin_id } = req.params;
    const { page = 1, limit = 50, date_from, date_to } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    // Verify admin exists
    const admin = await models.User.findByPk(admin_id);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      return ApiResponse.error(res, 'Invalid admin user ID', 422);
    }

    const where = { admin_id };

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

    return ApiResponse.paginated(res, rows, pagination, `Audit logs for admin ${admin.name} retrieved successfully`);
  } catch (error) {
    console.error('❌ filterByUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Filter by action type
 */
exports.filterByAction = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can filter audit logs');
    }

    const { action } = req.params;
    const { page = 1, limit = 50, date_from, date_to } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = { action };

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

    return ApiResponse.paginated(res, rows, pagination, `Audit logs for action "${action}" retrieved successfully`);
  } catch (error) {
    console.error('❌ filterByAction error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Filter by resource
 */
exports.filterByResource = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can filter audit logs');
    }

    const { resource_type } = req.params;
    const { page = 1, limit = 50, resource_id, date_from, date_to } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = { resource_type };

    if (resource_id) {
      where.resource_id = resource_id;
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

    return ApiResponse.paginated(res, rows, pagination, `Audit logs for resource "${resource_type}" retrieved successfully`);
  } catch (error) {
    console.error('❌ filterByResource error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Export audit logs to CSV/JSON
 */
exports.exportLogs = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can export audit logs');
    }

    const { format = 'json', admin_id, action, resource_type, date_from, date_to } = req.body;

    if (!['json', 'csv'].includes(format)) {
      return ApiResponse.error(res, 'Invalid format. Must be json or csv', 422);
    }

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

    const logs = await models.AdminAuditLog.findAll({
      where,
      include: { model: models.User, attributes: ['id', 'name', 'email'] },
      order: [['createdAt', 'DESC']],
      limit: 100000 // Export limit
    });

    let exported_data;

    if (format === 'json') {
      exported_data = {
        export_time: new Date(),
        total_records: logs.length,
        logs
      };
    } else {
      // CSV format
      const csv_headers = ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource ID', 'Details'];
      const csv_rows = logs.map(log => [
        log.createdAt,
        log.User?.name || 'Unknown',
        log.action,
        log.resource_type,
        log.resource_id,
        JSON.stringify(log.details)
      ]);

      exported_data = {
        headers: csv_headers,
        rows: csv_rows
      };
    }

    // Store export record
    await models.AuditLogExport.create({
      exported_by: req.user.id,
      format,
      total_records: logs.length,
      filters: { admin_id, action, resource_type, date_from, date_to }
    });

    return ApiResponse.success(res, exported_data, `Audit logs exported successfully as ${format}`);
  } catch (error) {
    console.error('❌ exportLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * View system activity statistics
 */
exports.viewSystemActivity = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view system activity');
    }

    const days_back = parseInt(req.query.days) || 7;
    const start_date = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000);

    const total_actions = await models.AdminAuditLog.count({
      where: { createdAt: { [Op.gte]: start_date } }
    });

    const actions_by_type = await models.AdminAuditLog.findAll({
      attributes: ['action', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
      where: { createdAt: { [Op.gte]: start_date } },
      group: ['action'],
      raw: true,
      order: [[models.sequelize.literal('count'), 'DESC']]
    });

    const actions_by_resource = await models.AdminAuditLog.findAll({
      attributes: ['resource_type', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
      where: { createdAt: { [Op.gte]: start_date } },
      group: ['resource_type'],
      raw: true,
      order: [[models.sequelize.literal('count'), 'DESC']]
    });

    const most_active_admins = await models.AdminAuditLog.findAll({
      attributes: [
        'admin_id',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'action_count']
      ],
      where: { createdAt: { [Op.gte]: start_date } },
      include: { model: models.User, attributes: ['id', 'name', 'email'] },
      group: ['admin_id', 'User.id'],
      raw: true,
      order: [[models.sequelize.literal('action_count'), 'DESC']],
      limit: 10
    });

    return ApiResponse.success(res, {
      period_days: days_back,
      period_start: start_date,
      period_end: new Date(),
      total_actions,
      actions_by_type,
      actions_by_resource,
      most_active_admins
    }, 'System activity statistics retrieved successfully');
  } catch (error) {
    console.error('❌ viewSystemActivity error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get action statistics (trending actions)
 */
exports.getActionStats = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view action stats');
    }

    const days = parseInt(req.query.days) || 30;
    const start_date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const action_stats = await models.AdminAuditLog.findAll({
      attributes: [
        'action',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'total'],
        [models.sequelize.literal(`DATE("createdAt")`), 'date']
      ],
      where: { createdAt: { [Op.gte]: start_date } },
      group: ['action', models.sequelize.literal(`DATE("createdAt")`), 'AdminAuditLog.created_at'],
      raw: true,
      order: [[models.sequelize.literal(`DATE("createdAt")`), 'DESC'], ['action', 'ASC']]
    });

    return ApiResponse.success(res, {
      period_days: days,
      statistics: action_stats
    }, 'Action statistics retrieved successfully');
  } catch (error) {
    console.error('❌ getActionStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};