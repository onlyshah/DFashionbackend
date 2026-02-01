/**
 * Notification Service - MongoDB Implementation
 * Handles notification-related database operations
 */

const Notification = require('../../models/Notification');

class NotificationServiceMongoDB {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Notification.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Notification.countDocuments(filters)
      ]);
      return { success: true, data, total };
    } catch (error) {
      console.error('MongoDB: Error fetching notifications:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const notification = await Notification.findById(id);
      return { success: !!notification, data: notification };
    } catch (error) {
      console.error('MongoDB: Error fetching notification:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const notification = await Notification.create(data);
      return { success: true, data: notification };
    } catch (error) {
      console.error('MongoDB: Error creating notification:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const notification = await Notification.findByIdAndUpdate(id, data, { new: true });
      return { success: !!notification, data: notification };
    } catch (error) {
      console.error('MongoDB: Error updating notification:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const result = await Notification.findByIdAndDelete(id);
      return { success: !!result };
    } catch (error) {
      console.error('MongoDB: Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationServiceMongoDB;
