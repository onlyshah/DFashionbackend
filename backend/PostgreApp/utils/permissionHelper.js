/**
 * ============================================================================
 * PERMISSION HELPER - RBAC (Role-Based Access Control) Utilities
 * ============================================================================
 * Purpose: Centralized permission checking for creator capabilities and other RBAC checks
 * 
 * NOTE: Creator is NOT a separate role. Instead, it's a capability granted via permissions:
 * - Users with 'can_create_posts' permission can create posts
 * - Users with 'can_create_reels' permission can create reels
 * - Users with 'can_create_stories' permission can create stories
 * - Users with 'can_create_live_streams' permission can go live
 * 
 * Roles with content creation permissions:
 * - 'user' (EndUser) → can_create_posts, can_create_reels, can_create_stories, can_manage_own_content, can_tag_products
 * - 'seller' (Vendor) → all of above + can_create_live_streams, can_monetize_content
 * - 'super_admin' → all permissions including content management
 * - 'admin' → can_manage_all_content (moderation)
 */

const { Op } = require('sequelize');

class PermissionHelper {
  /**
   * Check if a user has a specific permission
   * @param {UUID} userId - User ID
   * @param {string} permissionName - Permission name (e.g., 'can_create_posts')
   * @param {Object} models - Sequelize models object
   * @returns {Promise<boolean>}
   */
  static async hasPermission(userId, permissionName, models) {
    try {
      const { User, Role, Permission, RolePermission } = models;

      // Get user's role
      const user = await User.findByPk(userId, {
        attributes: ['id', 'role_id'],
        raw: true
      });

      if (!user) return false;

      // Get user's role permissions
      const rolePermissions = await RolePermission.findAll({
        where: { roleId: user.role_id },
        attributes: ['permissionId'],
        raw: true
      });

      if (rolePermissions.length === 0) return false;

      // Get the permission
      const permission = await Permission.findOne({
        where: { name: permissionName },
        attributes: ['id'],
        raw: true
      });

      if (!permission) return false;

      // Check if user's role has this permission
      return rolePermissions.some(rp => rp.permissionId === permission.id);
    } catch (error) {
      console.error('[PermissionHelper] hasPermission error:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the given permissions
   * @param {UUID} userId - User ID
   * @param {string[]} permissionNames - Array of permission names
   * @param {Object} models - Sequelize models object
   * @returns {Promise<boolean>}
   */
  static async hasAnyPermission(userId, permissionNames, models) {
    try {
      const { User, Role, Permission, RolePermission } = models;

      const user = await User.findByPk(userId, {
        attributes: ['id', 'role_id'],
        raw: true
      });

      if (!user) return false;

      const rolePermissions = await RolePermission.findAll({
        where: { roleId: user.role_id },
        attributes: ['permissionId'],
        raw: true
      });

      if (rolePermissions.length === 0) return false;

      const permissions = await Permission.findAll({
        where: { name: { [Op.in]: permissionNames } },
        attributes: ['id'],
        raw: true
      });

      if (permissions.length === 0) return false;

      const permissionIds = permissions.map(p => p.id);
      return rolePermissions.some(rp => permissionIds.includes(rp.permissionId));
    } catch (error) {
      console.error('[PermissionHelper] hasAnyPermission error:', error);
      return false;
    }
  }

  /**
   * Check if user has all of the given permissions
   * @param {UUID} userId - User ID
   * @param {string[]} permissionNames - Array of permission names
   * @param {Object} models - Sequelize models object
   * @returns {Promise<boolean>}
   */
  static async hasAllPermissions(userId, permissionNames, models) {
    try {
      for (const permName of permissionNames) {
        const hasIt = await this.hasPermission(userId, permName, models);
        if (!hasIt) return false;
      }
      return true;
    } catch (error) {
      console.error('[PermissionHelper] hasAllPermissions error:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   * @param {UUID} userId - User ID
   * @param {Object} models - Sequelize models object
   * @returns {Promise<Array>} Array of permission objects
   */
  static async getUserPermissions(userId, models) {
    try {
      const { User, RolePermission, Permission } = models;

      const user = await User.findByPk(userId);
      if (!user) return [];

      const rolePermissions = await RolePermission.findAll({
        where: { roleId: user.role_id },
        attributes: ['permissionId'],
        raw: true
      });

      if (rolePermissions.length === 0) return [];

      const permissionIds = rolePermissions.map(rp => rp.permissionId);
      const permissions = await Permission.findAll({
        where: { id: { [Op.in]: permissionIds } },
        attributes: ['id', 'name', 'displayName', 'module'],
        raw: true
      });

      return permissions;
    } catch (error) {
      console.error('[PermissionHelper] getUserPermissions error:', error);
      return [];
    }
  }

  /**
   * Check if user can create content
   * Convenience method that checks for any content creation permission
   * @param {UUID} userId - User ID
   * @param {Object} models - Sequelize models object
   * @returns {Promise<boolean>}
   */
  static async canCreateContent(userId, models) {
    const contentPermissions = [
      'can_create_posts',
      'can_create_reels',
      'can_create_stories',
      'can_create_live_streams'
    ];

    return this.hasAnyPermission(userId, contentPermissions, models);
  }

  /**
   * Check if user can manage own content
   * @param {UUID} userId - User ID
   * @param {Object} models - Sequelize models object
   * @returns {Promise<boolean>}
   */
  static async canManageOwnContent(userId, models) {
    return this.hasPermission(userId, 'can_manage_own_content', models);
  }

  /**
   * Check if user can manage all content (moderator/admin capability)
   * @param {UUID} userId - User ID
   * @param {Object} models - Sequelize models object
   * @returns {Promise<boolean>}
   */
  static async canManageAllContent(userId, models) {
    return this.hasPermission(userId, 'can_manage_all_content', models);
  }

  /**
   * Check if user can monetize content
   * @param {UUID} userId - User ID
   * @param {Object} models - Sequelize models object
   * @returns {Promise<boolean>}
   */
  static async canMonetizeContent(userId, models) {
    return this.hasPermission(userId, 'can_monetize_content', models);
  }

  /**
   * Check if user is a "creator" (has content creation capabilities)
   * This is a convenience method that determines creator status based on permissions
   * NOT based on a hardcoded 'creator' role
   * @param {UUID} userId - User ID
   * @param {Object} models - Sequelize models object
   * @returns {Promise<boolean>}
   */
  static async isCreator(userId, models) {
    return this.canCreateContent(userId, models);
  }

  /**
   * Get creator profile data for a user who is a content creator
   * @param {UUID} userId - User ID
   * @param {Object} models - Sequelize models object
   * @returns {Promise<Object|null>}
   */
  static async getCreatorProfile(userId, models) {
    try {
      const isCreator = await this.isCreator(userId, models);
      if (!isCreator) return null;

      // Check if user has CreatorProfile record
      if (!models.CreatorProfile) return null;

      const profile = await models.CreatorProfile.findOne({
        where: { user_id: userId },
        raw: true
      });

      return profile || null;
    } catch (error) {
      console.error('[PermissionHelper] getCreatorProfile error:', error);
      return null;
    }
  }
}

module.exports = PermissionHelper;
