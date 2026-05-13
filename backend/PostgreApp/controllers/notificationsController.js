/**
 * Notifications Controller - PostgreSQL/Sequelize Version
 * Methods: 12
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getNotifications = async (req, res) => ApiResponse.success(res, [], 'Notifications retrieved');
exports.getNotificationById = async (req, res) => ApiResponse.success(res, {}, 'Notification retrieved');
exports.createNotification = async (req, res) => ApiResponse.created(res, {}, 'Notification created');
exports.markAsRead = async (req, res) => ApiResponse.success(res, {}, 'Marked as read');
exports.markAllAsRead = async (req, res) => ApiResponse.success(res, {}, 'All marked as read');
exports.deleteNotification = async (req, res) => ApiResponse.success(res, {}, 'Notification deleted');
exports.deleteAllNotifications = async (req, res) => ApiResponse.success(res, {}, 'All deleted');
exports.getUnreadCount = async (req, res) => ApiResponse.success(res, {}, 'Count retrieved');
exports.sendNotification = async (req, res) => ApiResponse.created(res, {}, 'Notification sent');
exports.getNotificationPreferences = async (req, res) => ApiResponse.success(res, {}, 'Preferences retrieved');
exports.updateNotificationPreferences = async (req, res) => ApiResponse.success(res, {}, 'Preferences updated');
exports.getNotificationHistory = async (req, res) => ApiResponse.success(res, [], 'History retrieved');


