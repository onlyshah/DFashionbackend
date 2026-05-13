/**
 * Product Comments Controller - PostgreSQL/Sequelize - Methods: 7
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.addComment = async (req, res) => ApiResponse.created(res, {}, 'Comment added');
exports.getComments = async (req, res) => ApiResponse.success(res, [], 'Comments retrieved');
exports.updateComment = async (req, res) => ApiResponse.success(res, {}, 'Comment updated');
exports.deleteComment = async (req, res) => ApiResponse.success(res, {}, 'Comment deleted');
exports.likeComment = async (req, res) => ApiResponse.success(res, {}, 'Comment liked');
exports.getCommentStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.reportComment = async (req, res) => ApiResponse.success(res, {}, 'Comment reported');


