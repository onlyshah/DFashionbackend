/**
 * ============================================================================
 * SOCIAL ADMIN CONTROLLER - PostgreSQL/Sequelize + RBAC
 * ============================================================================
 * Purpose: Content moderation, flagging, user bans for social features
 * Database: PostgreSQL via Sequelize ORM
 * Access: Admin and super_admin roles only
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

// Constants
const CONTENT_TYPES = ['post', 'reel', 'story', 'comment', 'profile'];
const REPORT_REASONS = ['spam', 'offensive', 'nudity', 'violence', 'harassment', 'misleading', 'copyright', 'other'];
const REPORT_STATUSES = ['pending', 'reviewed', 'approved', 'rejected'];
const MODERATION_ACTIONS = ['approve', 'reject', 'remove', 'shadowban', 'ban_user', 'warn_user'];

/**
 * Get reported content (admin moderation queue)
 */
exports.getReportedContent = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view reported content');
    }

    const { page = 1, limit = 20, status = 'pending', reason, content_type } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = {};
    if (REPORT_STATUSES.includes(status)) {
      where.status = status;
    }
    if (REPORT_REASONS.includes(reason)) {
      where.report_reason = reason;
    }
    if (CONTENT_TYPES.includes(content_type)) {
      where.content_type = content_type;
    }

    const { count, rows } = await models.ContentReport.findAndCountAll({
      where,
      include: [
        { model: models.User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: models.User, as: 'content_owner', attributes: ['id', 'name', 'email'] }
      ],
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

    return ApiResponse.paginated(res, rows, pagination, 'Reported content retrieved successfully');
  } catch (error) {
    console.error('❌ getReportedContent error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get reported content details
 */
exports.getReportDetails = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view report details');
    }

    const { report_id } = req.params;

    const report = await models.ContentReport.findByPk(report_id, {
      include: [
        { model: models.User, as: 'reporter', attributes: ['id', 'name', 'email', 'account_status'] },
        { model: models.User, as: 'content_owner', attributes: ['id', 'name', 'email', 'account_status'] }
      ]
    });

    if (!report) {
      return ApiResponse.notFound(res, 'Report');
    }

    return ApiResponse.success(res, report, 'Report details retrieved successfully');
  } catch (error) {
    console.error('❌ getReportDetails error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Approve reported content (take no action)
 */
exports.approveContent = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can approve content');
    }

    const { report_id } = req.params;
    const { notes } = req.body;

    const report = await models.ContentReport.findByPk(report_id);
    if (!report) {
      return ApiResponse.notFound(res, 'Report');
    }

    const t = await models.sequelize.transaction();
    try {
      await report.update({
        status: 'approved',
        moderation_action: 'approved',
        moderator_id: req.user.id,
        moderation_notes: notes,
        reviewed_at: new Date()
      }, { transaction: t });

      // Log action
      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'approve_content',
        resource_type: 'ContentReport',
        resource_id: report_id,
        details: { notes }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        report_id,
        status: 'approved',
        action: 'approved'
      }, 'Content approved successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ approveContent error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete reported content
 */
exports.deleteContent = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can delete content');
    }

    const { report_id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'Deletion reason is required', 422);
    }

    const report = await models.ContentReport.findByPk(report_id);
    if (!report) {
      return ApiResponse.notFound(res, 'Report');
    }

    const t = await models.sequelize.transaction();
    try {
      // Mark content as deleted
      let ContentModel;
      switch (report.content_type) {
        case 'post':
          ContentModel = models.Post;
          break;
        case 'reel':
          ContentModel = models.Reel;
          break;
        case 'story':
          ContentModel = models.Story;
          break;
        case 'comment':
          ContentModel = models.Comment;
          break;
        default:
          throw new Error('Unknown content type');
      }

      await ContentModel.update({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: req.user.id,
        deletion_reason: reason
      }, {
        where: { id: report.content_id },
        transaction: t
      });

      // Update report
      await report.update({
        status: 'approved',
        moderation_action: 'removed',
        moderator_id: req.user.id,
        moderation_notes: reason,
        reviewed_at: new Date()
      }, { transaction: t });

      // Log action
      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'delete_content',
        resource_type: report.content_type,
        resource_id: report.content_id,
        details: { reason }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        report_id,
        content_id: report.content_id,
        content_type: report.content_type,
        status: 'deleted'
      }, 'Content deleted successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ deleteContent error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Shadowban user (hide content from public, but user can still post)
 */
exports.shadowbanUser = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can shadowban users');
    }

    const { user_id } = req.params;
    const { reason, duration_days } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'Shadowban reason is required', 422);
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const shadowban_until = duration_days ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000) : null;

    const t = await models.sequelize.transaction();
    try {
      // Create shadowban record
      await models.UserShadowban.create({
        user_id,
        reason,
        shadowban_until,
        created_by: req.user.id,
        is_active: true
      }, { transaction: t });

      // Log action
      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'shadowban_user',
        resource_type: 'User',
        resource_id: user_id,
        details: { reason, duration_days }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        user_id,
        shadowban_until,
        status: 'shadowbanned'
      }, 'User shadowbanned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ shadowbanUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Ban user for content violations
 */
