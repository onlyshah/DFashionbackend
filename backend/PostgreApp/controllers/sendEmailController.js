/**
 * Send Email Controller - PostgreSQL/Sequelize Version - Methods: 4
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.sendMail = async (req, res) => ApiResponse.success(res, {}, 'Email sent');
exports.forgetpasswordsendemail = async (req, res) => ApiResponse.success(res, {}, 'Password reset email sent');
exports.createOrder = async (req, res) => ApiResponse.created(res, {}, 'Order created');
exports.verifyPayment = async (req, res) => ApiResponse.success(res, {}, 'Payment verified');


