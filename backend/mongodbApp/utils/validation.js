/**
 * ============================================================================
 * VALIDATION HELPER - Common validation patterns
 * ============================================================================
 * Purpose: Centralized validation for common scenarios
 */

const validatePostsRequest = (body) => {
  const errors = {};

  if (!body.caption || typeof body.caption !== 'string' || body.caption.trim() === '') {
    errors.caption = 'Caption is required and must be a non-empty string';
  }

  if (body.caption && body.caption.length > 5000) {
    errors.caption = 'Caption cannot exceed 5000 characters';
  }

  if (body.image_urls && !Array.isArray(body.image_urls)) {
    errors.image_urls = 'Image URLs must be an array';
  }

  if (body.visibility && !['public', 'private', 'followers_only'].includes(body.visibility)) {
    errors.visibility = 'Visibility must be one of: public, private, followers_only';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateProductRequest = (body) => {
  const errors = {};

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    errors.name = 'Product name is required';
  }

  if (body.selling_price === undefined || isNaN(parseFloat(body.selling_price))) {
    errors.selling_price = 'Selling price is required and must be a valid number';
  }

  if (body.quantity_available === undefined || isNaN(parseInt(body.quantity_available))) {
    errors.quantity_available = 'Quantity available is required and must be a valid integer';
  }

  if (!body.category_id) {
    errors.category_id = 'Category ID is required';
  }

  if (body.selling_price < 0) {
    errors.selling_price = 'Selling price cannot be negative';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateOrderRequest = (body) => {
  const errors = {};

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.items = 'Order must contain at least one item';
  }

  if (!body.shipping_address) {
    errors.shipping_address = 'Shipping address is required';
  }

  if (!body.billing_address) {
    errors.billing_address = 'Billing address is required';
  }

  if (!body.shipping_method) {
    errors.shipping_method = 'Shipping method is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validatePaymentRequest = (body) => {
  const errors = {};

  if (!body.order_id) {
    errors.order_id = 'Order ID is required';
  }

  if (!body.amount || isNaN(parseFloat(body.amount)) || parseFloat(body.amount) <= 0) {
    errors.amount = 'Amount must be a positive number';
  }

  if (!body.payment_method) {
    errors.payment_method = 'Payment method is required';
  }

  if (!['credit_card', 'debit_card', 'net_banking', 'upi', 'wallet'].includes(body.payment_method)) {
    errors.payment_method = 'Invalid payment method';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateCommentRequest = (body) => {
  const errors = {};

  if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
    errors.content = 'Comment content is required and must be non-empty';
  }

  if (body.content && body.content.length > 1000) {
    errors.content = 'Comment cannot exceed 1000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateReviewRequest = (body) => {
  const errors = {};

  if (body.rating === undefined || isNaN(parseInt(body.rating))) {
    errors.rating = 'Rating is required and must be a number';
  }

  if (body.rating < 1 || body.rating > 5) {
    errors.rating = 'Rating must be between 1 and 5';
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.title = 'Review title is required';
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
    errors.content = 'Review content is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateCreatorProfileRequest = (body) => {
  const errors = {};

  if (!body.display_name || typeof body.display_name !== 'string') {
    errors.display_name = 'Display name is required';
  }

  if (!body.category || typeof body.category !== 'string') {
    errors.category = 'Category is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateSellerProfileRequest = (body) => {
  const errors = {};

  if (!body.shop_name || typeof body.shop_name !== 'string') {
    errors.shop_name = 'Shop name is required';
  }

  if (!body.business_email || !isValidEmail(body.business_email)) {
    errors.business_email = 'Valid business email is required';
  }

  if (!body.business_phone || !isValidPhone(body.business_phone)) {
    errors.business_phone = 'Valid business phone is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^\+?(\d{1,3})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
  return phoneRegex.test(phone);
};

const validatePagination = (page, limit) => {
  const errors = {};

  if (isNaN(parseInt(page)) || parseInt(page) < 1) {
    errors.page = 'Page must be a positive integer';
  }

  if (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100) {
    errors.limit = 'Limit must be between 1 and 100';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    page: Math.max(1, parseInt(page) || 1),
    limit: Math.max(1, Math.min(100, parseInt(limit) || 10))
  };
};

module.exports = {
  validatePostsRequest,
  validateProductRequest,
  validateOrderRequest,
  validatePaymentRequest,
  validateCommentRequest,
  validateReviewRequest,
  validateCreatorProfileRequest,
  validateSellerProfileRequest,
  isValidEmail,
  isValidPhone,
  validatePagination
};