exports.banUser = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can ban users');
    }

    const { user_id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'Ban reason is required', 422);
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const t = await models.sequelize.transaction();
    try {
      await user.update({
        account_status: 'banned',
        ban_reason: reason,
        banned_at: new Date(),
        banned_by: req.user.id
      }, { transaction: t });

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'ban_user',
        resource_type: 'User',
        resource_id: user_id,
        details: { reason }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        user_id,
        status: 'banned'
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
 * Warn user for content violations
 */
exports.warnUser = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can warn users');
    }

    const { user_id } = req.params;
    const { reason, violation_type } = req.body;

    if (!reason) {
      return ApiResponse.error(res, 'Warning reason is required', 422);
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const t = await models.sequelize.transaction();
    try {
      // Check existing warnings
      const warning_count = await models.UserWarning.count({
        where: {
          user_id,
          created_at: { [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
        }
      });

      await models.UserWarning.create({
        user_id,
        reason,
        violation_type,
        warning_number: warning_count + 1,
        created_by: req.user.id
      }, { transaction: t });

      // Auto-suspend if 3 warnings in 90 days
      if (warning_count + 1 >= 3) {
        await user.update({
          account_status: 'suspended',
          suspension_reason: 'Multiple content violations'
        }, { transaction: t });
      }

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'warn_user',
        resource_type: 'User',
        resource_id: user_id,
        details: { reason, violation_type, warning_count: warning_count + 1 }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        user_id,
        warning_number: warning_count + 1,
        auto_suspended: warning_count + 1 >= 3
      }, 'User warned successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ warnUser error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Manage hashtag filters (ban specific hashtags)
 */
exports.manageBannedHashtags = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can manage hashtags');
    }

    const { action, hashtags } = req.body;

    if (!['add', 'remove'].includes(action) || !Array.isArray(hashtags)) {
      return ApiResponse.error(res, 'Invalid request. action must be add/remove, hashtags must be array', 422);
    }

    const t = await models.sequelize.transaction();
    try {
      if (action === 'add') {
        for (const tag of hashtags) {
          await models.BannedHashtag.findOrCreate({
            where: { hashtag: tag.toLowerCase() },
            defaults: { reason: 'Admin action', created_by: req.user.id }
          });
        }
      } else {
        await models.BannedHashtag.destroy({
          where: { hashtag: { [Op.in]: hashtags.map(t => t.toLowerCase()) } },
          transaction: t
        });
      }

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: `${action}_banned_hashtags`,
        resource_type: 'BannedHashtag',
        resource_id: null,
        details: { hashtags, count: hashtags.length }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        action,
        hashtags_count: hashtags.length
      }, `Hashtags ${action}ed successfully`);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ manageBannedHashtags error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get content moderation statistics
 */
exports.getAllPosts = async (req, res) => {
  return ApiResponse.success(res, [], 'Posts retrieved');
};

exports.getPostById = async (req, res) => {
  return ApiResponse.success(res, {}, 'Post retrieved');
};

exports.updatePost = async (req, res) => {
  return ApiResponse.success(res, {}, 'Post updated');
};

exports.deletePost = async (req, res) => {
  return ApiResponse.success(res, {}, 'Post deleted');
};

exports.getAllReels = async (req, res) => {
  return ApiResponse.success(res, [], 'Reels retrieved');
};

exports.getReelById = async (req, res) => {
  return ApiResponse.success(res, {}, 'Reel retrieved');
};

exports.updateReel = async (req, res) => {
  return ApiResponse.success(res, {}, 'Reel updated');
};

exports.deleteReel = async (req, res) => {
  return ApiResponse.success(res, {}, 'Reel deleted');
};

exports.getModerationStats = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view moderation stats');
    }

    const total_reports = await models.ContentReport.count();
    const pending_reports = await models.ContentReport.count({ where: { status: 'pending' } });
    const approved_reports = await models.ContentReport.count({ where: { status: 'approved' } });

    const reports_by_reason = await models.ContentReport.findAll({
      attributes: ['report_reason', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
      group: ['report_reason'],
      raw: true
    });

    const reports_by_content_type = await models.ContentReport.findAll({
      attributes: ['content_type', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
      group: ['content_type'],
      raw: true
    });

    const banned_users = await models.User.count({ where: { account_status: 'banned' } });
    const shadowbanned_users = await models.UserShadowban.count({ where: { is_active: true } });

    return ApiResponse.success(res, {
      total_reports,
      pending_reports,
      approved_reports,
      banned_users,
      shadowbanned_users,
      reports_by_reason,
      reports_by_content_type
    }, 'Moderation statistics retrieved successfully');
  } catch (error) {
    console.error('❌ getModerationStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};
