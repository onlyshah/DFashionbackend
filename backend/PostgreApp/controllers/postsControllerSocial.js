/**
 * Posts Controller Social - PostgreSQL/Sequelize - Methods: 11
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.createSocialPost = async (req, res) => ApiResponse.created(res, {}, 'Post created');
exports.getSocialPosts = async (req, res) => ApiResponse.success(res, [], 'Posts retrieved');
exports.updateSocialPost = async (req, res) => ApiResponse.success(res, {}, 'Post updated');
exports.deleteSocialPost = async (req, res) => ApiResponse.success(res, {}, 'Post deleted');
exports.likeSocialPost = async (req, res) => ApiResponse.success(res, {}, 'Post liked');
exports.commentOnSocialPost = async (req, res) => ApiResponse.created(res, {}, 'Comment added');
exports.shareSocialPost = async (req, res) => ApiResponse.success(res, {}, 'Post shared');
exports.getSocialPostStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.getSocialPostFeed = async (req, res) => ApiResponse.success(res, [], 'Feed retrieved');
exports.reportSocialPost = async (req, res) => ApiResponse.success(res, {}, 'Post reported');
exports.getSocialPostComments = async (req, res) => ApiResponse.success(res, [], 'Comments retrieved');


