const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');
const Courier = require('../models/Courier');
const Shipment = require('../models/Shipment');
const ShippingCharge = require('../models/ShippingCharge');
const Order = require('../models/Order');

const timestamp = () => new Date().toISOString();

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
// COURIER MANAGEMENT
// ============================================================

// Get all couriers
router.get(
  '/couriers',
  verifyAdminToken,
  requirePermission('logistics', 'view'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, isActive } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {};

      if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';

      const couriers = await Courier.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Courier.countDocuments(filter);

      sendResponse(res, 200, true, {
        couriers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      }, 'Couriers fetched successfully', 'COURIERS_FETCHED');
    } catch (error) {
      console.error('Get couriers error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch couriers', 'FETCH_ERROR');
    }
  }
);

// Get single courier
router.get(
  '/couriers/:id',
  verifyAdminToken,
  requirePermission('logistics', 'view'),
  async (req, res) => {
    try {
      const courier = await Courier.findById(req.params.id).lean();
      if (!courier) {
        return sendResponse(res, 404, false, null, 'Courier not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, courier, 'Courier fetched successfully', 'COURIER_FETCHED');
    } catch (error) {
      console.error('Get courier error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch courier', 'FETCH_ERROR');
    }
  }
);

// Create courier
router.post(
  '/couriers',
  verifyAdminToken,
  requirePermission('logistics', 'manage'),
  [
    body('name').notEmpty().withMessage('Courier name is required'),
    body('code').notEmpty().withMessage('Courier code is required'),
    body('apiKey').optional(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { name, code, apiKey, website, isActive } = req.body;

      const courier = new Courier({
        name,
        code,
        apiKey,
        website,
        isActive: isActive !== false
      });

      await courier.save();
      sendResponse(res, 201, true, courier, 'Courier created successfully', 'COURIER_CREATED');
    } catch (error) {
      console.error('Create courier error:', error);
      sendResponse(res, 500, false, null, 'Failed to create courier', 'CREATE_ERROR');
    }
  }
);

// Update courier
router.put(
  '/couriers/:id',
  verifyAdminToken,
  requirePermission('logistics', 'manage'),
  async (req, res) => {
    try {
      const { name, code, apiKey, website, isActive } = req.body;

      const courier = await Courier.findByIdAndUpdate(
        req.params.id,
        { name, code, apiKey, website, isActive, updatedAt: new Date() },
        { new: true }
      );

      if (!courier) {
        return sendResponse(res, 404, false, null, 'Courier not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, courier, 'Courier updated successfully', 'COURIER_UPDATED');
    } catch (error) {
      console.error('Update courier error:', error);
      sendResponse(res, 500, false, null, 'Failed to update courier', 'UPDATE_ERROR');
    }
  }
);

// Delete courier
router.delete(
  '/couriers/:id',
  verifyAdminToken,
  requirePermission('logistics', 'manage'),
  async (req, res) => {
    try {
      const courier = await Courier.findByIdAndDelete(req.params.id);
      if (!courier) {
        return sendResponse(res, 404, false, null, 'Courier not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, null, 'Courier deleted successfully', 'COURIER_DELETED');
    } catch (error) {
      console.error('Delete courier error:', error);
      sendResponse(res, 500, false, null, 'Failed to delete courier', 'DELETE_ERROR');
    }
  }
);

// ============================================================
// SHIPMENT MANAGEMENT
// ============================================================

// Get all shipments
router.get(
  '/shipments',
  verifyAdminToken,
  requirePermission('logistics', 'view'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, courierId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {};

      if (status) filter.status = status;
      if (courierId) filter.courierId = courierId;

      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const shipments = await Shipment.find(filter)
        .populate('orderId', 'orderNumber')
        .populate('courierId', 'name code')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Shipment.countDocuments(filter);

      sendResponse(res, 200, true, {
        shipments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      }, 'Shipments fetched successfully', 'SHIPMENTS_FETCHED');
    } catch (error) {
      console.error('Get shipments error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch shipments', 'FETCH_ERROR');
    }
  }
);

// Get single shipment
router.get(
  '/shipments/:id',
  verifyAdminToken,
  requirePermission('logistics', 'view'),
  async (req, res) => {
    try {
      const shipment = await Shipment.findById(req.params.id)
        .populate('orderId')
        .populate('courierId')
        .lean();

      if (!shipment) {
        return sendResponse(res, 404, false, null, 'Shipment not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, shipment, 'Shipment fetched successfully', 'SHIPMENT_FETCHED');
    } catch (error) {
      console.error('Get shipment error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch shipment', 'FETCH_ERROR');
    }
  }
);

// Create shipment
router.post(
  '/shipments',
  verifyAdminToken,
  requirePermission('logistics', 'manage'),
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('courierId').notEmpty().withMessage('Courier ID is required'),
    body('weight').optional().isFloat({ min: 0 }),
    body('dimensions').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { orderId, courierId, weight, dimensions, pickupLocation, deliveryLocation } = req.body;

      // Verify order exists
      const order = await Order.findById(orderId);
      if (!order) {
        return sendResponse(res, 404, false, null, 'Order not found', 'ORDER_NOT_FOUND');
      }

      const shipment = new Shipment({
        orderId,
        courierId,
        weight,
        dimensions,
        pickupLocation: pickupLocation || { address: 'Warehouse', city: 'Default', state: 'Default' },
        deliveryLocation: deliveryLocation || order.shippingAddress,
        status: 'pending',
        trackingUpdates: []
      });

      await shipment.save();

      // Update order with shipment info
      order.shipmentId = shipment._id;
      order.status = 'shipped';
      await order.save();

      sendResponse(res, 201, true, shipment, 'Shipment created successfully', 'SHIPMENT_CREATED');
    } catch (error) {
      console.error('Create shipment error:', error);
      sendResponse(res, 500, false, null, 'Failed to create shipment', 'CREATE_ERROR');
    }
  }
);

// Update shipment tracking
router.put(
  '/shipments/:id/tracking',
  verifyAdminToken,
  requirePermission('logistics', 'manage'),
  [
    body('status').notEmpty().withMessage('Status is required'),
    body('location').optional(),
    body('remarks').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { status, location, remarks } = req.body;

      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) {
        return sendResponse(res, 404, false, null, 'Shipment not found', 'NOT_FOUND');
      }

      shipment.status = status;
      if (!shipment.trackingUpdates) shipment.trackingUpdates = [];
      
      shipment.trackingUpdates.push({
        status,
        location: location || shipment.currentLocation || {},
        timestamp: new Date(),
        remarks
      });

      shipment.currentLocation = location;
      shipment.lastUpdateAt = new Date();

      // If delivered, update order status
      if (status === 'delivered') {
        const order = await Order.findById(shipment.orderId);
        if (order) {
          order.status = 'delivered';
          await order.save();
        }
      }

      await shipment.save();

      sendResponse(res, 200, true, shipment, 'Tracking updated successfully', 'TRACKING_UPDATED');
    } catch (error) {
      console.error('Update tracking error:', error);
      sendResponse(res, 500, false, null, 'Failed to update tracking', 'UPDATE_ERROR');
    }
  }
);

// ============================================================
// SHIPPING CHARGES MANAGEMENT
// ============================================================

// Get shipping charges
router.get(
  '/charges',
  verifyAdminToken,
  requirePermission('logistics', 'view'),
  async (req, res) => {
    try {
      const { origin, destination } = req.query;
      const filter = {};

      if (origin) filter.origin = origin;
      if (destination) filter.destination = destination;

      const charges = await ShippingCharge.find(filter).lean();

      sendResponse(res, 200, true, { charges }, 'Shipping charges fetched successfully', 'CHARGES_FETCHED');
    } catch (error) {
      console.error('Get charges error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch shipping charges', 'FETCH_ERROR');
    }
  }
);

// Create shipping charge rule
router.post(
  '/charges',
  verifyAdminToken,
  requirePermission('logistics', 'manage'),
  [
    body('origin').notEmpty().withMessage('Origin is required'),
    body('destination').notEmpty().withMessage('Destination is required'),
    body('baseCharge').isFloat({ min: 0 }).withMessage('Base charge must be a valid number'),
    body('perKgCharge').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { origin, destination, baseCharge, perKgCharge, minCharge, maxCharge } = req.body;

      const charge = new ShippingCharge({
        origin,
        destination,
        baseCharge,
        perKgCharge: perKgCharge || 0,
        minCharge: minCharge || baseCharge,
        maxCharge: maxCharge || baseCharge * 5
      });

      await charge.save();
      sendResponse(res, 201, true, charge, 'Shipping charge created successfully', 'CHARGE_CREATED');
    } catch (error) {
      console.error('Create charge error:', error);
      sendResponse(res, 500, false, null, 'Failed to create shipping charge', 'CREATE_ERROR');
    }
  }
);

// Update shipping charge
router.put(
  '/charges/:id',
  verifyAdminToken,
  requirePermission('logistics', 'manage'),
  async (req, res) => {
    try {
      const { baseCharge, perKgCharge, minCharge, maxCharge } = req.body;

      const charge = await ShippingCharge.findByIdAndUpdate(
        req.params.id,
        { baseCharge, perKgCharge, minCharge, maxCharge, updatedAt: new Date() },
        { new: true }
      );

      if (!charge) {
        return sendResponse(res, 404, false, null, 'Shipping charge not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, charge, 'Shipping charge updated successfully', 'CHARGE_UPDATED');
    } catch (error) {
      console.error('Update charge error:', error);
      sendResponse(res, 500, false, null, 'Failed to update shipping charge', 'UPDATE_ERROR');
    }
  }
);

module.exports = router;
