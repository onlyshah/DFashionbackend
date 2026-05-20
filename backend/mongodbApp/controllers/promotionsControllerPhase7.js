/**
 * Promotions Controller - Complete MongoDB Implementation (Phase 7)
 * 8 methods for promotions and coupon management
 */

const Promotion = require('../models/Promotion');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get all promotions
 */
exports.getAllPromotions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (type) filter.type = type;
    if (status === 'active') filter.isActive = true;

    const [promos, total] = await Promise.all([
      Promotion.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Promotion.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, promos, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Promotions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get single promotion
 */
exports.getPromotion = async (req, res, next) => {
  try {
    const { promoId } = req.params;

    if (!promoId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid promotion ID', 400, 'INVALID_ID');
    }

    const promo = await Promotion.findById(promoId).lean();

    if (!promo) {
      throw new ApiError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
    }

    return ApiResponse.success(res, promo, 'Promotion retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Create promotion (Admin only)
 */
exports.createPromotion = async (req, res, next) => {
  try {
    const { code, description, discountType, discountValue, minOrderValue, maxUsage, expiresAt, applicableProducts, isActive } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      throw new ApiError('Code, discount type, and value are required', 400, 'VALIDATION_ERROR');
    }

    if (!['percentage', 'flat'].includes(discountType)) {
      throw new ApiError('Discount type must be percentage or flat', 400, 'INVALID_TYPE');
    }

    const promotion = await Promotion.create({
      code,
      description,
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      maxUsage: maxUsage || -1, // -1 = unlimited
      expiresAt,
      applicableProducts: applicableProducts || [],
      isActive: isActive !== false,
      usageCount: 0
    });

    return ApiResponse.created(res, promotion, 'Promotion created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update promotion (Admin only)
 */
exports.updatePromotion = async (req, res, next) => {
  try {
    const { promoId } = req.params;
    const updates = req.body;

    if (!promoId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid promotion ID', 400, 'INVALID_ID');
    }

    const promo = await Promotion.findByIdAndUpdate(
      promoId,
      { $set: updates },
      { new: true }
    );

    if (!promo) {
      throw new ApiError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
    }

    return ApiResponse.success(res, promo, 'Promotion updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete promotion (Admin only)
 */
exports.deletePromotion = async (req, res, next) => {
  try {
    const { promoId } = req.params;

    if (!promoId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid promotion ID', 400, 'INVALID_ID');
    }

    await Promotion.findByIdAndDelete(promoId);

    return ApiResponse.success(res, { id: promoId }, 'Promotion deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Apply promo code to order
 */
exports.applyPromoCode = async (req, res, next) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code) {
      throw new ApiError('Promo code is required', 400, 'VALIDATION_ERROR');
    }

    const promo = await Promotion.findOne({ code, isActive: true }).lean();

    if (!promo) {
      throw new ApiError('Promo code not found or expired', 404, 'PROMO_NOT_FOUND');
    }

    // Check expiration
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      throw new ApiError('Promo code has expired', 400, 'PROMO_EXPIRED');
    }

    // Check usage limit
    if (promo.maxUsage > 0 && promo.usageCount >= promo.maxUsage) {
      throw new ApiError('Promo code usage limit reached', 400, 'PROMO_LIMIT_REACHED');
    }

    // Check minimum order value
    if (orderTotal < promo.minOrderValue) {
      throw new ApiError(`Minimum order value ${promo.minOrderValue} required`, 400, 'MIN_ORDER_VALUE');
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = (orderTotal * promo.discountValue) / 100;
    } else {
      discount = promo.discountValue;
    }

    // Increment usage count
    await Promotion.findByIdAndUpdate(promo._id, { $inc: { usageCount: 1 } });

    return ApiResponse.success(res, {
      promoCode: code,
      discountAmount: discount,
      newTotal: orderTotal - discount,
      discountType: promo.discountType,
      description: promo.description
    }, 'Promo code applied successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Validate promo code (without applying)
 */
exports.validatePromoCode = async (req, res, next) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code) {
      throw new ApiError('Promo code is required', 400, 'VALIDATION_ERROR');
    }

    const promo = await Promotion.findOne({ code, isActive: true }).lean();

    if (!promo) {
      return ApiResponse.success(res, {
        isValid: false,
        reason: 'Promo code not found or expired'
      });
    }

    // Check expiration
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return ApiResponse.success(res, {
        isValid: false,
        reason: 'Promo code has expired'
      });
    }

    // Check usage limit
    if (promo.maxUsage > 0 && promo.usageCount >= promo.maxUsage) {
      return ApiResponse.success(res, {
        isValid: false,
        reason: 'Promo code usage limit reached'
      });
    }

    // Check minimum order value
    if (orderTotal && orderTotal < promo.minOrderValue) {
      return ApiResponse.success(res, {
        isValid: false,
        reason: `Minimum order value ${promo.minOrderValue} required`
      });
    }

    return ApiResponse.success(res, {
      isValid: true,
      code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      description: promo.description
    }, 'Promo code is valid');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get active promotions
 */
exports.getActivePromotions = async (req, res, next) => {
  try {
    const now = new Date();

    const promos = await Promotion.find({
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    })
      .sort('-createdAt')
      .lean();

    return ApiResponse.success(res, promos, 'Active promotions retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
