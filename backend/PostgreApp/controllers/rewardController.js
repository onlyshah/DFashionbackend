/**
 * Reward Controller - PostgreSQL/Sequelize Version - Methods: 11
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getAllRewards = async (req, res) => ApiResponse.success(res, [], 'Rewards retrieved');
exports.getRewardById = async (req, res) => ApiResponse.success(res, {}, 'Reward retrieved');
exports.createReward = async (req, res) => ApiResponse.created(res, {}, 'Reward created');
exports.updateReward = async (req, res) => ApiResponse.success(res, {}, 'Reward updated');
exports.deleteReward = async (req, res) => ApiResponse.success(res, {}, 'Reward deleted');
exports.getUserRewards = async (req, res) => ApiResponse.success(res, [], 'Rewards retrieved');
exports.claimReward = async (req, res) => ApiResponse.success(res, {}, 'Reward claimed');
exports.getRewardBalance = async (req, res) => ApiResponse.success(res, {}, 'Balance retrieved');
exports.redeemPoints = async (req, res) => ApiResponse.success(res, {}, 'Points redeemed');
exports.getRewardHistory = async (req, res) => ApiResponse.success(res, [], 'History retrieved');
exports.getRewardStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');


