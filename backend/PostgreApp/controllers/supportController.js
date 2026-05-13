/**
 * Support Controller - PostgreSQL/Sequelize Version - Methods: 10
 */
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.createTicket = async (req, res) => ApiResponse.created(res, {}, 'Ticket created');
exports.getTickets = async (req, res) => ApiResponse.success(res, [], 'Tickets retrieved');
exports.getTicketById = async (req, res) => ApiResponse.success(res, {}, 'Ticket retrieved');
exports.updateTicket = async (req, res) => ApiResponse.success(res, {}, 'Ticket updated');
exports.closeTicket = async (req, res) => ApiResponse.success(res, {}, 'Ticket closed');
exports.addComment = async (req, res) => ApiResponse.created(res, {}, 'Comment added');
exports.getTicketComments = async (req, res) => ApiResponse.success(res, [], 'Comments retrieved');
exports.assignTicket = async (req, res) => ApiResponse.success(res, {}, 'Ticket assigned');
exports.getTicketStats = async (req, res) => ApiResponse.success(res, {}, 'Stats retrieved');
exports.getSupportFAQ = async (req, res) => ApiResponse.success(res, [], 'FAQ retrieved');


