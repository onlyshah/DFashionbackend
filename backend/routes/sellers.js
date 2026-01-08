const express = require('express');
const router = express.Router();
const { auth, requireVendor, isApprovedVendor } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const KYCDocument = require('../models/KYCDocument');
const SellerPerformance = require('../models/SellerPerformance');
const SellerCommission = require('../models/SellerCommission');
const Order = require('../models/Order');

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
// ADMIN ROUTES - Get all sellers
// ============================================================
router.get(
  '/',
  verifyAdminToken,
  requirePermission('sellers', 'view'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, kycStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = { role: 'vendor' };

      if (status) filter.isActive = status === 'active';
      if (kycStatus) filter.kycStatus = kycStatus;

      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const sellers = await User.find(filter)
        .select('-password -lastLogin')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await User.countDocuments(filter);

      // Fetch performance metrics for each seller
      const sellersWithMetrics = await Promise.all(
        sellers.map(async (seller) => {
          const performance = await SellerPerformance.findOne({ vendorId: seller._id }).lean();
          const commission = await SellerCommission.findOne({ vendorId: seller._id }).lean();
          return {
            ...seller,
            performance: performance || {},
            commission: commission || {}
          };
        })
      );

      sendResponse(res, 200, true, {
        sellers: sellersWithMetrics,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / parseInt(limit)),
          hasPrevPage: page > 1
        }
      }, 'Sellers fetched successfully', 'SELLERS_FETCHED');
    } catch (error) {
      console.error('List sellers error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch sellers', 'FETCH_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Get seller details
// ============================================================
router.get(
  '/:id',
  verifyAdminToken,
  requirePermission('sellers', 'view'),
  async (req, res) => {
    try {
      const seller = await User.findById(req.params.id).select('-password').lean();
      if (!seller || seller.role !== 'vendor') {
        return sendResponse(res, 404, false, null, 'Seller not found', 'NOT_FOUND');
      }

      const [performance, commission, kyc, orders] = await Promise.all([
        SellerPerformance.findOne({ vendorId: seller._id }).lean(),
        SellerCommission.findOne({ vendorId: seller._id }).lean(),
        KYCDocument.find({ vendorId: seller._id }).lean(),
        Order.countDocuments({ vendor: seller._id })
      ]);

      sendResponse(res, 200, true, {
        seller,
        performance: performance || {},
        commission: commission || {},
        kyc,
        orderCount: orders
      }, 'Seller details fetched successfully', 'SELLER_FETCHED');
    } catch (error) {
      console.error('Get seller error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch seller', 'FETCH_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Register new seller
// ============================================================
router.post(
  '/',
  verifyAdminToken,
  requirePermission('sellers', 'create'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('businessName').notEmpty().withMessage('Business name is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { email, username, fullName, phone, password, businessName, description, website } = req.body;

      // Check if user already exists
      const existing = await User.findOne({ $or: [{ email }, { username }] });
      if (existing) {
        return sendResponse(res, 409, false, null, 'User already exists', 'DUPLICATE_USER');
      }

      const seller = new User({
        email,
        username,
        fullName,
        phone,
        password,
        role: 'vendor',
        businessName,
        description,
        website,
        isActive: true,
        kycStatus: 'pending',
        verificationStatus: 'pending'
      });

      await seller.save();

      // Create seller performance record
      const performance = new SellerPerformance({
        vendorId: seller._id,
        totalOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        ratingCount: 0,
        totalReturns: 0,
        returnRate: 0,
        cancellationRate: 0,
        averageDeliveryTime: 0,
        totalProducts: 0
      });
      await performance.save();

      // Create seller commission record
      const commission = new SellerCommission({
        vendorId: seller._id,
        commissionPercentage: 15, // Default 15%
        commissionEarned: 0,
        commissionPaid: 0,
        commissionPending: 0,
        lastPayoutDate: new Date(),
        bankDetails: {}
      });
      await commission.save();

      sendResponse(res, 201, true, { seller, performance, commission }, 'Seller registered successfully', 'SELLER_CREATED');
    } catch (error) {
      console.error('Create seller error:', error);
      sendResponse(res, 500, false, null, 'Failed to register seller', 'CREATE_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Update seller details
// ============================================================
router.put(
  '/:id',
  verifyAdminToken,
  requirePermission('sellers', 'edit'),
  async (req, res) => {
    try {
      const { businessName, description, website, phone, isActive } = req.body;

      const seller = await User.findById(req.params.id);
      if (!seller || seller.role !== 'vendor') {
        return sendResponse(res, 404, false, null, 'Seller not found', 'NOT_FOUND');
      }

      if (businessName) seller.businessName = businessName;
      if (description) seller.description = description;
      if (website) seller.website = website;
      if (phone) seller.phone = phone;
      if (typeof isActive === 'boolean') seller.isActive = isActive;

      await seller.save();
      sendResponse(res, 200, true, seller, 'Seller updated successfully', 'SELLER_UPDATED');
    } catch (error) {
      console.error('Update seller error:', error);
      sendResponse(res, 500, false, null, 'Failed to update seller', 'UPDATE_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - KYC Documents
// ============================================================
router.get(
  '/:id/kyc',
  verifyAdminToken,
  requirePermission('sellers', 'view'),
  async (req, res) => {
    try {
      const docs = await KYCDocument.find({ vendorId: req.params.id }).lean();
      sendResponse(res, 200, true, { documents: docs }, 'KYC documents fetched successfully', 'KYC_FETCHED');
    } catch (error) {
      console.error('Get KYC error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch KYC documents', 'FETCH_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Approve seller KYC
// ============================================================
router.post(
  '/:id/kyc/approve',
  verifyAdminToken,
  requirePermission('sellers', 'manage'),
  [body('approvalNotes').optional()],
  async (req, res) => {
    try {
      const seller = await User.findById(req.params.id);
      if (!seller || seller.role !== 'vendor') {
        return sendResponse(res, 404, false, null, 'Seller not found', 'NOT_FOUND');
      }

      seller.kycStatus = 'approved';
      seller.kycApprovedAt = new Date();
      seller.kycApprovedBy = req.user._id;
      seller.isActive = true;
      await seller.save();

      sendResponse(res, 200, true, seller, 'KYC approved successfully', 'KYC_APPROVED');
    } catch (error) {
      console.error('Approve KYC error:', error);
      sendResponse(res, 500, false, null, 'Failed to approve KYC', 'APPROVAL_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Commission Management
// ============================================================
router.get(
  '/:id/commission',
  verifyAdminToken,
  requirePermission('sellers', 'view'),
  async (req, res) => {
    try {
      const commission = await SellerCommission.findOne({ vendorId: req.params.id }).lean();
      if (!commission) {
        return sendResponse(res, 404, false, null, 'Commission record not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, commission, 'Commission details fetched successfully', 'COMMISSION_FETCHED');
    } catch (error) {
      console.error('Get commission error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch commission', 'FETCH_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Update commission rate
// ============================================================
router.put(
  '/:id/commission',
  verifyAdminToken,
  requirePermission('sellers', 'manage'),
  [
    body('commissionPercentage').isFloat({ min: 0, max: 100 }).withMessage('Commission must be between 0-100%')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const commission = await SellerCommission.findOneAndUpdate(
        { vendorId: req.params.id },
        { commissionPercentage: req.body.commissionPercentage, updatedAt: new Date() },
        { new: true }
      );

      if (!commission) {
        return sendResponse(res, 404, false, null, 'Commission record not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, commission, 'Commission updated successfully', 'COMMISSION_UPDATED');
    } catch (error) {
      console.error('Update commission error:', error);
      sendResponse(res, 500, false, null, 'Failed to update commission', 'UPDATE_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Payout Management
// ============================================================
router.get(
  '/:id/payout',
  verifyAdminToken,
  requirePermission('sellers', 'view'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const commission = await SellerCommission.findOne({ vendorId: req.params.id }).lean();
      if (!commission) {
        return sendResponse(res, 404, false, null, 'Commission record not found', 'NOT_FOUND');
      }

      // Return payout history from commission record
      const payoutHistory = commission.payoutHistory || [];
      const paginatedPayouts = payoutHistory.slice(skip, skip + parseInt(limit));

      sendResponse(res, 200, true, {
        payouts: paginatedPayouts,
        commissionEarned: commission.commissionEarned,
        commissionPaid: commission.commissionPaid,
        commissionPending: commission.commissionPending,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(payoutHistory.length / parseInt(limit)),
          totalItems: payoutHistory.length
        }
      }, 'Payout history fetched successfully', 'PAYOUT_FETCHED');
    } catch (error) {
      console.error('Get payout error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch payout history', 'FETCH_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Process seller payout
// ============================================================
router.post(
  '/:id/payout',
  verifyAdminToken,
  requirePermission('sellers', 'manage'),
  [
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
    body('paymentMethod').isIn(['bank_transfer', 'cheque', 'wallet']).withMessage('Invalid payment method')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { amount, paymentMethod, referenceNumber } = req.body;

      const commission = await SellerCommission.findOne({ vendorId: req.params.id });
      if (!commission) {
        return sendResponse(res, 404, false, null, 'Commission record not found', 'NOT_FOUND');
      }

      if (commission.commissionPending < amount) {
        return sendResponse(res, 400, false, null, 'Insufficient commission pending', 'INSUFFICIENT_FUNDS');
      }

      const payout = {
        amount,
        paymentMethod,
        referenceNumber: referenceNumber || `PAYOUT-${Date.now()}`,
        processedAt: new Date(),
        processedBy: req.user._id,
        status: 'completed'
      };

      if (!commission.payoutHistory) commission.payoutHistory = [];
      commission.payoutHistory.push(payout);
      commission.commissionPaid += amount;
      commission.commissionPending -= amount;
      commission.lastPayoutDate = new Date();

      await commission.save();

      sendResponse(res, 200, true, { payout, commission }, 'Payout processed successfully', 'PAYOUT_PROCESSED');
    } catch (error) {
      console.error('Process payout error:', error);
      sendResponse(res, 500, false, null, 'Failed to process payout', 'PAYOUT_ERROR');
    }
  }
);

// ============================================================
// ADMIN ROUTES - Seller Performance Metrics
// ============================================================
router.get(
  '/:id/performance',
  verifyAdminToken,
  requirePermission('sellers', 'view'),
  async (req, res) => {
    try {
      const performance = await SellerPerformance.findOne({ vendorId: req.params.id }).lean();
      if (!performance) {
        return sendResponse(res, 404, false, null, 'Performance record not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, performance, 'Performance metrics fetched successfully', 'PERFORMANCE_FETCHED');
    } catch (error) {
      console.error('Get performance error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch performance metrics', 'FETCH_ERROR');
    }
  }
);

// ============================================================
// VENDOR SELF ROUTES - Get my seller profile
// ============================================================
router.get(
  '/self/profile',
  auth,
  requireVendor,
  async (req, res) => {
    try {
      const seller = await User.findById(req.user.userId).select('-password').lean();
      const [performance, commission] = await Promise.all([
        SellerPerformance.findOne({ vendorId: req.user.userId }).lean(),
        SellerCommission.findOne({ vendorId: req.user.userId }).lean()
      ]);

      sendResponse(res, 200, true, { seller, performance, commission }, 'Profile fetched successfully', 'PROFILE_FETCHED');
    } catch (error) {
      console.error('Get self profile error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch profile', 'FETCH_ERROR');
    }
  }
);

module.exports = router;
