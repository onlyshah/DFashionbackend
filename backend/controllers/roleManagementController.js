const ServiceLoader = require('../services/ServiceLoader');
const roleManagementService = ServiceLoader.loadService('roleManagementService');


const { sendResponse, sendError } = require('../utils/response');

class RoleManagementController {
  /**
   * Get all roles
   * GET /
   */
  static async getAllRoles(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const models = require('../models_sql');
      const Role = models._raw?.Role || models.Role;

      if (!Role) {
        return sendError(res, 'Database connection error', 500);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows } = await Role.findAndCountAll({
        offset,
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      return sendResponse(res, {
        success: true,
        data: rows.map(r => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
          description: r.description,
          level: r.level,
          isSystemRole: r.isSystemRole,
          createdAt: r.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        },
        message: 'Roles retrieved successfully'
      });
    } catch (error) {
      console.error('[RoleManagementController] getAllRoles error:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get role by ID
   * GET /:roleId
   */
  static async getRoleById(req, res) {
    try {
      const { roleId } = req.params;

      const models = require('../models_sql');
      const Role = models._raw?.Role || models.Role;

      if (!Role) {
        return sendError(res, 'Database connection error', 500);
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        return sendError(res, 'Role not found', 404);
      }

      return sendResponse(res, {
        success: true,
        data: {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          level: role.level,
          isSystemRole: role.isSystemRole,
          createdAt: role.createdAt
        },
        message: 'Role retrieved successfully'
      });
    } catch (error) {
      console.error('[RoleManagementController] getRoleById error:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a new role
   * POST /
   * Only super_admin can create roles
   */
  static async createRole(req, res) {
    try {
      const { name, displayName, description, level, isSystemRole } = req.body;

      // Validate required fields
      if (!name || !displayName) {
        return sendError(res, 'Role name and displayName are required', 400);
      }

      const models = require('../models_sql');
      const Role = models._raw?.Role || models.Role;

      if (!Role) {
        return sendError(res, 'Database connection error', 500);
      }

      // Check if role already exists
      const existingRole = await Role.findOne({ where: { name } });
      if (existingRole) {
        return sendError(res, `Role with name '${name}' already exists`, 409);
      }

      // Create the role
      const newRole = await Role.create({
        name,
        displayName,
        description: description || '',
        level: level || 99,
        isSystemRole: isSystemRole || false
      });

      return sendResponse(res, {
        success: true,
        data: {
          id: newRole.id,
          name: newRole.name,
          displayName: newRole.displayName,
          description: newRole.description,
          level: newRole.level,
          isSystemRole: newRole.isSystemRole
        },
        message: 'Role created successfully'
      }, 201);
    } catch (error) {
      console.error('[RoleManagementController] createRole error:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update a role
   * PUT /:roleId
   */
  static async updateRole(req, res) {
    try {
      const { roleId } = req.params;
      const { displayName, description, level, isSystemRole } = req.body;

      const models = require('../models_sql');
      const Role = models._raw?.Role || models.Role;

      if (!Role) {
        return sendError(res, 'Database connection error', 500);
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        return sendError(res, 'Role not found', 404);
      }

      // Prevent modification of system roles
      if (role.isSystemRole) {
        return sendError(res, 'Cannot modify system roles', 403);
      }

      // Update only allowed fields
      if (displayName) role.displayName = displayName;
      if (description) role.description = description;
      if (level !== undefined) role.level = level;

      await role.save();

      return sendResponse(res, {
        success: true,
        data: {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          level: role.level,
          isSystemRole: role.isSystemRole
        },
        message: 'Role updated successfully'
      });
    } catch (error) {
      console.error('[RoleManagementController] updateRole error:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete a role
   * DELETE /:roleId
   */
  static async deleteRole(req, res) {
    try {
      const { roleId } = req.params;

      const models = require('../models_sql');
      const Role = models._raw?.Role || models.Role;

      if (!Role) {
        return sendError(res, 'Database connection error', 500);
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        return sendError(res, 'Role not found', 404);
      }

      // Prevent deletion of system roles
      if (role.isSystemRole) {
        return sendError(res, 'Cannot delete system roles', 403);
      }

      await role.destroy();

      return sendResponse(res, {
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('[RoleManagementController] deleteRole error:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get role permissions
   * GET /:roleId/permissions
   */
  static async getRolePermissions(req, res) {
    try {
      const { roleId } = req.params;
      const permissions = await RoleManagementRepository.getPermissions(roleId);
      return sendResponse(res, {
        success: true,
        data: permissions,
        message: 'Role permissions retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Assign role to user
   * POST /assign-role
   */
  static async assignRoleToUser(req, res) {
    try {
      const { userId, roleId } = req.body;
      const assignment = await RoleManagementRepository.assignRoleToUser(userId, roleId);
      return sendResponse(res, {
        success: true,
        data: assignment,
        message: 'Role assigned to user successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Remove role from user
   * POST /remove-role
   */
  static async removeRoleFromUser(req, res) {
    try {
      const { userId, roleId } = req.body;
      await RoleManagementRepository.removeRoleFromUser(userId, roleId);
      return sendResponse(res, {
        success: true,
        message: 'Role removed from user successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get available permissions
   * GET /permissions
   */
  static async getAvailablePermissions(req, res) {
    try {
      const permissions = await RoleManagementRepository.getAvailablePermissions();
      return sendResponse(res, {
        success: true,
        data: permissions,
        message: 'Available permissions retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(req, res) {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      return sendResponse(res, {
        success: true,
        data: {},
        message: 'Role assigned to user'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = RoleManagementController;
