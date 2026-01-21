const express = require('express');
const router = express.Router();
const { auth, requireCustomer } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');

// Try to load Mongoose models, but handle PostgreSQL gracefully
let ReturnModel, Order, Payment;
try {
  ReturnModel = require('../models/Return');
  Order = require('../models/Order');
  Payment = require('../models/Payment');
} catch (e) {
  console.warn('[returns] MongoDB models not available, will use safe defaults');
}

// Safe models with fallback
const getModels = () => {
  try {
    const models = require('../models_sql');
    return {
      Return: models._raw?.Return || models.Return,
      Order: models._raw?.Order || models.Order,
      Payment: models._raw?.Payment || models.Payment
    };
  } catch (e) {
    return { Return: null, Order: null, Payment: null };
  }
};

const timestamp = () => new Date().toISOString();

// Standardized response helper
const sendResponse = (res, statusCode, success, data = null, message = '', code = '') => {
  res.status(statusCode).json({
    success,
    data,
    message,
    code: code || statusCode,
    timestamp: timestamp()
  });
};

// ============================================================
// CUSTOMER ROUTES - Create return request
// ============================================================
router.post(
  '/',
  auth,
  requireCustomer,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('reason').notEmpty().withMessage('Return reason is required'),
    body('items').isArray().notEmpty().withMessage('Items array is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { orderId, reason, items, comments } = req.body;

      // Verify order exists and belongs to customer
      const order = await Order.findById(orderId);
      if (!order) {
        return sendResponse(res, 404, false, null, 'Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.customer.toString() !== req.user.userId) {
        return sendResponse(res, 403, false, null, 'Access denied', 'ACCESS_DENIED');
      }

      // Check if order is eligible for return (status: delivered, within return window)
      if (!['delivered', 'completed'].includes(order.status)) {
        return sendResponse(res, 400, false, null, 'Order not eligible for return', 'INELIGIBLE_ORDER');
      }

      const returnRequest = new ReturnModel({
        orderId,
        customerId: req.user.userId,
        items,
        returnType: 'return',
        reason,
        comments,
        status: 'requested',
        returnInitiatedAt: new Date(),
        returnDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        audits: [{
          actor: req.user.userId,
          action: 'initiated',
          timestamp: new Date(),
          notes: reason
        }]
      });

      await returnRequest.save();
      sendResponse(res, 201, true, returnRequest, 'Return request created successfully', 'RETURN_CREATED');
    } catch (error) {
      console.error('Create return error:', error);
      sendResponse(res, 500, false, null, 'Failed to create return request', 'CREATE_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - List all returns with filtering
// ============================================================
router.get(
  '/',
  verifyAdminToken,
  requirePermission('returns', 'view'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sqlModels = getModels();

      // Try SQL first
      if (sqlModels.Return && sqlModels.Return.findAll) {
        try {
          const { count, rows } = await sqlModels.Return.findAndCountAll({
            limit: parseInt(limit),
            offset: skip,
            order: [['createdAt', 'DESC']],
            raw: true
          });

          return sendResponse(res, 200, true, {
            returns: rows || [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(count / parseInt(limit)),
              totalItems: count,
              hasNextPage: page < Math.ceil(count / parseInt(limit)),
              hasPrevPage: page > 1
            }
          }, 'Returns fetched successfully', 'RETURNS_FETCHED');
        } catch (sqlErr) {
          console.warn('[returns] SQL query failed:', sqlErr.message);
        }
      }

      // Fallback: MongoDB
      if (ReturnModel && ReturnModel.find) {
        const filter = {};
        if (status) filter.status = status;
        const sortOptions = { createdAt: -1 };

        const returns = await ReturnModel.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean();

        const total = await ReturnModel.countDocuments(filter);

        return sendResponse(res, 200, true, {
          returns,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            hasNextPage: page < Math.ceil(total / parseInt(limit)),
            hasPrevPage: page > 1
          }
        }, 'Returns fetched successfully', 'RETURNS_FETCHED');
      }

      // No models available - return empty safe response
      return sendResponse(res, 200, true, {
        returns: [],
        pagination: { currentPage: parseInt(page), totalPages: 0, totalItems: 0, hasNextPage: false, hasPrevPage: false }
      }, 'Returns service unavailable', 'SERVICE_UNAVAILABLE');
    } catch (error) {
      console.error('List returns error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch returns', 'FETCH_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Get return details
// ============================================================
router.get(
  '/:id',
  verifyAdminToken,
  requirePermission('returns', 'view'),
  async (req, res) => {
    try {
      const sqlModels = getModels();

      // Try SQL first
      if (sqlModels.Return && sqlModels.Return.findByPk) {
        try {
          const returnRequest = await sqlModels.Return.findByPk(req.params.id);
          if (returnRequest) {
            return sendResponse(res, 200, true, returnRequest, 'Return request fetched successfully', 'RETURN_FETCHED');
          }
        } catch (sqlErr) {
          console.warn('[returns/:id] SQL query failed:', sqlErr.message);
        }
      }

      // Fallback: MongoDB
      if (ReturnModel && ReturnModel.findById) {
        const returnRequest = await ReturnModel.findById(req.params.id);
        if (returnRequest) {
          return sendResponse(res, 200, true, returnRequest, 'Return request fetched successfully', 'RETURN_FETCHED');
        }
      }

      return sendResponse(res, 404, false, null, 'Return request not found', 'NOT_FOUND');
    } catch (error) {
      console.error('Get return error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch return request', 'FETCH_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Approve return request
// ============================================================
router.post(
  '/:id/approve',
  verifyAdminToken,
  requirePermission('returns', 'manage'),
  [body('approvedAmount').optional().isFloat({ min: 0 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const returnRequest = await ReturnModel.findById(req.params.id);
      if (!returnRequest) {
        return sendResponse(res, 404, false, null, 'Return request not found', 'NOT_FOUND');
      }

      if (returnRequest.status !== 'requested') {
        return sendResponse(res, 400, false, null, 'Return already processed', 'ALREADY_PROCESSED');
      }

      returnRequest.status = 'approved';
      returnRequest.approvedAmount = req.body.approvedAmount || returnRequest.estimatedRefundAmount;
      returnRequest.approvedAt = new Date();
      returnRequest.approvedBy = req.user._id;
      returnRequest.audits.push({
        actor: req.user._id,
        action: 'approved',
        timestamp: new Date(),
        notes: req.body.approvalNotes || 'Approved by admin'
      });

      await returnRequest.save();
      sendResponse(res, 200, true, returnRequest, 'Return request approved successfully', 'RETURN_APPROVED');
    } catch (error) {
      console.error('Approve return error:', error);
      sendResponse(res, 500, false, null, 'Failed to approve return', 'APPROVAL_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Reject return request
// ============================================================
router.post(
  '/:id/reject',
  verifyAdminToken,
  requirePermission('returns', 'manage'),
  [body('rejectionReason').notEmpty().withMessage('Rejection reason is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const returnRequest = await ReturnModel.findById(req.params.id);
      if (!returnRequest) {
        return sendResponse(res, 404, false, null, 'Return request not found', 'NOT_FOUND');
      }

      if (returnRequest.status !== 'requested') {
        return sendResponse(res, 400, false, null, 'Return already processed', 'ALREADY_PROCESSED');
      }

      returnRequest.status = 'rejected';
      returnRequest.rejectionReason = req.body.rejectionReason;
      returnRequest.rejectedAt = new Date();
      returnRequest.rejectedBy = req.user._id;
      returnRequest.audits.push({
        actor: req.user._id,
        action: 'rejected',
        timestamp: new Date(),
        notes: req.body.rejectionReason
      });

      await returnRequest.save();
      sendResponse(res, 200, true, returnRequest, 'Return request rejected successfully', 'RETURN_REJECTED');
    } catch (error) {
      console.error('Reject return error:', error);
      sendResponse(res, 500, false, null, 'Failed to reject return', 'REJECTION_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Generate return shipment label
// ============================================================
router.post(
  '/:id/ship',
  verifyAdminToken,
  requirePermission('returns', 'manage'),
  [
    body('courierId').notEmpty().withMessage('Courier is required'),
    body('trackingNumber').notEmpty().withMessage('Tracking number is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const returnRequest = await ReturnModel.findById(req.params.id);
      if (!returnRequest) {
        return sendResponse(res, 404, false, null, 'Return request not found', 'NOT_FOUND');
      }

      if (returnRequest.status !== 'approved') {
        return sendResponse(res, 400, false, null, 'Return not approved yet', 'NOT_APPROVED');
      }

      returnRequest.status = 'shipped';
      returnRequest.returnShipmentId = req.body.trackingNumber;
      returnRequest.courierId = req.body.courierId;
      returnRequest.shippedAt = new Date();
      returnRequest.audits.push({
        actor: req.user._id,
        action: 'shipped',
        timestamp: new Date(),
        notes: `Shipped via ${req.body.courierId} with tracking ${req.body.trackingNumber}`
      });

      await returnRequest.save();
      sendResponse(res, 200, true, returnRequest, 'Return shipment initiated successfully', 'RETURN_SHIPPED');
    } catch (error) {
      console.error('Ship return error:', error);
      sendResponse(res, 500, false, null, 'Failed to initiate return shipment', 'SHIP_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Mark return as received and process refund
// ============================================================
router.post(
  '/:id/receive',
  verifyAdminToken,
  requirePermission('returns', 'manage'),
  [
    body('refundMethod').isIn(['original_payment', 'wallet', 'bank']).withMessage('Invalid refund method'),
    body('receivedCondition').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const returnRequest = await ReturnModel.findById(req.params.id);
      if (!returnRequest) {
        return sendResponse(res, 404, false, null, 'Return request not found', 'NOT_FOUND');
      }

      if (returnRequest.status !== 'shipped') {
        return sendResponse(res, 400, false, null, 'Return not shipped yet', 'NOT_SHIPPED');
      }

      returnRequest.status = 'received';
      returnRequest.receivedAt = new Date();
      returnRequest.receivedBy = req.user._id;
      returnRequest.audits.push({
        actor: req.user._id,
        action: 'received',
        timestamp: new Date(),
        notes: `Received at warehouse. Condition: ${req.body.receivedCondition || 'normal'}`
      });

      // Process refund
      returnRequest.refund = {
        amount: returnRequest.approvedAmount || returnRequest.estimatedRefundAmount,
        method: req.body.refundMethod,
        processedAt: new Date(),
        processedBy: req.user._id,
        referenceId: `REF-${Date.now()}`
      };

      returnRequest.status = 'completed';
      returnRequest.completedAt = new Date();
      returnRequest.audits.push({
        actor: req.user._id,
        action: 'completed',
        timestamp: new Date(),
        notes: `Refund processed: ${req.body.refundMethod}`
      });

      await returnRequest.save();

      // Update order status if needed
      const order = await Order.findById(returnRequest.orderId);
      if (order) {
        order.returnStatus = 'completed';
        await order.save();
      }

      sendResponse(res, 200, true, returnRequest, 'Return completed and refund processed', 'RETURN_COMPLETED');
    } catch (error) {
      console.error('Receive return error:', error);
      sendResponse(res, 500, false, null, 'Failed to complete return', 'RECEIVE_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Update return status manually
// ============================================================
router.put(
  '/:id',
  verifyAdminToken,
  requirePermission('returns', 'manage'),
  async (req, res) => {
    try {
      const { status, notes } = req.body;
      const validStatuses = ['requested', 'approved', 'rejected', 'shipped', 'received', 'completed'];

      if (status && !validStatuses.includes(status)) {
        return sendResponse(res, 400, false, null, 'Invalid status', 'INVALID_STATUS');
      }

      const returnRequest = await ReturnModel.findById(req.params.id);
      if (!returnRequest) {
        return sendResponse(res, 404, false, null, 'Return request not found', 'NOT_FOUND');
      }

      if (status) {
        returnRequest.status = status;
      }

      if (notes) {
        returnRequest.audits.push({
          actor: req.user._id,
          action: 'updated',
          timestamp: new Date(),
          notes
        });
      }

      await returnRequest.save();
      sendResponse(res, 200, true, returnRequest, 'Return updated successfully', 'RETURN_UPDATED');
    } catch (error) {
      console.error('Update return error:', error);
      sendResponse(res, 500, false, null, 'Failed to update return', 'UPDATE_ERROR');
    }
  }
);

module.exports = router;
