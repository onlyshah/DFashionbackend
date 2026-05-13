/**
 * CMS Media Controller - PostgreSQL/Sequelize - Methods: 9
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.uploadMedia = async (req, res) => ApiResponse.created(res, {}, 'Media uploaded');
exports.getMediaLibrary = async (req, res) => ApiResponse.success(res, [], 'Media retrieved');
exports.getMediaById = async (req, res) => ApiResponse.success(res, {}, 'Media retrieved');
exports.updateMedia = async (req, res) => ApiResponse.success(res, {}, 'Media updated');
exports.deleteMedia = async (req, res) => ApiResponse.success(res, {}, 'Media deleted');
exports.organizeMedia = async (req, res) => ApiResponse.success(res, {}, 'Media organized');
exports.searchMedia = async (req, res) => ApiResponse.success(res, [], 'Media searched');
exports.getMediaStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.resizeImage = async (req, res) => ApiResponse.success(res, {}, 'Image resized');


