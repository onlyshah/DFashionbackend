/**
 * Product Shares Controller - PostgreSQL/Sequelize - Methods: 6
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.shareProduct = async (req, res) => ApiResponse.created(res, {}, 'Product shared');
exports.getShares = async (req, res) => ApiResponse.success(res, [], 'Shares retrieved');
exports.getShareCount = async (req, res) => ApiResponse.success(res, {}, 'Count retrieved');
exports.trackShare = async (req, res) => ApiResponse.success(res, {}, 'Share tracked');
exports.getShareStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.getMostShared = async (req, res) => ApiResponse.success(res, [], 'Most shared retrieved');


