/**
 * Notifications Extended Controller - Complete MongoDB Implementation (Phase 8)
 * 3 additional notification methods
 */

const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get notification preferences
 */
exports.getNotificationPreferences = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    let preferences = await NotificationPreference.findOne({ userId: req.user._id });

    if (!preferences) {
      // Create default preferences
      preferences = await NotificationPreference.create({
        userId: req.user._id,
        email: true,
        push: true,
        sms: true,
        inApp: true,
        follow: true,
        like: true,
        comment: true,
        orderStatus: true,
        newProducts: true,
        promotions: true
      });
    }

    return ApiResponse.success(res, preferences, 'Notification preferences retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update notification preferences
 */
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const preferences = await NotificationPreference.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { ...req.body, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    return ApiResponse.success(res, preferences, 'Notification preferences updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Send bulk notification (Admin only)
 */
exports.sendBulkNotification = async (req, res, next) => {
  try {
    const { userFilter = {}, message, title, data = {} } = req.body;

    if (!message || !title) {
      throw new ApiError('Message and title are required', 400, 'VALIDATION_ERROR');
    }

    // Find users matching filter
    const users = await User.find(userFilter).select('_id email');

    if (users.length === 0) {
      throw new ApiError('No users match the filter', 400, 'NO_USERS');
    }

    // Create notifications for all matching users
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      type: 'system',
      data,
      createdAt: new Date()
    }));

    await Notification.insertMany(notifications);

    // In production, queue for email/push sending

    return ApiResponse.success(res, {
      notificationsSent: notifications.length,
      userCount: users.length
    }, 'Bulk notification sent');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
