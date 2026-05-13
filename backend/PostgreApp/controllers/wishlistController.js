/**
 * WISHLIST CONTROLLER - PostgreSQL (Sequelize)
 * Handles wishlist management operations
 * Sequelize ORM only - no MongoDB code
 */

const { validateProductExists, formatValidationError } = require('../utils/dataValidation');

const response = {
  success: (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      errorCode: null
    });
  },
  error: (res, message, errorCode, statusCode = 400, data = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get user's wishlist with pagination
 */
exports.getWishlist = async (req, res) => {
  try {
    // Get models from unified abstraction
    const { Wishlist, Product } = require('../models');

    if (!Wishlist || !Wishlist._model || !Product || !Product._model) {
      return response.error(res, 'Wishlist models not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return response.success(res, 'Wishlist retrieved successfully', {
        items: [],
        summary: {
          totalItems: 0,
          totalValue: 0,
          totalSavings: 0,
          itemCount: 0
        },
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Parse pagination parameters
    const parsedPage = Math.max(1, parseInt(req.query.page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 12));
    const offset = (parsedPage - 1) * parsedLimit;

    // Fetch wishlist items with associated product data
    const { count, rows: wishlistItems } = await Wishlist._model.findAndCountAll({
      where: { userId: req.user.id },
      include: [
        {
          association: 'product',
          model: Product._model,
          attributes: ['id', 'name', 'title', 'price', 'discountPrice', 'images', 'brand', 'discount', 'ratings', 'reviews', 'views', 'likes', 'isActive'],
          where: { isActive: true },
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset: offset,
      distinct: true
    });

    // Format wishlist items
    const items = wishlistItems
      .filter(item => item.product && item.product.isActive !== false)
      .map(item => ({
        id: item.id,
        productId: item.productId,
        addedAt: item.addedAt || item.createdAt,
        product: {
          id: item.product.id,
          name: item.product.name || item.product.title || '',
          price: Number(item.product.price || 0),
          originalPrice: item.product.discountPrice ? Number(item.product.discountPrice) : undefined,
          images: item.product.images || [],
          brand: item.product.brand || '',
          discount: item.product.discount || 0,
          rating: {
            average: Number(item.product.ratings || 0),
            count: Number(item.product.reviews || 0)
          },
          analytics: {
            views: item.product.views || 0,
            likes: item.product.likes || 0
          },
          isActive: item.product.isActive !== false
        }
      }));

    const totalValue = items.reduce((sum, item) => sum + (item.product?.price || 0), 0);

    return response.success(res, 'Wishlist retrieved successfully', {
      items,
      summary: {
        totalItems: count,
        totalValue,
        totalSavings: 0,
        itemCount: items.length
      },
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(count / parsedLimit),
        totalItems: count,
        hasNextPage: (parsedPage * parsedLimit) < count,
        hasPrevPage: parsedPage > 1
      }
    });
  } catch (error) {
    console.error('[WishlistController-Postgres] getWishlist error:', error.message);
    return response.error(res, 'Failed to fetch wishlist', 'FETCH_ERROR', 500);
  }
};

/**
 * Add product to wishlist
 */
exports.addToWishlist = async (req, res) => {
  try {
    // Get models from unified abstraction
    const { Wishlist, Product } = require('../models');

    if (!Wishlist || !Wishlist._model || !Product || !Product._model) {
      return response.error(res, 'Wishlist models not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return response.error(res, 'User not authenticated', 'UNAUTHORIZED', 401);
    }

    // Get product ID from request
    let productId = req.body.productId || req.body.product_id;

    if (!productId) {
      return response.error(res, 'Product ID is required', 'MISSING_PRODUCT_ID', 400);
    }

    // Validate product exists
    const product = await Product._model.findByPk(productId);
    if (!product) {
      return response.error(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    // Check if product already in wishlist
    const existingWishlist = await Wishlist._model.findOne({
      where: {
        userId: req.user.id,
        productId: productId
      }
    });

    if (existingWishlist) {
      return response.error(res, 'Product already in wishlist', 'ALREADY_IN_WISHLIST', 409, {
        id: existingWishlist.id,
        productId: existingWishlist.productId,
        addedAt: existingWishlist.addedAt || existingWishlist.createdAt
      });
    }

    // Create wishlist item
    const wishlistItem = await Wishlist._model.create({
      userId: req.user.id,
      productId: productId,
      addedAt: new Date()
    });

    return response.success(res, 'Added to wishlist', {
      id: wishlistItem.id,
      productId: wishlistItem.productId,
      addedAt: wishlistItem.addedAt || wishlistItem.createdAt
    }, 201);
  } catch (error) {
    console.error('[WishlistController-Postgres] addToWishlist error:', error.message);
    return response.error(res, 'Failed to add to wishlist', 'WISHLIST_ADD_FAILED', 500);
  }
};

/**
 * Remove product from wishlist
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    // Get models from unified abstraction
    const { Wishlist } = require('../models');

    if (!Wishlist || !Wishlist._model) {
      return response.error(res, 'Wishlist model not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return response.error(res, 'User not authenticated', 'UNAUTHORIZED', 401);
    }

    // Get item ID from request
    const itemId = req.params.itemId || req.body.itemId || req.body.item_id;
    const productId = req.body.productId || req.body.product_id || req.params.productId;

    if (!itemId && !productId) {
      return response.error(res, 'Item ID or Product ID is required', 'MISSING_ID', 400);
    }

    // Find wishlist item
    let wishlistItem;
    if (itemId) {
      wishlistItem = await Wishlist._model.findByPk(itemId);
    } else if (productId) {
      wishlistItem = await Wishlist._model.findOne({
        where: {
          userId: req.user.id,
          productId: productId
        }
      });
    }

    if (!wishlistItem) {
      return response.success(res, 'Removed from wishlist', null);
    }

    // Verify user owns this wishlist item
    if (String(wishlistItem.userId) !== String(req.user.id)) {
      return response.error(res, 'Not authorized to modify this wishlist item', 'UNAUTHORIZED', 403);
    }

    // Delete the wishlist item
    await wishlistItem.destroy();

    return response.success(res, 'Removed from wishlist', null);
  } catch (error) {
    console.error('[WishlistController-Postgres] removeFromWishlist error:', error.message);
    return response.error(res, 'Failed to remove from wishlist', 'WISHLIST_REMOVE_FAILED', 500);
  }
};

/**
 * Move product from wishlist to cart
 */
exports.moveToCart = async (req, res) => {
  try {
    // Get models from unified abstraction
    const { Wishlist, Product, Cart } = require('../models');

    if (!Wishlist || !Wishlist._model || !Product || !Product._model || !Cart || !Cart._model) {
      return response.error(res, 'Models not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return response.error(res, 'User not authenticated', 'UNAUTHORIZED', 401);
    }

    const { itemId, quantity = 1 } = req.body;

    if (!itemId) {
      return response.error(res, 'Item ID is required', 'MISSING_ITEM_ID', 400);
    }

    // Find wishlist item
    const wishlistItem = await Wishlist._model.findByPk(itemId);
    if (!wishlistItem) {
      return response.error(res, 'Item not found in wishlist', 'WISHLIST_ITEM_NOT_FOUND', 404);
    }

    // Verify ownership
    if (String(wishlistItem.userId) !== String(req.user.id)) {
      return response.error(res, 'Not authorized to modify this wishlist item', 'UNAUTHORIZED_WISHLIST_ACCESS', 403);
    }

    // Verify product exists and check stock
    const product = await Product._model.findByPk(wishlistItem.productId);
    if (!product) {
      return response.error(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    if ((product.stock || 0) < quantity) {
      return response.error(res, `Only ${product.stock || 0} item(s) available. Requested ${quantity}.`, 'INSUFFICIENT_STOCK', 400, {
        available: product.stock || 0,
        requested: quantity
      });
    }

    // Check if product already in cart
    const existingCartItem = await Cart._model.findOne({
      where: {
        userId: req.user.id,
        productId: product.id
      }
    });

    let cartItem;
    if (existingCartItem) {
      // Update quantity
      await existingCartItem.update({
        quantity: existingCartItem.quantity + quantity
      });
      cartItem = existingCartItem;
    } else {
      // Create new cart item
      cartItem = await Cart._model.create({
        userId: req.user.id,
        productId: product.id,
        quantity,
        price: product.price || 0,
        addedAt: new Date()
      });
    }

    // Remove from wishlist
    await wishlistItem.destroy();

    return response.success(res, 'Product moved to cart', {
      cartItemId: cartItem.id,
      productId: cartItem.productId,
      quantity: cartItem.quantity
    });
  } catch (error) {
    console.error('[WishlistController-Postgres] moveToCart error:', error.message);
    return response.error(res, 'Failed to move to cart', 'MOVE_TO_CART_FAILED', 500);
  }
};

/**
 * Like/favorite product (alias for addToWishlist)
 */
exports.likeProduct = async (req, res) => {
  try {
    // Get models from unified abstraction
    const { Wishlist, Product } = require('../models');

    if (!Wishlist || !Wishlist._model || !Product || !Product._model) {
      return response.error(res, 'Models not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return response.error(res, 'User not authenticated', 'UNAUTHORIZED', 401);
    }

    const { productId } = req.body;

    if (!productId) {
      return response.error(res, 'Product ID is required', 'MISSING_PRODUCT_ID', 400);
    }

    // Verify product exists
    const product = await Product._model.findByPk(productId);
    if (!product) {
      return response.error(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    // Check if already liked
    const existingLike = await Wishlist._model.findOne({
      where: {
        userId: req.user.id,
        productId: productId
      }
    });

    if (existingLike) {
      return response.error(res, 'Product already liked', 'ALREADY_IN_WISHLIST', 409);
    }

    // Create like
    const wishlistItem = await Wishlist._model.create({
      userId: req.user.id,
      productId: productId,
      addedAt: new Date()
    });

    return response.success(res, 'Product liked', {
      id: wishlistItem.id,
      productId: wishlistItem.productId,
      addedAt: wishlistItem.addedAt || wishlistItem.createdAt
    }, 201);
  } catch (error) {
    console.error('[WishlistController-Postgres] likeProduct error:', error.message);
    return response.error(res, 'Failed to like product', 'LIKE_FAILED', 500);
  }
};

module.exports = exports;


