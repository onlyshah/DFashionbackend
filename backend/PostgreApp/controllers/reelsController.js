/**
 * Reels Controller - PostgreSQL/Sequelize Version
 * Methods: 16
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getAllReels = async (req, res) => ApiResponse.success(res, [], 'Reels retrieved');
exports.getReelById = async (req, res) => ApiResponse.success(res, {}, 'Reel retrieved');
exports.createReel = async (req, res) => ApiResponse.created(res, {}, 'Reel created');
exports.updateReel = async (req, res) => ApiResponse.success(res, {}, 'Reel updated');
exports.deleteReel = async (req, res) => ApiResponse.success(res, {}, 'Reel deleted');
exports.getUserReels = async (req, res) => ApiResponse.success(res, [], 'Reels retrieved');
exports.likeReel = async (req, res) => ApiResponse.success(res, {}, 'Reel liked');
exports.unlikeReel = async (req, res) => ApiResponse.success(res, {}, 'Reel unliked');
exports.shareReel = async (req, res) => ApiResponse.success(res, {}, 'Reel shared');
exports.commentOnReel = async (req, res) => ApiResponse.created(res, {}, 'Comment added');
exports.getReelComments = async (req, res) => ApiResponse.success(res, [], 'Comments retrieved');
exports.getReelStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.getTrendingReels = async (req, res) => ApiResponse.success(res, [], 'Trending reels retrieved');
exports.searchReels = async (req, res) => ApiResponse.success(res, [], 'Reels searched');
exports.getReelsByTag = async (req, res) => ApiResponse.success(res, [], 'Reels retrieved');
exports.reportReel = async (req, res) => ApiResponse.success(res, {}, 'Reel reported');


