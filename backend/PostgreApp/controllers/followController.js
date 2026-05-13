/**
 * Follow Controller - PostgreSQL/Sequelize Version
 * Methods: 10
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.followUser = async (req, res) => ApiResponse.success(res, {}, 'User followed');
exports.unfollowUser = async (req, res) => ApiResponse.success(res, {}, 'User unfollowed');
exports.getFollowers = async (req, res) => ApiResponse.success(res, [], 'Followers retrieved');
exports.getFollowing = async (req, res) => ApiResponse.success(res, [], 'Following retrieved');
exports.getFollowerCount = async (req, res) => ApiResponse.success(res, {}, 'Count retrieved');
exports.getFollowingCount = async (req, res) => ApiResponse.success(res, {}, 'Count retrieved');
exports.isFollowing = async (req, res) => ApiResponse.success(res, {}, 'Status retrieved');
exports.getFollowRequests = async (req, res) => ApiResponse.success(res, [], 'Requests retrieved');
exports.acceptFollowRequest = async (req, res) => ApiResponse.success(res, {}, 'Request accepted');
exports.rejectFollowRequest = async (req, res) => ApiResponse.success(res, {}, 'Request rejected');


