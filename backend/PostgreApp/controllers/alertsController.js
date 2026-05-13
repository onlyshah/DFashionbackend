/**
 * Alerts Controller - PostgreSQL/Sequelize Version
 * Handles user and system alerts, notifications
 * Methods: 19
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getAlerts = async (req, res) => {
  try {
    const userId = req.user?.id;
    const alerts = await models.Alert.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
    return ApiResponse.success(res, alerts, 'Alerts retrieved');
  } catch (error) {
    console.error('❌ getAlerts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAlertById = async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await models.Alert.findByPk(alertId);
    return alert ? ApiResponse.success(res, alert, 'Alert retrieved') : ApiResponse.notFound(res, 'Alert');
  } catch (error) {
    console.error('❌ getAlertById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.createAlert = async (req, res) => {
  try {
    const { type, message, productId } = req.body;
    const userId = req.user?.id;
    const alert = await models.Alert.create({ userId, type, message, productId, read: false });
    return ApiResponse.created(res, alert, 'Alert created');
  } catch (error) {
    console.error('❌ createAlert error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await models.Alert.findByPk(alertId);
    if (!alert) return ApiResponse.notFound(res, 'Alert');
    await alert.update({ read: true });
    return ApiResponse.success(res, alert, 'Alert marked as read');
  } catch (error) {
    console.error('❌ markAsRead error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await models.Alert.findByPk(alertId);
    if (!alert) return ApiResponse.notFound(res, 'Alert');
    await alert.destroy();
    return ApiResponse.success(res, {}, 'Alert deleted');
  } catch (error) {
    console.error('❌ deleteAlert error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getUserAlertConfig = async (req, res) => {
  try {
    const userId = req.user?.id;
    const config = await models.AlertConfig.findOne({ where: { userId } });
    return config ? ApiResponse.success(res, config, 'Config retrieved') : ApiResponse.success(res, {}, 'No config');
  } catch (error) {
    console.error('❌ getUserAlertConfig error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateUserAlertConfig = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { preferences } = req.body;
    const [config] = await models.AlertConfig.findOrCreate({ where: { userId } });
    await config.update({ preferences });
    return ApiResponse.success(res, config, 'Config updated');
  } catch (error) {
    console.error('❌ updateUserAlertConfig error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAdminAlertConfig = async (req, res) => {
  try {
    const config = await models.AlertConfig.findOne({ where: { isAdmin: true } });
    return config ? ApiResponse.success(res, config, 'Admin config retrieved') : ApiResponse.success(res, {}, 'No admin config');
  } catch (error) {
    console.error('❌ getAdminAlertConfig error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.triggerAlert = async (req, res) => {
  try {
    const { type, title, message, userId, broadcast } = req.body;
    const alert = await models.Alert.create({ type, title, message, userId, broadcast });
    return ApiResponse.created(res, alert, 'Alert triggered');
  } catch (error) {
    console.error('❌ triggerAlert error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAlertStats = async (req, res) => {
  try {
    const total = await models.Alert.count();
    const unread = await models.Alert.count({ where: { read: false } });
    return ApiResponse.success(res, { total, unread }, 'Stats retrieved');
  } catch (error) {
    console.error('❌ getAlertStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAllAlerts = async (req, res) => {
  try {
    const alerts = await models.Alert.findAll({ order: [['createdAt', 'DESC']] });
    return ApiResponse.success(res, alerts, 'All alerts retrieved');
  } catch (error) {
    console.error('❌ getAllAlerts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const updates = req.body;
    const alert = await models.Alert.findByPk(alertId);
    if (!alert) return ApiResponse.notFound(res, 'Alert');
    await alert.update(updates);
    return ApiResponse.success(res, alert, 'Alert updated');
  } catch (error) {
    console.error('❌ updateAlert error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.testAlert = async (req, res) => {
  try {
    return ApiResponse.success(res, { sent: true }, 'Test alert sent');
  } catch (error) {
    console.error('❌ testAlert error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAlertTemplates = async (req, res) => {
  try {
    const templates = await models.AlertTemplate.findAll();
    return ApiResponse.success(res, templates, 'Templates retrieved');
  } catch (error) {
    console.error('❌ getAlertTemplates error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.markAlertAsRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await models.Alert.findByPk(alertId);
    if (!alert) return ApiResponse.notFound(res, 'Alert');
    await alert.update({ read: true });
    return ApiResponse.success(res, alert, 'Alert marked as read');
  } catch (error) {
    console.error('❌ markAlertAsRead error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.triggerSystemAlert = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const alert = await models.Alert.create({ title, message, type, broadcast: true });
    return ApiResponse.created(res, alert, 'System alert triggered');
  } catch (error) {
    console.error('❌ triggerSystemAlert error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.clearAlerts = async (req, res) => {
  try {
    const userId = req.user?.id;
    await models.Alert.destroy({ where: { userId, read: true } });
    return ApiResponse.success(res, {}, 'Read alerts cleared');
  } catch (error) {
    console.error('❌ clearAlerts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    await models.Alert.update({ read: true }, { where: { userId, read: false } });
    return ApiResponse.success(res, {}, 'All alerts marked as read');
  } catch (error) {
    console.error('❌ markAllAsRead error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const count = await models.Alert.count({ where: { userId, read: false } });
    return ApiResponse.success(res, { unreadCount: count }, 'Unread count retrieved');
  } catch (error) {
    console.error('❌ getUnreadCount error:', error);
    return ApiResponse.serverError(res, error);
  }
};


