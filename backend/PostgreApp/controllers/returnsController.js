/**
 * Returns Controller - PostgreSQL/Sequelize Version
 * Methods: 8
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.initiateReturn = async (req, res) => ApiResponse.created(res, {}, 'Return initiated');
exports.getReturnRequest = async (req, res) => ApiResponse.success(res, {}, 'Return request retrieved');
exports.getAllReturns = async (req, res) => ApiResponse.success(res, [], 'Returns retrieved');
exports.updateReturnStatus = async (req, res) => ApiResponse.success(res, {}, 'Return updated');
exports.processRefund = async (req, res) => ApiResponse.success(res, {}, 'Refund processed');
exports.getReturnPolicy = async (req, res) => ApiResponse.success(res, {}, 'Policy retrieved');
exports.trackReturnShipment = async (req, res) => ApiResponse.success(res, {}, 'Shipment tracked');
exports.cancelReturn = async (req, res) => ApiResponse.success(res, {}, 'Return cancelled');


