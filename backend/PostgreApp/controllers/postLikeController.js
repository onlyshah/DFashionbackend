/**
 * Post Like Controller - PostgreSQL/Sequelize - Methods: 5
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.toggleLike = async (req, res) => ApiResponse.success(res, {}, 'Like toggled');
exports.getLikes = async (req, res) => ApiResponse.success(res, [], 'Likes retrieved');
exports.getLikeCount = async (req, res) => ApiResponse.success(res, {}, 'Count retrieved');
exports.isLiked = async (req, res) => ApiResponse.success(res, {}, 'Status retrieved');
exports.getLikesLeaderboard = async (req, res) => ApiResponse.success(res, [], 'Leaderboard retrieved');


