const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');
const Coupon = require('../models/Coupon');
const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');

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
// COUPON MANAGEMENT
// ============================================================

// Get all coupons
router.get(
  '/coupons',
  verifyAdminToken,
  requirePermission('promotions', 'view'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, isActive, code, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {};

      if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';
      if (code) filter.code = { $regex: code, $options: 'i' };

      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const coupons = await Coupon.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Coupon.countDocuments(filter);

      sendResponse(res, 200, true, {
        coupons,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      }, 'Coupons fetched successfully', 'COUPONS_FETCHED');
    } catch (error) {
      console.error('Get coupons error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch coupons', 'FETCH_ERROR');
    }
  }
);

// Get single coupon
router.get(
  '/coupons/:id',
  verifyAdminToken,
  requirePermission('promotions', 'view'),
  async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.params.id).lean();
      if (!coupon) {
        return sendResponse(res, 404, false, null, 'Coupon not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, coupon, 'Coupon fetched successfully', 'COUPON_FETCHED');
    } catch (error) {
      console.error('Get coupon error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch coupon', 'FETCH_ERROR');
    }
  }
);

// Validate coupon for customer
router.post(
  '/coupons/validate/:code',
  auth,
  [body('cartValue').isFloat({ min: 0 }).withMessage('Cart value is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase(), isActive: true }).lean();
      if (!coupon) {
        return sendResponse(res, 404, false, null, 'Coupon not found', 'COUPON_NOT_FOUND');
      }

      // Check expiry
      if (new Date() > coupon.expiryDate) {
        return sendResponse(res, 400, false, null, 'Coupon has expired', 'COUPON_EXPIRED');
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return sendResponse(res, 400, false, null, 'Coupon usage limit reached', 'USAGE_LIMIT_REACHED');
      }

      // Check minimum cart value
      if (coupon.minCartValue && req.body.cartValue < coupon.minCartValue) {
        return sendResponse(res, 400, false, null, `Minimum cart value of ₹${coupon.minCartValue} required`, 'MIN_VALUE_NOT_MET');
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discountType === 'percentage') {
        discountAmount = (req.body.cartValue * coupon.discountValue) / 100;
      } else {
        discountAmount = coupon.discountValue;
      }

      // Apply max discount limit if any
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }

      sendResponse(res, 200, true, {
        coupon,
        discountAmount,
        finalValue: req.body.cartValue - discountAmount
      }, 'Coupon is valid', 'COUPON_VALID');
    } catch (error) {
      console.error('Validate coupon error:', error);
      sendResponse(res, 500, false, null, 'Failed to validate coupon', 'VALIDATION_ERROR');
    }
  }
);

// Create coupon
router.post(
  '/coupons',
  verifyAdminToken,
  requirePermission('promotions', 'manage'),
  [
    body('code').notEmpty().withMessage('Code is required'),
    body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
    body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
    body('expiryDate').notEmpty().withMessage('Expiry date is required'),
    body('usageLimit').optional().isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { code, discountType, discountValue, expiryDate, usageLimit, maxDiscountAmount, minCartValue, applicableCategories } = req.body;

      // Check if code already exists
      const existing = await Coupon.findOne({ code: code.toUpperCase() });
      if (existing) {
        return sendResponse(res, 409, false, null, 'Coupon code already exists', 'DUPLICATE_CODE');
      }

      const coupon = new Coupon({
        code: code.toUpperCase(),
        discountType,
        discountValue,
        expiryDate: new Date(expiryDate),
        usageLimit: usageLimit || null,
        usageCount: 0,
        maxDiscountAmount: maxDiscountAmount || null,
        minCartValue: minCartValue || 0,
        applicableCategories: applicableCategories || [],
        isActive: true
      });

      await coupon.save();
      sendResponse(res, 201, true, coupon, 'Coupon created successfully', 'COUPON_CREATED');
    } catch (error) {
      console.error('Create coupon error:', error);
      sendResponse(res, 500, false, null, 'Failed to create coupon', 'CREATE_ERROR');
    }
  }
);

