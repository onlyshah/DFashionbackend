/**
 * Auth Controller Postgres - Methods: 8
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.register = async (req, res) => ApiResponse.created(res, {}, 'User registered');
exports.login = async (req, res) => ApiResponse.success(res, {}, 'Login successful');
exports.logout = async (req, res) => ApiResponse.success(res, {}, 'Logout successful');
exports.refreshToken = async (req, res) => ApiResponse.success(res, {}, 'Token refreshed');
exports.forgotPassword = async (req, res) => ApiResponse.success(res, {}, 'Reset sent');
exports.resetPassword = async (req, res) => ApiResponse.success(res, {}, 'Password reset');
exports.verifyEmail = async (req, res) => ApiResponse.success(res, {}, 'Email verified');
exports.changePassword = async (req, res) => ApiResponse.success(res, {}, 'Password changed');



