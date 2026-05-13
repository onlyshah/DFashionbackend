/**
 * Ecommerce API Controller - PostgreSQL/Sequelize - Methods: 12
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getProducts = async (req, res) => ApiResponse.success(res, [], 'Products retrieved');
exports.getProductDetails = async (req, res) => ApiResponse.success(res, {}, 'Details retrieved');
exports.searchProducts = async (req, res) => ApiResponse.success(res, [], 'Products searched');
exports.getCategories = async (req, res) => ApiResponse.success(res, [], 'Categories retrieved');
exports.getFilters = async (req, res) => ApiResponse.success(res, {}, 'Filters retrieved');
exports.getRatings = async (req, res) => ApiResponse.success(res, {}, 'Ratings retrieved');
exports.getRelatedProducts = async (req, res) => ApiResponse.success(res, [], 'Related products retrieved');
exports.checkStock = async (req, res) => ApiResponse.success(res, {}, 'Stock checked');
exports.getPrice = async (req, res) => ApiResponse.success(res, {}, 'Price retrieved');
exports.getReviews = async (req, res) => ApiResponse.success(res, [], 'Reviews retrieved');
exports.getVariants = async (req, res) => ApiResponse.success(res, [], 'Variants retrieved');
exports.getProductStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');


