const ServiceLoader = require('../services/ServiceLoader');
const moduleManagementService = ServiceLoader.loadService('moduleManagementService');


const { sendResponse, sendError } = require('../utils/response');

class ModuleManagementController {
  /**
   * Get all modules
   * GET /
   */
  static async getAllModules(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const modules = await ModuleManagementRepository.findAll({ page, limit });
      return sendResponse(res, {
        success: true,
        data: modules,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(modules.total / limit),
          total: modules.total
        },
        message: 'Modules retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a new module
   * POST /
   */
  static async createModule(req, res) {
    try {
      const { name, description, status = 'active', permissions } = req.body;
      const module = await ModuleManagementRepository.create({
        name,
        description,
        status,
        permissions,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: module,
        message: 'Module created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update a module
   * PUT /:id
   */
  static async updateModule(req, res) {
    try {
      const { id } = req.params;
      const { name, description, status, permissions } = req.body;
      const module = await ModuleManagementRepository.update(id, {
        name,
        description,
        status,
        permissions
      });
      if (!module) return sendError(res, 'Module not found', 404);
      return sendResponse(res, {
        success: true,
        data: module,
        message: 'Module updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete a module
   * DELETE /:id
   */
  static async deleteModule(req, res) {
    try {
      const { id } = req.params;
      await ModuleManagementRepository.delete(id);
      return sendResponse(res, {
        success: true,
        message: 'Module deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get module categories
   * GET /categories
   */
  static async getModuleCategories(req, res) {
    try {
      const categories = await ModuleManagementRepository.getCategories();
      return sendResponse(res, {
        success: true,
        data: categories,
        message: 'Module categories retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get module by ID
   * GET /:moduleId
   */
  static async getModuleById(req, res) {
    try {
      const { moduleId } = req.params;
      const module = await ModuleManagementRepository.findById(moduleId);
      if (!module) return sendError(res, 'Module not found', 404);
      return sendResponse(res, {
        success: true,
        data: module,
        message: 'Module retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update a module
   * PUT /:moduleId
   */
  static async updateModule(req, res) {
    try {
      const { moduleId } = req.params;
      const updates = req.body;
      const module = await ModuleManagementRepository.update(moduleId, updates);
      return sendResponse(res, {
        success: true,
        data: module,
        message: 'Module updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete a module
   * DELETE /:moduleId
   */
  static async deleteModule(req, res) {
    try {
      const { moduleId } = req.params;
      await ModuleManagementRepository.delete(moduleId);
      return sendResponse(res, {
        success: true,
        message: 'Module deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = ModuleManagementController;
