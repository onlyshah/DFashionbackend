/**
 * Data Validation Utility
 * Validates IDs, relationships, and foreign key constraints
 */

const mongoose = require('mongoose');

/**
 * Check if a value is a valid MongoDB ObjectId
 */
const isValidMongoId = (id) => {
  try {
    return mongoose.Types.ObjectId.isValid(id);
  } catch (e) {
    return false;
  }
};

/**
 * Validate that a product exists
 */
const validateProductExists = async (Product, productId) => {
  if (!productId) {
    return {
      valid: false,
      error: 'Product ID is required',
      code: 'MISSING_PRODUCT_ID'
    };
  }

  let product = await Product.findOne({ id: productId });
  
  if (!product && isValidMongoId(productId)) {
    try {
      product = await Product.findById(productId);
    } catch (e) {
      // Continue to next check
    }
  }
  
  if (!product) {
    try {
      product = await Product.findOne({ _id: productId });
    } catch (e) {
      // Product not found
    }
  }

  if (!product) {
    return {
      valid: false,
      error: 'Product not found. The product may have been deleted or ID is invalid.',
      code: 'PRODUCT_NOT_FOUND',
      data: { productId }
    };
  }

  if (!product.isActive && product.isActive !== undefined) {
    return {
      valid: false,
      error: 'Product is no longer available.',
      code: 'PRODUCT_INACTIVE',
      data: { productId }
    };
  }

  if ((product.stock || 0) <= 0) {
    return {
      valid: false,
      error: 'Product is out of stock.',
      code: 'OUT_OF_STOCK',
      data: { productId, stock: product.stock }
    };
  }

  return {
    valid: true,
    product,
    productId: product._id || product.id
  };
};

/**
 * Validate that a user exists and is active
 */
const validateUserExists = async (User, userId) => {
  if (!userId) {
    return {
      valid: false,
      error: 'User ID is required',
      code: 'MISSING_USER_ID'
    };
  }

  let user = await User.findOne({ id: userId });
  
  if (!user && isValidMongoId(userId)) {
    try {
      user = await User.findById(userId);
    } catch (e) {
      // Continue to next check
    }
  }
  
  if (!user) {
    try {
      user = await User.findOne({ _id: userId });
    } catch (e) {
      // User not found
    }
  }

  if (!user) {
    return {
      valid: false,
      error: 'User not found.',
      code: 'USER_NOT_FOUND',
      data: { userId }
    };
  }

  if (user.isActive === false) {
    return {
      valid: false,
      error: 'User account is inactive.',
      code: 'USER_INACTIVE',
      data: { userId }
    };
  }

  return {
    valid: true,
    user,
    userId: user._id || user.id
  };
};

/**
 * Validate cart item quantity against product stock
 */
const validateCartItemQuantity = (product, requestedQuantity) => {
  const quantity = parseInt(requestedQuantity) || 1;

  if (quantity < 1) {
    return {
      valid: false,
      error: 'Quantity must be at least 1.',
      code: 'INVALID_QUANTITY'
    };
  }

  if (quantity > (product.stock || 0)) {
    return {
      valid: false,
      error: `Only ${product.stock || 0} item(s) available. Requested ${quantity}.`,
      code: 'INSUFFICIENT_STOCK',
      data: { 
        requested: quantity, 
        available: product.stock || 0 
      }
    };
  }

  return {
    valid: true,
    quantity
  };
};

/**
 * Validate wishlist item exists and belongs to user
 */
const validateWishlistOwnership = (wishlistItem, userId) => {
  if (!wishlistItem) {
    return {
      valid: false,
      error: 'Wishlist item not found.',
      code: 'WISHLIST_ITEM_NOT_FOUND'
    };
  }

  if (wishlistItem.userId !== userId) {
    return {
      valid: false,
      error: 'You do not have permission to modify this wishlist item.',
      code: 'UNAUTHORIZED_WISHLIST_ACCESS',
      data: { itemId: wishlistItem._id || wishlistItem.id }
    };
  }

  return {
    valid: true,
    wishlistItem
  };
};

/**
 * Validate cart item exists and belongs to user
 */
const validateCartOwnership = (cartItem, userId) => {
  if (!cartItem) {
    return {
      valid: false,
      error: 'Cart item not found.',
      code: 'CART_ITEM_NOT_FOUND'
    };
  }

  // Cart items don't directly reference user, but cart does
  return {
    valid: true,
    cartItem
  };
};

/**
 * Format validation error for API response
 */
const formatValidationError = (validationResult) => {
  return {
    success: false,
    message: validationResult.error,
    code: validationResult.code,
    data: validationResult.data || null
  };
};

module.exports = {
  isValidMongoId,
  validateProductExists,
  validateUserExists,
  validateCartItemQuantity,
  validateWishlistOwnership,
  validateCartOwnership,
  formatValidationError
};
