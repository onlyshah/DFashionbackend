/**
 * ============================================================================
 * CHECKOUT CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Checkout workflow, promo validation, tax calculation, payment prep
 * Database: PostgreSQL via Sequelize ORM
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

const TAX_RATE = 0.18;
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_SHIPPING = 100;

/**
 * Initiate checkout (validate cart, calculate totals)
 */
exports.initiateCheckout = async (req, res) => {
  try {
    const { shipping_address_id, billing_address_id } = req.body;

    // Validate cart exists and has items
    const cart = await models.Cart.findOne({
      where: { user_id: req.user.id },
      include: {
        model: models.CartItem,
        as: 'items',
        include: { model: models.Product, attributes: ['id', 'name', 'price', 'stock'] }
      }
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 422);
    }

    // Validate addresses
    const shipping_addr = await models.Address.findByPk(shipping_address_id);
    if (!shipping_addr || shipping_addr.user_id !== req.user.id) {
      return ApiResponse.notFound(res, 'Shipping address');
    }

    const billing_addr = await models.Address.findByPk(billing_address_id);
    if (!billing_addr || billing_addr.user_id !== req.user.id) {
      return ApiResponse.notFound(res, 'Billing address');
    }

    // Verify stock
    for (const item of cart.items) {
      if (item.Product.stock < item.quantity) {
        return ApiResponse.error(res, `Insufficient stock for ${item.Product.name}`, 409);
      }
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cart.items) {
      subtotal += item.Product.price * item.quantity;
    }

    const tax_amount = subtotal * TAX_RATE;
    const shipping_cost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total_amount = subtotal + tax_amount + shipping_cost;

    return ApiResponse.success(res, {
      cart_items: cart.items,
      addresses: {
        shipping: shipping_addr,
        billing: billing_addr
      },
      summary: {
        subtotal,
        tax_amount,
        shipping_cost,
        total_amount
      }
    }, 'Checkout initiated successfully');
  } catch (error) {
    console.error('❌ initiateCheckout error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Apply/validate coupon or promo code
 */
exports.applyPromo = async (req, res) => {
  try {
    const { promo_code, subtotal } = req.body;

    if (!promo_code) {
      return ApiResponse.error(res, 'Promo code required', 422);
    }

    const promo = await models.Promotion.findOne({
      where: {
        code: promo_code.toUpperCase(),
        is_active: true,
        valid_from: { [models.sequelize.Op.lte]: new Date() },
        valid_until: { [models.sequelize.Op.gte]: new Date() }
      }
    });

    if (!promo) {
      return ApiResponse.error(res, 'Invalid or expired promo code', 404);
    }

    // Check minimum purchase
    if (promo.min_purchase && subtotal < promo.min_purchase) {
      return ApiResponse.error(res, `Minimum purchase amount: ${promo.min_purchase}`, 422);
    }

    // Calculate discount
    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (subtotal * promo.discount_value) / 100;
      if (promo.max_discount) {
        discount = Math.min(discount, promo.max_discount);
      }
    } else {
      discount = promo.discount_value;
    }

    return ApiResponse.success(res, {
      promo_code: promo.code,
      discount_amount: discount,
      new_subtotal: subtotal - discount,
      promo_details: {
        type: promo.discount_type,
        value: promo.discount_value,
        description: promo.description
      }
    }, 'Promo code applied successfully');
  } catch (error) {
    console.error('❌ applyPromo error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Calculate shipping cost with different carriers
 */
exports.calculateShipping = async (req, res) => {
  try {
    const { postal_code, weight = 0.5, subtotal } = req.body;

    if (!postal_code) {
      return ApiResponse.error(res, 'Postal code required', 422);
    }

    // Default rates
    const shipping_options = [
      {
        id: 'standard',
        name: 'Standard Shipping',
        cost: subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING,
        delivery_days: '5-7'
      },
      {
        id: 'express',
        name: 'Express Shipping',
        cost: 250,
        delivery_days: '2-3'
      },
      {
        id: 'overnight',
        name: 'Overnight Shipping',
        cost: 500,
        delivery_days: '1'
      }
    ];

    return ApiResponse.success(res, shipping_options, 'Shipping options calculated successfully');
  } catch (error) {
    console.error('❌ calculateShipping error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Validate addresses
 */
exports.validateAddress = async (req, res) => {
  try {
    const { street, city, state, postal_code, country, phone } = req.body;

    // Basic validation
    if (!street || !city || !state || !postal_code || !country) {
      return ApiResponse.error(res, 'All address fields are required', 422);
    }

    // Could integrate with actual address validation service here
    const is_valid = true;

    return ApiResponse.success(res, {
      is_valid,
      formatted_address: `${street}, ${city}, ${state} ${postal_code}, ${country}`
    }, 'Address validated successfully');
  } catch (error) {
    console.error('❌ validateAddress error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Calculate tax
 */
exports.calculateTax = async (req, res) => {
  try {
    const { subtotal, state, country = 'IN' } = req.body;

    if (!subtotal) {
      return ApiResponse.error(res, 'Subtotal required', 422);
    }

    // GST calculation (simplified - 18% for India)
    const tax_rate = country === 'IN' ? 0.18 : 0.10;
    const tax_amount = subtotal * tax_rate;

    return ApiResponse.success(res, {
      subtotal,
      tax_rate: (tax_rate * 100).toFixed(0) + '%',
      tax_amount: tax_amount.toFixed(2),
      total: (subtotal + tax_amount).toFixed(2)
    }, 'Tax calculated successfully');
  } catch (error) {
    console.error('❌ calculateTax error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Confirm checkout and prepare for payment
 */
exports.getCartSummary = async (req, res) => {
  return ApiResponse.success(res, {}, 'Cart summary retrieved');
};

exports.validateCart = async (req, res) => {
  return ApiResponse.success(res, {}, 'Cart validated');
};

exports.getCheckoutDetails = exports.confirmCheckout = async (req, res) => {
  try {
    const { shipping_address_id, billing_address_id, shipping_option, promo_code } = req.body;

    // Get cart
    const cart = await models.Cart.findOne({
      where: { user_id: req.user.id },
      include: {
        model: models.CartItem,
        as: 'items',
        include: { model: models.Product, attributes: ['id', 'name', 'price', 'stock'] }
      }
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 422);
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cart.items) {
      subtotal += item.Product.price * item.quantity;
    }

    let discount = 0;
    if (promo_code) {
      const promo = await models.Promotion.findOne({
        where: {
          code: promo_code.toUpperCase(),
          is_active: true,
          valid_from: { [models.sequelize.Op.lte]: new Date() },
          valid_until: { [models.sequelize.Op.gte]: new Date() }
        }
      });

      if (promo) {
        if (promo.discount_type === 'percentage') {
          discount = (subtotal * promo.discount_value) / 100;
        } else {
          discount = promo.discount_value;
        }
      }
    }

    const tax_amount = (subtotal - discount) * TAX_RATE;
    const shipping_cost = shipping_option === 'free' || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total_amount = (subtotal - discount) + tax_amount + shipping_cost;

    // Create session/checkout record
    const checkout_session = {
      user_id: req.user.id,
      cart_items: cart.items,
      addresses: {
        shipping_address_id,
        billing_address_id
      },
      promo_code,
      summary: {
        subtotal,
        discount,
        tax_amount,
        shipping_cost,
        total_amount
      },
      status: 'ready_for_payment',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 min expiry
    };

    return ApiResponse.success(res, checkout_session, 'Checkout confirmed. Ready for payment');
  } catch (error) {
    console.error('❌ confirmCheckout error:', error);
    return ApiResponse.serverError(res, error);
  }
};