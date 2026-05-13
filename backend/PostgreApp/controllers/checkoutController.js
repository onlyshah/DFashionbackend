/**
 * ============================================================================
 * CHECKOUT CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Checkout workflow, promo validation, tax calculation, payment prep
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 8
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

const TAX_RATE = 0.18;
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_SHIPPING = 100;

/**
 * Initiate checkout
 */
exports.initiateCheckout = async (req, res) => {
  try {
    const { shipping_address_id, billing_address_id } = req.body;

    const cart = await models.Cart.findOne({
      where: { userId: req.user.id },
      include: [{
        model: models.CartItem,
        as: 'items',
        include: { model: models.Product, attributes: ['id', 'name', 'price', 'stock'] }
      }]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 422);
    }

    const shipping_addr = await models.Address.findByPk(shipping_address_id);
    if (!shipping_addr || shipping_addr.userId !== req.user.id) {
      return ApiResponse.notFound(res, 'Shipping address');
    }

    const billing_addr = await models.Address.findByPk(billing_address_id);
    if (!billing_addr || billing_addr.userId !== req.user.id) {
      return ApiResponse.notFound(res, 'Billing address');
    }

    for (const item of cart.items) {
      if (item.Product.stock < item.quantity) {
        return ApiResponse.error(res, `Insufficient stock for ${item.Product.name}`, 409);
      }
    }

    let subtotal = 0;
    for (const item of cart.items) {
      subtotal += item.Product.price * item.quantity;
    }

    const tax_amount = subtotal * TAX_RATE;
    const shipping_cost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total_amount = subtotal + tax_amount + shipping_cost;

    return ApiResponse.success(res, {
      cart_items: cart.items,
      addresses: { shipping: shipping_addr, billing: billing_addr },
      summary: { subtotal, tax_amount, shipping_cost, total_amount }
    }, 'Checkout initiated successfully');
  } catch (error) {
    console.error('❌ initiateCheckout error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Apply/validate promo code
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
        valid_from: { [Op.lte]: new Date() },
        valid_until: { [Op.gte]: new Date() }
      }
    });

    if (!promo) {
      return ApiResponse.error(res, 'Invalid or expired promo code', 404);
    }

    if (promo.min_purchase && subtotal < promo.min_purchase) {
      return ApiResponse.error(res, `Minimum purchase amount: ${promo.min_purchase}`, 422);
    }

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
      promo_details: { type: promo.discount_type, value: promo.discount_value, description: promo.description }
    }, 'Promo code applied successfully');
  } catch (error) {
    console.error('❌ applyPromo error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Calculate shipping cost
 */
exports.calculateShipping = async (req, res) => {
  try {
    const { postal_code, weight = 0.5, subtotal } = req.body;

    if (!postal_code) {
      return ApiResponse.error(res, 'Postal code required', 422);
    }

    const shipping_options = [
      { id: 'standard', name: 'Standard Shipping', cost: subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING, delivery_days: '5-7' },
      { id: 'express', name: 'Express Shipping', cost: 250, delivery_days: '2-3' },
      { id: 'overnight', name: 'Overnight Shipping', cost: 500, delivery_days: '1' }
    ];

    return ApiResponse.success(res, shipping_options, 'Shipping options calculated successfully');
  } catch (error) {
    console.error('❌ calculateShipping error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Validate address
 */
exports.validateAddress = async (req, res) => {
  try {
    const { street, city, state, postal_code, country, phone } = req.body;

    if (!street || !city || !state || !postal_code || !country) {
      return ApiResponse.error(res, 'All address fields are required', 422);
    }

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
 * Get cart summary
 */
exports.getCartSummary = async (req, res) => {
  try {
    const cart = await models.Cart.findOne({
      where: { userId: req.user.id },
      include: [{ model: models.CartItem, as: 'items' }]
    });

    if (!cart) {
      return ApiResponse.error(res, 'Cart not found', 404);
    }

    return ApiResponse.success(res, cart, 'Cart summary retrieved');
  } catch (error) {
    console.error('❌ getCartSummary error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Validate cart
 */
exports.validateCart = async (req, res) => {
  try {
    const cart = await models.Cart.findOne({
      where: { userId: req.user.id },
      include: [{ model: models.CartItem, as: 'items', include: [{ model: models.Product }] }]
    });

    if (!cart || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 422);
    }

    const invalid_items = cart.items.filter(item => item.quantity > item.Product.stock);
    if (invalid_items.length > 0) {
      return ApiResponse.error(res, 'Some items have insufficient stock', 409);
    }

    return ApiResponse.success(res, { valid: true, message: 'Cart is valid' }, 'Cart validated');
  } catch (error) {
    console.error('❌ validateCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get checkout details / Confirm checkout
 */
exports.getCheckoutDetails = async (req, res) => {
  try {
    const { shipping_address_id, billing_address_id, shipping_option, promo_code } = req.body;

    const cart = await models.Cart.findOne({
      where: { userId: req.user.id },
      include: [{
        model: models.CartItem,
        as: 'items',
        include: { model: models.Product, attributes: ['id', 'name', 'price', 'stock'] }
      }]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 422);
    }

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
          valid_from: { [Op.lte]: new Date() },
          valid_until: { [Op.gte]: new Date() }
        }
      });

      if (promo) {
        discount = promo.discount_type === 'percentage' 
          ? Math.min((subtotal * promo.discount_value) / 100, promo.max_discount || Infinity)
          : promo.discount_value;
      }
    }

    const tax_amount = subtotal * TAX_RATE;
    const shipping_cost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total_amount = subtotal + tax_amount + shipping_cost - discount;

    return ApiResponse.success(res, {
      cart_items: cart.items,
      summary: { subtotal, discount, tax_amount, shipping_cost, total_amount }
    }, 'Checkout details retrieved');
  } catch (error) {
    console.error('❌ getCheckoutDetails error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.confirmCheckout = exports.getCheckoutDetails;


