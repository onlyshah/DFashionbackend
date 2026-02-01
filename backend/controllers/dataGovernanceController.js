/**
 * ============================================================================
 * DATA GOVERNANCE CONTROLLER - PostgreSQL/Sequelize + RBAC
 * ============================================================================
 * Purpose: Data privacy, retention policies, consent tracking (super_admin only)
 * Database: PostgreSQL via Sequelize ORM
 * Access: super_admin role only
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

// Constants
const CONSENT_TYPES = ['marketing', 'analytics', 'third_party', 'data_processing'];
const RETENTION_POLICIES = {
  user_data: 365,
  order_data: 2555,
  logs: 90
};

/**
 * Export user data (GDPR right of access)
 */
exports.gdprDataExport = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Users can export their own data, super_admin can export any user
    if (req.user.role === 'user' && req.user.id != user_id) {
      return ApiResponse.forbidden(res, 'You can only export your own data');
    }

    if (req.user.role === 'user' || req.user.role === 'admin') {
      // Limited export for non-super_admin
      if (req.user.role === 'admin' && req.user.id != user_id) {
        return ApiResponse.forbidden(res, 'Admins can only export their own data');
      }
    }

    const user = await models.User.findByPk(user_id, {
      include: [
        { model: models.UserProfile },
        { model: models.Address },
        { model: models.Order },
        { model: models.Post },
        { model: models.Reel },
        { model: models.UserConsent }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    const export_data = {
      exported_at: new Date(),
      exported_by: req.user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.createdAt,
        profile: user.UserProfile
      },
      addresses: user.Addresses || [],
      orders: user.Orders || [],
      content: {
        posts: user.Posts || [],
        reels: user.Reels || []
      },
      consents: user.UserConsents || []
    };

    // Create export record
    const export_record = await models.DataExport.create({
      user_id,
      requested_by: req.user.id,
      export_data,
      format: 'json',
      status: 'completed',
      exported_at: new Date()
    });

    // Log action
    await models.AdminAuditLog.create({
      admin_id: req.user.id,
      action: 'gdpr_data_export',
      resource_type: 'User',
      resource_id: user_id,
      details: { export_id: export_record.id }
    });

    return ApiResponse.success(res, export_data, 'User data exported successfully');
  } catch (error) {
    console.error('❌ gdprDataExport error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete user data (GDPR right to be forgotten)
 */
exports.deleteUserData = async (req, res) => {
  try {
    // Verify super_admin access for forced deletion
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can delete user data');
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
      await models.ArchivedUserData.create({
        user_id,
        archived_at: new Date(),
        archived_by: req.user.id,
        reason
      }, { transaction: t });

      // Delete personal data (but keep orders for legal compliance)
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

      await models.Cart.destroy({
        where: { user_id },
        transaction: t
      });

      // Anonymize account
      await user.update({
        name: 'Deleted User',
        email: `deleted_${user_id}@example.com`,
        phone: null,
        account_status: 'deleted'
      }, { transaction: t });

      // Create deletion record
      await models.DataDeletion.create({
        user_id,
        requested_by: req.user.id,
        deletion_reason: reason,
        deleted_at: new Date()
      }, { transaction: t });

      // Log action
      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'delete_user_data',
        resource_type: 'User',
        resource_id: user_id,
        details: { reason }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        user_id,
        status: 'deleted',
        message: 'User data has been permanently deleted'
      }, 'User data deleted successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ deleteUserData error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Set data retention policy
 */
exports.dataRetentionPolicy = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can set retention policies');
    }

    const { action, data_type, retention_days } = req.body;

    if (!['get', 'update'].includes(action)) {
      return ApiResponse.error(res, 'Invalid action. Must be get or update', 422);
    }

    if (action === 'get') {
      return ApiResponse.success(res, RETENTION_POLICIES, 'Retention policies retrieved');
    }

    if (action === 'update') {
      if (!data_type || !retention_days || retention_days <= 0) {
        return ApiResponse.error(res, 'data_type and retention_days are required', 422);
      }

      const t = await models.sequelize.transaction();
      try {
        // Update policy
        RETENTION_POLICIES[data_type] = retention_days;

        // Create retention policy record
        await models.RetentionPolicy.create({
          data_type,
          retention_days,
          created_by: req.user.id,
          effective_date: new Date()
        }, { transaction: t });

        // Log action
        await models.AdminAuditLog.create({
          admin_id: req.user.id,
          action: 'update_retention_policy',
          resource_type: 'RetentionPolicy',
          resource_id: data_type,
          details: { retention_days }
        }, { transaction: t });

        await t.commit();

        return ApiResponse.success(res, {
          data_type,
          retention_days,
          updated_at: new Date()
        }, 'Retention policy updated successfully');
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ dataRetentionPolicy error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Manage user privacy settings
 */
exports.privacySettings = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Users can manage their own settings, admins/super_admin can manage any
    if (req.user.role === 'user' && req.user.id != user_id) {
      return ApiResponse.forbidden(res, 'You can only manage your own privacy settings');
    }

    const { action, setting_name, value } = req.body;

    if (!['get', 'update'].includes(action)) {
      return ApiResponse.error(res, 'Invalid action. Must be get or update', 422);
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    if (action === 'get') {
      const privacy_settings = await models.UserPrivacySetting.findAll({
        where: { user_id }
      });

      return ApiResponse.success(res, {
        user_id,
        settings: privacy_settings
      }, 'Privacy settings retrieved');
    }

    if (action === 'update') {
      if (!setting_name || value === undefined) {
        return ApiResponse.error(res, 'setting_name and value are required', 422);
      }

      const valid_settings = ['profile_visibility', 'data_collection', 'marketing_emails', 'analytics_tracking'];

      if (!valid_settings.includes(setting_name)) {
        return ApiResponse.error(res, `Invalid setting. Must be one of: ${valid_settings.join(', ')}`, 422);
      }

      const t = await models.sequelize.transaction();
      try {
        const [setting] = await models.UserPrivacySetting.findOrCreate({
          where: { user_id, setting_name },
          defaults: { value },
          transaction: t
        });

        if (setting.value !== value) {
          await setting.update({ value }, { transaction: t });
        }

        await models.AdminAuditLog.create({
          admin_id: req.user.id,
          action: 'update_privacy_setting',
          resource_type: 'UserPrivacySetting',
          resource_id: user_id,
          details: { setting_name, value }
        }, { transaction: t });

        await t.commit();

        return ApiResponse.success(res, {
          user_id,
          setting_name,
          value
        }, 'Privacy setting updated successfully');
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ privacySettings error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Track user consent
 */
exports.consentTracking = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { action, consent_type, agreed } = req.body;

    // Users manage their own consent, admins/super_admin can view
    if (req.user.role === 'user' && req.user.id != user_id) {
      return ApiResponse.forbidden(res, 'You can only manage your own consent');
    }

    const user = await models.User.findByPk(user_id);
    if (!user) {
      return ApiResponse.notFound(res, 'User');
    }

    if (action === 'get') {
      const consents = await models.UserConsent.findAll({
        where: { user_id }
      });

      return ApiResponse.success(res, {
        user_id,
        consents
      }, 'Consent records retrieved');
    }

    if (action === 'update') {
      if (!CONSENT_TYPES.includes(consent_type) || typeof agreed !== 'boolean') {
        return ApiResponse.error(res, 'Invalid consent_type or agreed value', 422);
      }

      const t = await models.sequelize.transaction();
      try {
        const [consent] = await models.UserConsent.findOrCreate({
          where: { user_id, consent_type },
          defaults: { agreed },
          transaction: t
        });

        if (consent.agreed !== agreed) {
          await consent.update({
            agreed,
            updated_at: new Date()
          }, { transaction: t });
        }

        await models.AdminAuditLog.create({
          admin_id: req.user.id,
          action: 'update_user_consent',
          resource_type: 'UserConsent',
          resource_id: user_id,
          details: { consent_type, agreed }
        }, { transaction: t });

        await t.commit();

        return ApiResponse.success(res, {
          user_id,
          consent_type,
          agreed
        }, 'Consent updated successfully');
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ consentTracking error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Data governance audit trail
 */
exports.dataAudit = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view data audits');
    }

    const { page = 1, limit = 50, action_type, data_type, user_id, date_from, date_to } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = {};

    if (action_type) {
      where.action = action_type;
    }
    if (data_type) {
      where.resource_type = data_type;
    }
    if (user_id) {
      where.resource_id = user_id;
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
      where: {
        ...where,
        action: { [Op.in]: ['delete_user_data', 'gdpr_data_export', 'update_privacy_setting', 'update_user_consent'] }
      },
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

    return ApiResponse.paginated(res, rows, pagination, 'Data governance audit trail retrieved successfully');
  } catch (error) {
    console.error('❌ dataAudit error:', error);
    return ApiResponse.serverError(res, error);
  }
};