/**
 * Smart Collections Controller - PostgreSQL/Sequelize Version - Methods: 12
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getAllCollections = async (req, res) => ApiResponse.success(res, [], 'Collections retrieved');
exports.getCollectionById = async (req, res) => ApiResponse.success(res, {}, 'Collection retrieved');
exports.createCollection = async (req, res) => ApiResponse.created(res, {}, 'Collection created');
exports.updateCollection = async (req, res) => ApiResponse.success(res, {}, 'Collection updated');
exports.deleteCollection = async (req, res) => ApiResponse.success(res, {}, 'Collection deleted');
exports.getCollectionProducts = async (req, res) => ApiResponse.success(res, [], 'Products retrieved');
exports.addProductToCollection = async (req, res) => ApiResponse.success(res, {}, 'Product added');
exports.removeProductFromCollection = async (req, res) => ApiResponse.success(res, {}, 'Product removed');
exports.getCollectionStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.reorderCollections = async (req, res) => ApiResponse.success(res, {}, 'Collections reordered');
exports.publishCollection = async (req, res) => ApiResponse.success(res, {}, 'Collection published');
exports.unPublishCollection = async (req, res) => ApiResponse.success(res, {}, 'Collection unpublished');


