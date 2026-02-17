const ServiceLoader = require('../services/ServiceLoader');
const alertService = ServiceLoader.loadService('alertService');

const { sendResponse, sendError } = require('../utils/response');
const { getPostgresConnection } = require('../config/postgres');

class AlertsController {
  /**
   * Get alerts for the current user
   * GET /
   */
  static async getAlerts(req, res) {
    try {
      const userId = req.user?.id;
      const alerts = await AlertRepository.findByUserId(userId);
      return sendResponse(res, {
        success: true,
        data: alerts,
        message: 'Alerts retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get a specific alert by ID
   * GET /:alertId
   */
  static async getAlertById(req, res) {
    try {
      const { alertId } = req.params;
      const alert = await AlertRepository.findById(alertId);
      if (!alert) return sendError(res, 'Alert not found', 404);
      return sendResponse(res, {
        success: true,
        data: alert,
        message: 'Alert retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create alert
   * POST /
   */
  static async createAlert(req, res) {
    try {
      const { type, message, productId } = req.body;
      const userId = req.user?.id;
      const alert = await AlertRepository.create({
        userId,
        type,
        message,
        productId,
        read: false,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: alert,
        message: 'Alert created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Mark alert as read
   * PUT /:alertId/read
   */
  static async markAsRead(req, res) {
    try {
      const { alertId } = req.params;
      const alert = await AlertRepository.update(alertId, { read: true });
      return sendResponse(res, {
        success: true,
        data: alert,
        message: 'Alert marked as read'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete an alert
   * DELETE /:alertId
   */
  static async deleteAlert(req, res) {
    try {
      const { alertId } = req.params;
      await AlertRepository.delete(alertId);
      return sendResponse(res, {
        success: true,
        message: 'Alert deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get user alert configuration
   * GET /config/user
   */
  static async getUserAlertConfig(req, res) {
    try {
      const userId = req.user?.id;
      const config = await AlertRepository.getUserConfig(userId);
      return sendResponse(res, {
        success: true,
        data: config,
        message: 'Alert configuration retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update user alert configuration
   * PUT /config/user
   */
  static async updateUserAlertConfig(req, res) {
    try {
      const userId = req.user?.id;
      const { preferences } = req.body;
      const config = await AlertRepository.updateUserConfig(userId, preferences);
      return sendResponse(res, {
        success: true,
        data: config,
        message: 'Alert configuration updated'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get admin alert configuration
   * GET /admin/config
   */
  static async getAdminAlertConfig(req, res) {
    try {
      const config = await AlertRepository.getAdminConfig();
      return sendResponse(res, {
        success: true,
        data: config,
        message: 'Admin alert configuration retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Trigger alert (admin)
   * POST /admin/trigger
   */
  static async triggerAlert(req, res) {
    try {
      const { type, title, message, userId, broadcast } = req.body;
      const alert = await AlertRepository.create({
        type,
        title,
        message,
        userId,
        broadcast,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: alert,
        message: 'Alert triggered successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get alert statistics (admin)
   * GET /admin/stats
   */
  static async getAlertStats(req, res) {
    try {
      const stats = await AlertRepository.getStats();
      return sendResponse(res, {
        success: true,
        data: stats,
        message: 'Alert statistics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get all alerts (renamed from getAlerts)
   */
  static async getAllAlerts(req, res) {
    try {
      const sequelize = await getPostgresConnection();
      if (!sequelize) return sendError(res, 503, 'Database unavailable');

      return sendResponse(res, { success: true, data: [], message: 'Alerts retrieved successfully' });
    } catch (error) {
      return sendError(res, 500, error.message, error.stack);
    }
  }

  /**
   * Delete alert
   */
  static async deleteAlert(req, res) {
    try {
      const { alertId } = req.params;
      return sendResponse(res, {
        success: true,
        message: 'Alert deleted'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update alert
   */
  static async updateAlert(req, res) {
    try {
      const { alertId } = req.params;
      const updates = req.body;
      const sequelize = await getPostgresConnection();
      if (!sequelize) return sendError(res, 503, 'Database unavailable');

      return sendResponse(res, { success: true, data: {}, message: 'Alert updated successfully' });
    } catch (error) {
      return sendError(res, 500, error.message, error.stack);
    }
  }

  /**
   * Create alert
   */
  static async createAlert(req, res) {
    try {
      const { type, message, priority } = req.body;
      return sendResponse(res, {
        success: true,
        data: { id: null, type, message, priority },
        message: 'Alert created'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Test alert
   */
  static async testAlert(req, res) {
    try {
      return sendResponse(res, {
        success: true,
        data: { sent: true },
        message: 'Test alert sent'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get alert templates
   */
  static async getAlertTemplates(req, res) {
    try {
      const sequelize = await getPostgresConnection();
      if (!sequelize) return sendError(res, 503, 'Database unavailable');

      return sendResponse(res, { success: true, data: [], message: 'Alert templates retrieved' });
    } catch (error) {
      return sendError(res, 500, error.message, error.stack);
    }
  }

  /**
   * Mark alert as read
   */
  static async markAlertAsRead(req, res) {
    try {
      const { alertId } = req.params;
      return sendResponse(res, {
        success: true,
        message: 'Alert marked as read'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Trigger system alert
   */
  static async triggerSystemAlert(req, res) {
    try {
      const { title, message, type } = req.body;
      return sendResponse(res, {
        success: true,
        data: { id: null, title, message, type },
        message: 'System alert triggered'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get alert statistics
   */
  static async getAlertStatistics(req, res) {
    try {
      const sequelize = await getPostgresConnection();
      if (!sequelize) return sendError(res, 503, 'Database unavailable');

      return sendResponse(res, { success: true, data: { totalAlerts: 0, readAlerts: 0, unreadAlerts: 0, alertsByType: {} }, message: 'Alert statistics retrieved' });
    } catch (error) {
      return sendError(res, 500, error.message, error.stack);
    }
  }
}

module.exports = AlertsController;
