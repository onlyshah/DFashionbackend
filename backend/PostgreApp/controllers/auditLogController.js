/**
 * Audit Log Controller - PostgreSQL/Sequelize Version
 * System-wide activity logging and RBAC audit trails
 * Methods: 7
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');

exports.getAuditLogs = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view audit logs');
    }

    const { page = 1, limit = 50, admin_id, action, resource_type } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);
    const where = {};
    if (admin_id) where.admin_id = admin_id;
    if (action) where.action = action;
    if (resource_type) where.resource_type = resource_type;

    const { count, rows } = await models.AdminAuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: validated_limit,
      offset
    });

    return ApiResponse.paginated(res, rows, page, limit, count, 'Audit logs retrieved');
  } catch (error) {
    console.error('❌ getAuditLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.filterByUser = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can filter');
    }

    const { admin_id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const { count, rows } = await models.AdminAuditLog.findAndCountAll({
      where: { admin_id },
      order: [['createdAt', 'DESC']],
      limit: validated_limit,
      offset
    });

    return ApiResponse.paginated(res, rows, page, limit, count, 'Logs filtered by user');
  } catch (error) {
    console.error('❌ filterByUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.filterByAction = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can filter');
    }

    const { action } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const { count, rows } = await models.AdminAuditLog.findAndCountAll({
      where: { action },
      order: [['createdAt', 'DESC']],
      limit: validated_limit,
      offset
    });

    return ApiResponse.paginated(res, rows, page, limit, count, 'Logs filtered by action');
  } catch (error) {
    console.error('❌ filterByAction error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getLogById = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view');
    }

    const { logId } = req.params;
    const log = await models.AdminAuditLog.findByPk(logId);
    return log ? ApiResponse.success(res, log, 'Log retrieved') : ApiResponse.notFound(res, 'Log');
  } catch (error) {
    console.error('❌ getLogById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteLog = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can delete');
    }

    const { logId } = req.params;
    const log = await models.AdminAuditLog.findByPk(logId);
    if (!log) return ApiResponse.notFound(res, 'Log');
    await log.destroy();
    return ApiResponse.success(res, {}, 'Log deleted');
  } catch (error) {
    console.error('❌ deleteLog error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.exportLogs = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can export');
    }

    const logs = await models.AdminAuditLog.findAll({ order: [['createdAt', 'DESC']] });
    return ApiResponse.success(res, logs, 'Logs exported');
  } catch (error) {
    console.error('❌ exportLogs error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getLogStats = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view stats');
    }

    const total = await models.AdminAuditLog.count();
    const today = await models.AdminAuditLog.count({ where: { createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } });
    return ApiResponse.success(res, { total, today }, 'Stats retrieved');
  } catch (error) {
    console.error('❌ getLogStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};


