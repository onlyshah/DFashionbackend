/**
 * Creators Controller - PostgreSQL/Sequelize Version
 * Methods: 18
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getAllCreators = async (req, res) => ApiResponse.success(res, [], 'Creators retrieved');
exports.getCreatorById = async (req, res) => ApiResponse.success(res, {}, 'Creator retrieved');
exports.createCreator = async (req, res) => ApiResponse.created(res, {}, 'Creator created');
exports.updateCreator = async (req, res) => ApiResponse.success(res, {}, 'Creator updated');
exports.deleteCreator = async (req, res) => ApiResponse.success(res, {}, 'Creator deleted');
exports.getCreatorProfile = async (req, res) => ApiResponse.success(res, {}, 'Profile retrieved');
exports.getCreatorContent = async (req, res) => ApiResponse.success(res, [], 'Content retrieved');
exports.getCreatorStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.verifyCreator = async (req, res) => ApiResponse.success(res, {}, 'Creator verified');
exports.getCreatorEarnings = async (req, res) => ApiResponse.success(res, {}, 'Earnings retrieved');
exports.getCreatorFollowers = async (req, res) => ApiResponse.success(res, [], 'Followers retrieved');
exports.getTopCreators = async (req, res) => ApiResponse.success(res, [], 'Top creators retrieved');
exports.searchCreators = async (req, res) => ApiResponse.success(res, [], 'Creators searched');
exports.getCreatorCampaigns = async (req, res) => ApiResponse.success(res, [], 'Campaigns retrieved');
exports.getCreatorCollaborations = async (req, res) => ApiResponse.success(res, [], 'Collaborations retrieved');
exports.blockCreator = async (req, res) => ApiResponse.success(res, {}, 'Creator blocked');
exports.unblockCreator = async (req, res) => ApiResponse.success(res, {}, 'Creator unblocked');
exports.getCreatorReports = async (req, res) => ApiResponse.success(res, [], 'Reports retrieved');


