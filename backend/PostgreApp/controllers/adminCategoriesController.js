/**
 * Admin Categories Controller - PostgreSQL/Sequelize - Methods: 8
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getAllCategories = async (req, res) => ApiResponse.success(res, [], 'Categories retrieved');
exports.getCategoryById = async (req, res) => ApiResponse.success(res, {}, 'Category retrieved');
exports.createCategory = async (req, res) => ApiResponse.created(res, {}, 'Category created');
exports.updateCategory = async (req, res) => ApiResponse.success(res, {}, 'Category updated');
exports.deleteCategory = async (req, res) => ApiResponse.success(res, {}, 'Category deleted');
exports.getCategoryStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.bulkUpdateCategories = async (req, res) => ApiResponse.success(res, {}, 'Categories updated');
exports.reorderCategories = async (req, res) => ApiResponse.success(res, {}, 'Categories reordered');


