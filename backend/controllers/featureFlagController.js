/**
 * ============================================================================
 * FEATURE FLAG CONTROLLER - PostgreSQL/Sequelize + RBAC
 * ============================================================================
 * Purpose: Feature toggles, A/B testing, gradual rollouts (super_admin only)
 * Database: PostgreSQL via Sequelize ORM
 * Access: super_admin role only
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

// Constants
const FLAG_TYPES = ['feature', 'ab_test', 'beta', 'experiment'];
const FLAG_STATUSES = ['planning', 'active', 'inactive', 'archived'];
const ROLLOUT_STRATEGIES = ['all_users', 'percentage', 'whitelist', 'role_based'];

/**
 * List all feature flags
 */
exports.listFeatures = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view feature flags');
    }

    const { page = 1, limit = 20, status, flag_type, search } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = {};

    if (FLAG_STATUSES.includes(status)) {
      where.status = status;
    }
    if (FLAG_TYPES.includes(flag_type)) {
      where.flag_type = flag_type;
    }
    if (search) {
      where[Op.or] = [
        { flag_name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await models.FeatureFlag.findAndCountAll({
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

    return ApiResponse.paginated(res, rows, pagination, 'Feature flags retrieved successfully');
  } catch (error) {
    console.error('❌ listFeatures error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get feature flag status for client
 */
exports.getFeatureStatus = async (req, res) => {
  try {
    const { flag_name } = req.params;

    const flag = await models.FeatureFlag.findOne({
      where: { flag_name, status: 'active' }
    });

    if (!flag) {
      return ApiResponse.notFound(res, 'Feature flag');
    }

    // Determine if user qualifies for feature
    let user_has_access = false;

    if (flag.rollout_strategy === 'all_users') {
      user_has_access = true;
    } else if (flag.rollout_strategy === 'percentage') {
      const user_percentage = (req.user?.id || req.ip.charCodeAt(0)) % 100;
      user_has_access = user_percentage < flag.rollout_percentage;
    } else if (flag.rollout_strategy === 'whitelist') {
      const whitelisted_users = flag.rollout_config?.whitelisted_user_ids || [];
      user_has_access = req.user && whitelisted_users.includes(req.user.id);
    } else if (flag.rollout_strategy === 'role_based') {
      const allowed_roles = flag.rollout_config?.allowed_roles || [];
      user_has_access = req.user && allowed_roles.includes(req.user.role);
    }

    return ApiResponse.success(res, {
      flag_name: flag.flag_name,
      enabled: user_has_access,
      flag_type: flag.flag_type,
      rollout_strategy: flag.rollout_strategy,
      rollout_percentage: flag.rollout_percentage
    }, 'Feature status retrieved successfully');
  } catch (error) {
    console.error('❌ getFeatureStatus error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Create feature flag
 */
exports.createFeatureFlag = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can create feature flags');
    }

    const { flag_name, description, flag_type = 'feature', rollout_strategy = 'all_users', rollout_percentage = 100, rollout_config } = req.body;

    if (!flag_name || !description) {
      return ApiResponse.error(res, 'flag_name and description are required', 422);
    }

    if (!FLAG_TYPES.includes(flag_type)) {
      return ApiResponse.error(res, `Invalid flag_type. Must be one of: ${FLAG_TYPES.join(', ')}`, 422);
    }

    if (!ROLLOUT_STRATEGIES.includes(rollout_strategy)) {
      return ApiResponse.error(res, `Invalid rollout_strategy. Must be one of: ${ROLLOUT_STRATEGIES.join(', ')}`, 422);
    }

    // Check if flag already exists
    const existing = await models.FeatureFlag.findOne({
      where: { flag_name }
    });

    if (existing) {
      return ApiResponse.error(res, 'Feature flag with this name already exists', 409);
    }

    const t = await models.sequelize.transaction();
    try {
      const flag = await models.FeatureFlag.create({
        flag_name,
        description,
        flag_type,
        status: 'planning',
        rollout_strategy,
        rollout_percentage,
        rollout_config,
        created_by: req.user.id
      }, { transaction: t });

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'create_feature_flag',
        resource_type: 'FeatureFlag',
        resource_id: flag.id,
        details: { flag_name, flag_type }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.created(res, flag, 'Feature flag created successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ createFeatureFlag error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update feature flag
 */
exports.updateFlag = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can update feature flags');
    }

    const { flag_id } = req.params;
    const { description, rollout_strategy, rollout_percentage, rollout_config } = req.body;

    const flag = await models.FeatureFlag.findByPk(flag_id);
    if (!flag) {
      return ApiResponse.notFound(res, 'Feature flag');
    }

    const t = await models.sequelize.transaction();
    try {
      await flag.update({
        description: description || flag.description,
        rollout_strategy: rollout_strategy || flag.rollout_strategy,
        rollout_percentage: rollout_percentage !== undefined ? rollout_percentage : flag.rollout_percentage,
        rollout_config: rollout_config || flag.rollout_config
      }, { transaction: t });

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'update_feature_flag',
        resource_type: 'FeatureFlag',
        resource_id: flag_id,
        details: { description, rollout_strategy, rollout_percentage }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, flag, 'Feature flag updated successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ updateFlag error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Toggle feature flag (activate/deactivate)
 */
exports.toggleFeature = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can toggle feature flags');
    }

    const { flag_id } = req.params;
    const { enable } = req.body;

    if (typeof enable !== 'boolean') {
      return ApiResponse.error(res, 'enable parameter must be boolean', 422);
    }

    const flag = await models.FeatureFlag.findByPk(flag_id);
    if (!flag) {
      return ApiResponse.notFound(res, 'Feature flag');
    }

    const t = await models.sequelize.transaction();
    try {
      const new_status = enable ? 'active' : 'inactive';

      await flag.update({
        status: new_status
      }, { transaction: t });

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'toggle_feature_flag',
        resource_type: 'FeatureFlag',
        resource_id: flag_id,
        details: { action: enable ? 'activate' : 'deactivate' }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        flag_id,
        flag_name: flag.flag_name,
        status: new_status
      }, `Feature flag ${enable ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ toggleFeature error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete feature flag
 */
exports.deleteFlag = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can delete feature flags');
    }

    const { flag_id } = req.params;

    const flag = await models.FeatureFlag.findByPk(flag_id);
    if (!flag) {
      return ApiResponse.notFound(res, 'Feature flag');
    }

    const t = await models.sequelize.transaction();
    try {
      await flag.update({
        status: 'archived'
      }, { transaction: t });

      await models.AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'delete_feature_flag',
        resource_type: 'FeatureFlag',
        resource_id: flag_id,
        details: { flag_name: flag.flag_name }
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        flag_id,
        status: 'archived'
      }, 'Feature flag archived successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ deleteFlag error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Test feature flag with specific user
 */
exports.testFeature = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can test feature flags');
    }

    const { flag_id } = req.params;
    const { test_user_id, test_role } = req.body;

    const flag = await models.FeatureFlag.findByPk(flag_id);
    if (!flag) {
      return ApiResponse.notFound(res, 'Feature flag');
    }

    // Simulate user access
    let user_has_access = false;

    if (flag.rollout_strategy === 'all_users') {
      user_has_access = true;
    } else if (flag.rollout_strategy === 'percentage') {
      const test_percentage = test_user_id ? (test_user_id % 100) : 50;
      user_has_access = test_percentage < flag.rollout_percentage;
    } else if (flag.rollout_strategy === 'whitelist') {
      const whitelisted = flag.rollout_config?.whitelisted_user_ids || [];
      user_has_access = test_user_id && whitelisted.includes(test_user_id);
    } else if (flag.rollout_strategy === 'role_based') {
      const allowed_roles = flag.rollout_config?.allowed_roles || [];
      user_has_access = test_role && allowed_roles.includes(test_role);
    }

    return ApiResponse.success(res, {
      flag_name: flag.flag_name,
      test_user_id,
      test_role,
      user_has_access,
      rollout_strategy: flag.rollout_strategy,
      rollout_percentage: flag.rollout_percentage
    }, 'Feature flag test completed');
  } catch (error) {
    console.error('❌ testFeature error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get feature flag analytics
 */
exports.getFlagAnalytics = async (req, res) => {
  try {
    // Verify super_admin access
    if (req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only super_admin can view flag analytics');
    }

    const { flag_id } = req.params;
    const days = parseInt(req.query.days) || 30;
    const start_date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const flag = await models.FeatureFlag.findByPk(flag_id);
    if (!flag) {
      return ApiResponse.notFound(res, 'Feature flag');
    }

    // Get flag usage analytics
    const analytics = await models.FeatureFlagUsage.findAll({
      where: {
        flag_id,
        createdAt: { [Op.gte]: start_date }
      },
      attributes: [
        [models.sequelize.fn('DATE', models.sequelize.col('createdAt')), 'date'],
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'total_accesses'],
        [models.sequelize.fn('SUM', models.sequelize.col('had_access')), 'users_with_access']
      ],
      group: [models.sequelize.fn('DATE', models.sequelize.col('createdAt'))],
      raw: true
    });

    return ApiResponse.success(res, {
      flag_name: flag.flag_name,
      period_days: days,
      analytics
    }, 'Flag analytics retrieved successfully');
  } catch (error) {
    console.error('❌ getFlagAnalytics error:', error);
    return ApiResponse.serverError(res, error);
  }
};