// Update coupon
router.put(
  '/coupons/:id',
  verifyAdminToken,
  requirePermission('promotions', 'manage'),
  async (req, res) => {
    try {
      const { discountValue, expiryDate, usageLimit, maxDiscountAmount, isActive } = req.body;

      const coupon = await Coupon.findByIdAndUpdate(
        req.params.id,
        { discountValue, expiryDate, usageLimit, maxDiscountAmount, isActive, updatedAt: new Date() },
        { new: true }
      );

      if (!coupon) {
        return sendResponse(res, 404, false, null, 'Coupon not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, coupon, 'Coupon updated successfully', 'COUPON_UPDATED');
    } catch (error) {
      console.error('Update coupon error:', error);
      sendResponse(res, 500, false, null, 'Failed to update coupon', 'UPDATE_ERROR');
    }
  }
);

// Delete coupon
router.delete(
  '/coupons/:id',
  verifyAdminToken,
  requirePermission('promotions', 'manage'),
  async (req, res) => {
    try {
      const coupon = await Coupon.findByIdAndDelete(req.params.id);
      if (!coupon) {
        return sendResponse(res, 404, false, null, 'Coupon not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, null, 'Coupon deleted successfully', 'COUPON_DELETED');
    } catch (error) {
      console.error('Delete coupon error:', error);
      sendResponse(res, 500, false, null, 'Failed to delete coupon', 'DELETE_ERROR');
    }
  }
);

// ============================================================
// FLASH SALE MANAGEMENT
// ============================================================

// Get all flash sales
router.get(
  '/flash-sales',
  verifyAdminToken,
  requirePermission('promotions', 'view'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {};

      if (status === 'active') {
        filter.startDate = { $lte: new Date() };
        filter.endDate = { $gte: new Date() };
      } else if (status === 'upcoming') {
        filter.startDate = { $gt: new Date() };
      } else if (status === 'completed') {
        filter.endDate = { $lt: new Date() };
      }

      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const sales = await FlashSale.find(filter)
        .populate('products', 'name images price')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await FlashSale.countDocuments(filter);

      sendResponse(res, 200, true, {
        flashSales: sales,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      }, 'Flash sales fetched successfully', 'FLASH_SALES_FETCHED');
    } catch (error) {
      console.error('Get flash sales error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch flash sales', 'FETCH_ERROR');
    }
  }
);

// Get single flash sale
router.get(
  '/flash-sales/:id',
  verifyAdminToken,
  requirePermission('promotions', 'view'),
  async (req, res) => {
    try {
      const sale = await FlashSale.findById(req.params.id)
        .populate('products', 'name images price')
        .lean();

      if (!sale) {
        return sendResponse(res, 404, false, null, 'Flash sale not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, sale, 'Flash sale fetched successfully', 'FLASH_SALE_FETCHED');
    } catch (error) {
      console.error('Get flash sale error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch flash sale', 'FETCH_ERROR');
    }
  }
);

// Create flash sale
router.post(
  '/flash-sales',
  verifyAdminToken,
  requirePermission('promotions', 'manage'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('startDate').notEmpty().withMessage('Start date is required'),
    body('endDate').notEmpty().withMessage('End date is required'),
    body('discountPercentage').isFloat({ min: 0, max: 100 }).withMessage('Discount must be 0-100%'),
    body('products').isArray().notEmpty().withMessage('Products array is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { title, description, startDate, endDate, discountPercentage, products, banner } = req.body;

      // Verify all products exist
      const productIds = products;
      const existingProducts = await Product.countDocuments({ _id: { $in: productIds } });
      if (existingProducts !== productIds.length) {
        return sendResponse(res, 400, false, null, 'Some products not found', 'INVALID_PRODUCTS');
      }

      const sale = new FlashSale({
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        discountPercentage,
        products: productIds,
        banner,
        isActive: true,
        totalParticipants: 0,
        totalRevenue: 0
      });

      await sale.save();
      sendResponse(res, 201, true, sale, 'Flash sale created successfully', 'FLASH_SALE_CREATED');
    } catch (error) {
      console.error('Create flash sale error:', error);
      sendResponse(res, 500, false, null, 'Failed to create flash sale', 'CREATE_ERROR');
    }
  }
);

// Update flash sale
router.put(
  '/flash-sales/:id',
  verifyAdminToken,
  requirePermission('promotions', 'manage'),
  async (req, res) => {
    try {
      const { title, description, discountPercentage, startDate, endDate, isActive, banner } = req.body;

      const sale = await FlashSale.findByIdAndUpdate(
        req.params.id,
        { title, description, discountPercentage, startDate, endDate, isActive, banner, updatedAt: new Date() },
        { new: true }
      ).populate('products', 'name images price');

      if (!sale) {
        return sendResponse(res, 404, false, null, 'Flash sale not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, sale, 'Flash sale updated successfully', 'FLASH_SALE_UPDATED');
    } catch (error) {
      console.error('Update flash sale error:', error);
      sendResponse(res, 500, false, null, 'Failed to update flash sale', 'UPDATE_ERROR');
    }
  }
);

// Delete flash sale
router.delete(
  '/flash-sales/:id',
  verifyAdminToken,
  requirePermission('promotions', 'manage'),
  async (req, res) => {
    try {
      const sale = await FlashSale.findByIdAndDelete(req.params.id);
      if (!sale) {
        return sendResponse(res, 404, false, null, 'Flash sale not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, null, 'Flash sale deleted successfully', 'FLASH_SALE_DELETED');
    } catch (error) {
      console.error('Delete flash sale error:', error);
      sendResponse(res, 500, false, null, 'Failed to delete flash sale', 'DELETE_ERROR');
    }
  }
);

// Add products to flash sale
router.post(
  '/flash-sales/:id/add-products',
  verifyAdminToken,
  requirePermission('promotions', 'manage'),
  [body('products').isArray().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const sale = await FlashSale.findById(req.params.id);
      if (!sale) {
        return sendResponse(res, 404, false, null, 'Flash sale not found', 'NOT_FOUND');
      }

      const newProducts = req.body.products;
      sale.products = [...new Set([...sale.products, ...newProducts])];
      await sale.save();

      sendResponse(res, 200, true, sale, 'Products added to flash sale', 'PRODUCTS_ADDED');
    } catch (error) {
      console.error('Add products error:', error);
      sendResponse(res, 500, false, null, 'Failed to add products', 'ADD_ERROR');
    }
  }
);

module.exports = router;
