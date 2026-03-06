const { sendResponse, sendError } = require('../utils/response');
const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const { formatPaginatedResponse, formatSingleResponse, buildIncludeClause, validateMultipleFK } = require('../utils/fkResponseFormatter');

const returnsController = {
  // Create return request
  createReturn: async (req, res) => {
    try {
      const { orderId, reason, items } = req.body;
      if (!orderId) {
        return sendError(res, 'orderId required', 422);
      }

      // validate foreign keys
      const validation = await validateMultipleFK([
        { model: 'Order', id: orderId },
        { model: 'User', id: req.user.id }
      ]);
      if (!validation.isValid) {
        return sendError(res, validation.errors.join('; '), 400);
      }

      const order = await models.Order.findByPk(orderId);
      if (!order) {
        return sendError(res, 'Order not found', 404);
      }
      if (order.user_id !== req.user.id && !['admin','super_admin'].includes(req.user.role)) {
        return sendError(res, 'Cannot return another user\'s order', 403);
      }

      const record = await models.Return.create({
        orderId,
        userId: req.user.id,
        reason,
        items: items || []
      });

      const result = await models.Return.findByPk(record.id, { include: buildIncludeClause('Return') });
      return sendResponse(res, 201, true, result, 'Return request created successfully', 'RETURN_CREATED');
    } catch (error) {
      console.error('Create return error:', error);
      sendError(res, 500, 'Failed to create return request', error.message);
    }
  },

  // Get user's returns
  getMyReturns: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await models.Return.findAndCountAll({
        where: { userId: req.user.id },
        include: buildIncludeClause('Return'),
        limit: parseInt(limit),
        offset,
        distinct: true
      });
      const response = formatPaginatedResponse(rows, { page, limit, total: count, totalPages: Math.ceil(count/limit) });
      return sendResponse(res, 200, true, response.data, 'Returns fetched successfully', 'RETURNS_FETCHED', response.pagination);
    } catch (error) {
      console.error('Get returns error:', error);
      sendError(res, 500, 'Failed to fetch returns', error.message);
    }
  },

  // Get return details
  getReturnDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const record = await models.Return.findByPk(id, { include: buildIncludeClause('Return') });
      if (!record) {
        return sendError(res, 'Return not found', 404);
      }
      if (record.userId !== req.user.id && !['admin','super_admin'].includes(req.user.role)) {
        return sendError(res, 'Cannot view this return', 403);
      }
      return sendResponse(res, 200, true, record, 'Return details fetched', 'RETURN_FETCHED');
    } catch (error) {
      console.error('Get return details error:', error);
      sendError(res, 500, 'Failed to fetch return details', error.message);
    }
  },

  // Admin: Get all returns
  getAllReturns: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const { count, rows } = await models.Return.findAndCountAll({
        include: buildIncludeClause('Return'),
        limit: parseInt(limit),
        offset,
        distinct: true
      });
      const response = formatPaginatedResponse(rows, { page, limit, total: count, totalPages: Math.ceil(count/limit) });
      return sendResponse(res, 200, true, response.data, 'All returns fetched', 'RETURNS_FETCHED', response.pagination);
    } catch (error) {
      console.error('Get all returns error:', error);
      sendError(res, 500, 'Failed to fetch returns', error.message);
    }
  },

  // Admin: Approve return
  approveReturn: async (req, res) => {
    try {
      const { id } = req.params;
      const { approvedAmount } = req.body;
      const record = await models.Return.findByPk(id);
      if (!record) return sendError(res, 'Return not found', 404);
      await record.update({ status: 'approved', refundAmount: approvedAmount });
      return sendResponse(res, 200, true, record, 'Return approved successfully', 'RETURN_APPROVED');
    } catch (error) {
      console.error('Approve return error:', error);
      sendError(res, 500, 'Failed to approve return', error.message);
    }
  },

  // Admin: Reject return
  rejectReturn: async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const record = await models.Return.findByPk(id);
      if (!record) return sendError(res, 'Return not found', 404);
      await record.update({ status: 'rejected', rejectionReason });
      return sendResponse(res, 200, true, record, 'Return rejected successfully', 'RETURN_REJECTED');
    } catch (error) {
      console.error('Reject return error:', error);
      sendError(res, 500, 'Failed to reject return', error.message);
    }
  },

  // Admin: Ship return
  shipReturn: async (req, res) => {
    try {
      const { id } = req.params;
      const { courierId, trackingNumber } = req.body;
      const record = await models.Return.findByPk(id);
      if (!record) return sendError(res, 'Return not found', 404);
      await record.update({ status: 'shipped', courierId, trackingNumber });
      return sendResponse(res, 200, true, record, 'Return shipped successfully', 'RETURN_SHIPPED');
    } catch (error) {
      console.error('Ship return error:', error);
      sendError(res, 500, 'Failed to ship return', error.message);
    }
  },

  // Admin: Receive return and process refund
  receiveReturn: async (req, res) => {
    try {
      const { id } = req.params;
      const { refundMethod } = req.body;
      const record = await models.Return.findByPk(id);
      if (!record) return sendError(res, 'Return not found', 404);
      await record.update({ status: 'completed', refundMethod });
      return sendResponse(res, 200, true, record, 'Return received and refund processed', 'RETURN_COMPLETED');
    } catch (error) {
      console.error('Receive return error:', error);
      sendError(res, 500, 'Failed to complete return', error.message);
    }
  },

  // Admin: Update return status
  updateReturn: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const record = await models.Return.findByPk(id);
      if (!record) return sendError(res, 'Return not found', 404);
      await record.update(updates);
      return sendResponse(res, 200, true, record, 'Return updated successfully', 'RETURN_UPDATED');
    } catch (error) {
      console.error('Update return error:', error);
      sendError(res, 500, 'Failed to update return', error.message);
    }
  }
};

module.exports = returnsController;
