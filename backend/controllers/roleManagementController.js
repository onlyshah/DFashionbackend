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
      const roles = await RoleManagementRepository.findAll({ page, limit });
      return sendResponse(res, {
        success: true,
        data: roles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(roles.total / limit),
          total: roles.total
        },
        message: 'Roles retrieved successfully'
      });
    } catch (error) {
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
      const role = await RoleManagementRepository.findById(roleId);
      if (!role) return sendError(res, 'Role not found', 404);
      return sendResponse(res, {
        success: true,
        data: role,
        message: 'Role retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a new role
   * POST /
   */
  static async createRole(req, res) {
    try {
      const { name, description, permissions } = req.body;
      const role = await RoleManagementRepository.create({
        name,
        description,
        permissions,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: role,
        message: 'Role created successfully'
      }, 201);
    } catch (error) {
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
      const { name, description, permissions } = req.body;
      const role = await RoleManagementRepository.update(roleId, {
        name,
        description,
        permissions
      });
      if (!role) return sendError(res, 'Role not found', 404);
      return sendResponse(res, {
        success: true,
        data: role,
        message: 'Role updated successfully'
      });
    } catch (error) {
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
      await RoleManagementRepository.delete(roleId);
      return sendResponse(res, {
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
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
