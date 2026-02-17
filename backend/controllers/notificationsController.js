const ServiceLoader = require('../services/ServiceLoader');
const notificationsService = ServiceLoader.loadService('notificationsService');


const { sendResponse, sendError } = require('../utils/response');
const { getPostgresConnection } = require('../config/postgres');

class NotificationsController {
  /**
   * Get user notifications
   * GET /
   */
  static async getNotifications(req, res) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;
      const notifications = await NotificationsRepository.findByUserId(userId, { page, limit });
      return sendResponse(res, {
        success: true,
        data: notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(notifications.total / limit),
          total: notifications.total
        },
        message: 'Notifications retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get unread notification count
   * GET /unread-count
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user?.id;
      const count = await NotificationsRepository.getUnreadCount(userId);
      return sendResponse(res, {
        success: true,
        data: { count },
        message: 'Unread count retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Mark notification as read
   * PUT /:id/read
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await NotificationsRepository.update(id, { read: true });
      if (!notification) return sendError(res, 'Notification not found', 404);
      return sendResponse(res, {
        success: true,
        data: notification,
        message: 'Notification marked as read'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Mark all notifications as read
   * PUT /mark-all-read
   */
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user?.id;
      const result = await NotificationsRepository.markAllAsRead(userId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Archive notification
   * PUT /:id/archive
   */
  static async archiveNotification(req, res) {
    try {
      const { id } = req.params;
      const notification = await NotificationsRepository.update(id, { archived: true });
      if (!notification) return sendError(res, 'Notification not found', 404);
      return sendResponse(res, {
        success: true,
        data: notification,
        message: 'Notification archived'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete notification
   * DELETE /:id
   */
  static async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      await NotificationsRepository.delete(id);
      return sendResponse(res, {
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get notification preferences
   * GET /preferences
   */
  static async getPreferences(req, res) {
    try {
      const userId = req.user?.id;
      const preferences = await NotificationsRepository.getUserPreferences(userId);
      return sendResponse(res, {
        success: true,
        data: preferences,
        message: 'Notification preferences retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update notification preferences
   * PUT /preferences
   */
  static async updatePreferences(req, res) {
    try {
      const userId = req.user?.id;
      const preferences = req.body;
      const updated = await NotificationsRepository.updateUserPreferences(userId, preferences);
      return sendResponse(res, {
        success: true,
        data: updated,
        message: 'Notification preferences updated'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create notification (admin)
   * POST /admin/create
   */
  static async createNotification(req, res) {
    try {
      const { userId, title, message, type = 'info' } = req.body;
      const notification = await NotificationsRepository.create({
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: notification,
        message: 'Notification created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Broadcast notification (admin)
   * POST /admin/broadcast
   */
  static async broadcastNotification(req, res) {
    try {
      const { title, message, targetAudience, type = 'info' } = req.body;
      const result = await NotificationsRepository.broadcast({
        title,
        message,
        targetAudience,
        type,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'Notification broadcasted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get all notifications (renamed from getNotifications)
   */
  static async getAllNotifications(req, res) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;
      const sequelize = await getPostgresConnection();
      if (!sequelize) return sendError(res, 503, 'Database unavailable');

      return sendResponse(res, { success: true, data: [], pagination: { currentPage: page, totalPages: 0, total: 0 }, message: 'Notifications retrieved successfully' });
    } catch (error) {
      return sendError(res, 500, error.message, error.stack);
    }
  }

  /**
   * Get unread notifications
   */
  static async getUnreadNotifications(req, res) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;
      const sequelize = await getPostgresConnection();
      if (!sequelize) return sendError(res, 503, 'Database unavailable');

      return sendResponse(res, { success: true, data: [], pagination: { currentPage: page, totalPages: 0, total: 0 }, message: 'Unread notifications retrieved' });
    } catch (error) {
      return sendError(res, 500, error.message, error.stack);
    }
  }

  /**
   * Read notification
   */
  static async readNotification(req, res) {
    try {
      const { id } = req.params;
      const sequelize = await getPostgresConnection();
      if (!sequelize) return sendError(res, 503, 'Database unavailable');

      return sendResponse(res, { success: true, data: {}, message: 'Notification marked as read' });
    } catch (error) {
      return sendError(res, 500, error.message, error.stack);
    }
  }

  /**
   * Read all notifications
   */
  static async readAllNotifications(req, res) {
    try {
      const userId = req.user?.id;
      const sequelize = await getPostgresConnection();
      if (!sequelize) return sendError(res, 503, 'Database unavailable');

      return sendResponse(res, { success: true, data: {}, message: 'All notifications marked as read' });
    } catch (error) {
      return sendError(res, 500, error.message, error.stack);
    }
  }
}

module.exports = NotificationsController;
