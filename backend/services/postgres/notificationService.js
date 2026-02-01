/**
 * Notification Service - PostgreSQL Implementation
 * Handles notification-related database operations
 */

const { Notification } = require('../../models_sql');

class NotificationServicePostgres {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Notification.findAndCountAll({
        offset,
        limit,
        where: filters,
        order: [['createdAt', 'DESC']]
      });
      return { success: true, data: rows, total: count };
    } catch (error) {
      console.error('PostgreSQL: Error fetching notifications:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const notification = await Notification.findByPk(id);
      return { success: !!notification, data: notification };
    } catch (error) {
      console.error('PostgreSQL: Error fetching notification:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const notification = await Notification.create(data);
      return { success: true, data: notification };
    } catch (error) {
      console.error('PostgreSQL: Error creating notification:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const [updated] = await Notification.update(data, { where: { id } });
      if (!updated) return { success: false, data: null };
      const notification = await Notification.findByPk(id);
      return { success: true, data: notification };
    } catch (error) {
      console.error('PostgreSQL: Error updating notification:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const deleted = await Notification.destroy({ where: { id } });
      return { success: deleted > 0 };
    } catch (error) {
      console.error('PostgreSQL: Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationServicePostgres;
