/**
 * ============================================================================
 * VENDOR CONTROLLER - PostgreSQL/Sequelize + RBAC
 * ============================================================================
 * Purpose: Vendor/seller registration, verification, documents, payout management
 * Database: PostgreSQL via Sequelize ORM
 * Consolidated: vendorController.js + sellersController.js + vendorVerificationController.js
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

// Constants
const VENDOR_STATUSES = ['pending', 'verified', 'suspended', 'rejected', 'active'];
const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected', 'pending_resubmission'];

/**
 * Get all vendors (admin endpoint)
 */
exports.getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, verified_only = false, search } = req.query;
    
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view all vendors');
    }

    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const where = {};
    if (status && VENDOR_STATUSES.includes(status)) {
      where.status = status;
    }
    if (verified_only) {
      where.is_verified = true;
    }
    if (search) {
      where[Op.or] = [
        { shop_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await models.Vendor.findAndCountAll({
      where,
      include: [
        { model: models.User, attributes: ['id', 'name', 'email'] },
        { model: models.VendorVerification, attributes: ['status', 'verified_at'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: validated_limit,
      offset,
      distinct: true
    });

    const pagination = {
      page: parseInt(page),
      limit: validated_limit,
      total: count,
      totalPages: Math.ceil(count / validated_limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'Vendors retrieved successfully');
  } catch (error) {
    console.error('❌ getAllVendors error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get vendor by ID
 */
exports.getVendorById = async (req, res) => {
  try {
    const { vendor_id } = req.params;

    const vendor = await models.Vendor.findByPk(vendor_id, {
      include: [
        { model: models.User, attributes: ['id', 'name', 'email', 'phone'] },
        { model: models.VendorVerification, attributes: ['status', 'verified_at', 'documents'] },
        { model: models.Product, attributes: ['id', 'name', 'price', 'stock'] }
      ]
    });

    if (!vendor) {
      return ApiResponse.notFound(res, 'Vendor');
    }

    // Users can only view their own vendor profile
    if (req.user.role === 'user' && vendor.user_id !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only view your own vendor profile');
    }

    return ApiResponse.success(res, vendor, 'Vendor retrieved successfully');
  } catch (error) {
    console.error('❌ getVendorById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Create vendor account (user registration as vendor)
 */
exports.createVendor = async (req, res) => {
  try {
    const { shop_name, business_email, phone, address, city, state, postal_code, country, bank_account_holder, bank_account_number, bank_ifsc, shop_description } = req.body;

    // Validate required fields
    if (!shop_name || !business_email || !phone || !address || !bank_account_number || !bank_ifsc) {
      return ApiResponse.error(res, 'Missing required fields', 422);
    }

    // Check if vendor already exists for this user
    const existing = await models.Vendor.findOne({
      where: { user_id: req.user.id }
    });

    if (existing) {
      return ApiResponse.error(res, 'You already have a vendor account', 409);
    }

    const t = await models.sequelize.transaction();
    try {
      const vendor = await models.Vendor.create({
        user_id: req.user.id,
        shop_name,
        business_email,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        shop_description,
        bank_account_holder,
        bank_account_number,
        bank_ifsc,
        status: 'pending',
        is_verified: false,
        commission_rate: 10,
        rating: 0,
        total_sales: 0
      }, { transaction: t });

      // Create verification record
      await models.VendorVerification.create({
        vendor_id: vendor.id,
        status: 'pending',
        documents: {}
      }, { transaction: t });

      await t.commit();

      return ApiResponse.created(res, {
        vendor_id: vendor.id,
        shop_name: vendor.shop_name,
        status: vendor.status,
        message: 'Please submit verification documents to activate your vendor account'
      }, 'Vendor account created successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ createVendor error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update vendor profile
 */
exports.updateVendor = async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const { shop_name, business_email, phone, address, city, state, postal_code, shop_description } = req.body;

    const vendor = await models.Vendor.findByPk(vendor_id);
    if (!vendor) {
      return ApiResponse.notFound(res, 'Vendor');
    }

    // Verify ownership
    if (vendor.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only update your own vendor profile');
    }

    const updated_vendor = await vendor.update({
      shop_name: shop_name || vendor.shop_name,
      business_email: business_email || vendor.business_email,
      phone: phone || vendor.phone,
      address: address || vendor.address,
      city: city || vendor.city,
      state: state || vendor.state,
      postal_code: postal_code || vendor.postal_code,
      shop_description: shop_description || vendor.shop_description
    });

    return ApiResponse.success(res, updated_vendor, 'Vendor profile updated successfully');
  } catch (error) {
    console.error('❌ updateVendor error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get vendor products
 */
exports.getVendorProducts = async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const vendor = await models.Vendor.findByPk(vendor_id);
    if (!vendor) {
      return ApiResponse.notFound(res, 'Vendor');
    }

    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const { count, rows } = await models.Product.findAndCountAll({
      where: { vendor_id },
      include: [
        { model: models.Category, attributes: ['id', 'name'] },
        { model: models.Brand, attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: validated_limit,
      offset,
      distinct: true
    });

    const pagination = {
      page: parseInt(page),
      limit: validated_limit,
      total: count,
      totalPages: Math.ceil(count / validated_limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'Vendor products retrieved successfully');
  } catch (error) {
    console.error('❌ getVendorProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get vendor statistics
 */
exports.getVendorStats = async (req, res) => {
  try {
    const { vendor_id } = req.params;

    const vendor = await models.Vendor.findByPk(vendor_id);
    if (!vendor) {
      return ApiResponse.notFound(res, 'Vendor');
    }

    // Verify ownership
    if (vendor.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only view your own statistics');
    }

    const products = await models.Product.count({ where: { vendor_id } });
    const orders = await models.Order.count({
      include: [{
        model: models.OrderItem,
        where: { vendor_id },
        required: true
      }]
    });

    const total_revenue = await models.Order.sum('total_amount', {
      include: [{
        model: models.OrderItem,
        where: { vendor_id },
        required: true
      }],
      where: { status: { [Op.in]: ['delivered', 'completed'] } }
    }) || 0;

    return ApiResponse.success(res, {
      vendor_id,
      shop_name: vendor.shop_name,
      products_count: products,
      orders_count: orders,
      total_revenue,
      commission_rate: vendor.commission_rate,
      rating: vendor.rating,
      status: vendor.status,
      is_verified: vendor.is_verified
    }, 'Vendor statistics retrieved successfully');
  } catch (error) {
    console.error('❌ getVendorStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Submit verification documents
 */
exports.submitVerificationDocuments = async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const { business_license_url, tax_id, tax_id_url, owner_identity_url, additional_docs } = req.body;

    const vendor = await models.Vendor.findByPk(vendor_id);
    if (!vendor) {
      return ApiResponse.notFound(res, 'Vendor');
    }

    // Verify ownership
    if (vendor.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only submit documents for your own vendor account');
    }

    const verification = await models.VendorVerification.findOne({
      where: { vendor_id }
    });

    if (!verification) {
      return ApiResponse.notFound(res, 'Verification record');
    }

    const documents = {
      business_license: business_license_url,
      tax_id: tax_id,
      tax_id_document: tax_id_url,
      owner_identity: owner_identity_url,
      additional: additional_docs || {},
      submitted_at: new Date()
    };

    await verification.update({
      documents,
      status: 'pending',
      submitted_at: new Date()
    });

    return ApiResponse.success(res, {
      verification_id: verification.id,
      status: 'pending',
      message: 'Documents submitted successfully. Verification review in progress.'
    }, 'Documents submitted successfully');
  } catch (error) {
    console.error('❌ submitVerificationDocuments error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get vendor verification status
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { vendor_id } = req.params;

    const verification = await models.VendorVerification.findOne({
      where: { vendor_id },
      include: { model: models.Vendor, attributes: ['id', 'shop_name', 'status', 'user_id'] }
    });

    if (!verification) {
      return ApiResponse.notFound(res, 'Verification record');
    }

    // Verify ownership
    if (verification.Vendor.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only view your own verification status');
    }

    return ApiResponse.success(res, {
      vendor_id,
      status: verification.status,
      documents_submitted: !!verification.documents && Object.keys(verification.documents).length > 0,
      verified_at: verification.verified_at,
      rejection_reason: verification.rejection_reason,
      submitted_at: verification.submitted_at
    }, 'Verification status retrieved successfully');
  } catch (error) {
    console.error('❌ getVerificationStatus error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get pending verifications (admin only)
 */
exports.getPendingVerifications = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can view pending verifications');
    }

    const { page = 1, limit = 20 } = req.query;
    const { limit: validated_limit, offset } = validatePagination(page, limit);

    const { count, rows } = await models.VendorVerification.findAndCountAll({
      where: { status: 'pending' },
      include: [
        { model: models.Vendor, attributes: ['id', 'shop_name', 'status', 'business_email'] },
        { model: models.User, attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'ASC']],
      limit: validated_limit,
      offset,
      distinct: true
    });

    const pagination = {
      page: parseInt(page),
      limit: validated_limit,
      total: count,
      totalPages: Math.ceil(count / validated_limit)
    };

    return ApiResponse.paginated(res, rows, pagination, 'Pending verifications retrieved successfully');
  } catch (error) {
    console.error('❌ getPendingVerifications error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Approve vendor verification (admin only)
 */
exports.approveVendor = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can approve vendors');
    }

    const { vendor_id } = req.params;

    const vendor = await models.Vendor.findByPk(vendor_id);
    if (!vendor) {
      return ApiResponse.notFound(res, 'Vendor');
    }

    const verification = await models.VendorVerification.findOne({
      where: { vendor_id }
    });

    if (!verification) {
      return ApiResponse.notFound(res, 'Verification record');
    }

    const t = await models.sequelize.transaction();
    try {
      await verification.update({
        status: 'approved',
        verified_at: new Date(),
        verified_by: req.user.id
      }, { transaction: t });

      await vendor.update({
        status: 'active',
        is_verified: true
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        vendor_id,
        status: 'active',
        is_verified: true,
        message: 'Vendor approved successfully'
      }, 'Vendor approved successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ approveVendor error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Reject vendor verification (admin only)
 */
exports.rejectVendor = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can reject vendors');
    }

    const { vendor_id } = req.params;
    const { reason } = req.body;

    const verification = await models.VendorVerification.findOne({
      where: { vendor_id }
    });

    if (!verification) {
      return ApiResponse.notFound(res, 'Verification record');
    }

    await verification.update({
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date(),
      rejected_by: req.user.id
    });

    return ApiResponse.success(res, {
      vendor_id,
      status: 'rejected',
      reason
    }, 'Vendor rejected successfully');
  } catch (error) {
    console.error('❌ rejectVendor error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Suspend vendor (admin only)
 */
exports.suspendVendor = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can suspend vendors');
    }

    const { vendor_id } = req.params;
    const { reason } = req.body;

    const vendor = await models.Vendor.findByPk(vendor_id);
    if (!vendor) {
      return ApiResponse.notFound(res, 'Vendor');
    }

    await vendor.update({
      status: 'suspended',
      suspension_reason: reason,
      suspended_at: new Date(),
      suspended_by: req.user.id
    });

    return ApiResponse.success(res, {
      vendor_id,
      status: 'suspended',
      reason
    }, 'Vendor suspended successfully');
  } catch (error) {
    console.error('❌ suspendVendor error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Approve payout request (admin only)
 */
exports.getVendorDashboard = async (req, res) => {
  return ApiResponse.success(res, {}, 'Vendor dashboard retrieved');
};

exports.getVendorProfile = async (req, res) => {
  return ApiResponse.success(res, {}, 'Vendor profile retrieved');
};

exports.getVendorOrders = async (req, res) => {
  return ApiResponse.success(res, [], 'Vendor orders retrieved');
};

exports.getVendorEarnings = async (req, res) => {
  return ApiResponse.success(res, {}, 'Vendor earnings retrieved');
};

exports.approvePayout = async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'Only admins can approve payouts');
    }

    const { vendor_id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return ApiResponse.error(res, 'Invalid payout amount', 422);
    }

    const vendor = await models.Vendor.findByPk(vendor_id);
    if (!vendor) {
      return ApiResponse.notFound(res, 'Vendor');
    }

    const t = await models.sequelize.transaction();
    try {
      const payout = await models.VendorPayout.create({
        vendor_id,
        amount,
        status: 'approved',
        approved_at: new Date(),
        approved_by: req.user.id
      }, { transaction: t });

      // Update vendor total_sales (deduct payout)
      await vendor.update({
        total_sales: vendor.total_sales - amount
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        payout_id: payout.id,
        vendor_id,
        amount,
        status: 'approved'
      }, 'Payout approved successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ approvePayout error:', error);
    return ApiResponse.serverError(res, error);
  }
};
