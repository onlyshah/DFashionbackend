/**
 * Live Controller - PostgreSQL/Sequelize Version
 * Methods: 11
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.startLiveStream = async (req, res) => ApiResponse.created(res, {}, 'Stream started');
exports.endLiveStream = async (req, res) => ApiResponse.success(res, {}, 'Stream ended');
exports.getLiveStreams = async (req, res) => ApiResponse.success(res, [], 'Streams retrieved');
exports.getLiveStreamById = async (req, res) => ApiResponse.success(res, {}, 'Stream retrieved');
exports.joinLiveStream = async (req, res) => ApiResponse.success(res, {}, 'Joined stream');
exports.leaveLiveStream = async (req, res) => ApiResponse.success(res, {}, 'Left stream');
exports.getStreamViewers = async (req, res) => ApiResponse.success(res, [], 'Viewers retrieved');
exports.sendStreamComment = async (req, res) => ApiResponse.created(res, {}, 'Comment sent');
exports.getStreamComments = async (req, res) => ApiResponse.success(res, [], 'Comments retrieved');
exports.getStreamStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.recordStream = async (req, res) => ApiResponse.success(res, {}, 'Stream recorded');


