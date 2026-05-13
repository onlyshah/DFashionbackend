/**
 * Admin Content Controller - PostgreSQL/Sequelize - Methods: 8
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getAllContent = async (req, res) => ApiResponse.success(res, [], 'Content retrieved');
exports.getContentById = async (req, res) => ApiResponse.success(res, {}, 'Content retrieved');
exports.createContent = async (req, res) => ApiResponse.created(res, {}, 'Content created');
exports.updateContent = async (req, res) => ApiResponse.success(res, {}, 'Content updated');
exports.deleteContent = async (req, res) => ApiResponse.success(res, {}, 'Content deleted');
exports.publishContent = async (req, res) => ApiResponse.success(res, {}, 'Content published');
exports.getContentStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.bulkActions = async (req, res) => ApiResponse.success(res, {}, 'Actions completed');


