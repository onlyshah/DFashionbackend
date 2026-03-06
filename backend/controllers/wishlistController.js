/**
 * Wishlist Controller
 * Handles wishlist management operations
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models');
const { Wishlist, Product, Cart } = models;

// ==================== WISHLIST OPERATIONS ====================

/**
 * Get user's wishlist
 */
exports.getWishlist = async (req, res) => {
  try {
    // If no user (optional auth), return empty wishlist
    if (!req.user) {
      return res.json({
        success: true,
        data: {
          items: [],
          itemCount: 0
        },
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0
        }
      });
    }

    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    // Get wishlist items for user with pagination
    const { count, rows } = await Wishlist.findAndCountAll({
      where: { userId: req.user.userId },
      offset,
      limit: parseInt(limit),
      order: [['addedAt', 'DESC']],
      attributes: ['id', 'productId', 'addedAt']
    });

    // Get product details
    const productIds = rows.map(item => item.productId);
    const products = productIds.length > 0 ? await Product.findAll({
      where: { id: productIds },
      attributes: ['id', 'name', 'price', 'images', 'brand', 'category', 'stock', 'rating']
    }) : [];

    // Map wishlist items with product details
    const items = rows.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        id: item.id,
        productId: item.productId,
        addedAt: item.addedAt,
        product: product || null
      };
    });

    res.json({
      success: true,
      data: { items, itemCount: count },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist',
      data: null
    });
  }
};

/**
 * Add product to wishlist
 */
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Verify product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product already in wishlist
    const exists = await Wishlist.findOne({
      where: { userId: req.user.userId, productId }
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add product to wishlist
    const wishlistItem = await Wishlist.create({
      userId: req.user.userId,
      productId,
      addedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: { 
        id: wishlistItem.id,
        productId: wishlistItem.productId,
        addedAt: wishlistItem.addedAt
      }
    });
  } catch (error) {
    console.error('Add to wishlist error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist',
      data: null
    });
  }
};

/**
 * Remove product from wishlist
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }

    const wishlistItem = await Wishlist.findByPk(itemId);
    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    // Verify ownership
    if (wishlistItem.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await wishlistItem.destroy();

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist',
      data: null
    });
  }
};

/**
 * Move product from wishlist to cart
 */
exports.moveToCart = async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }

    const wishlistItem = await Wishlist.findByPk(itemId);
    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    // Verify ownership
    if (wishlistItem.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Verify stock
    const product = await Product.findByPk(wishlistItem.productId);
    if (!product || product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product not found or insufficient stock'
      });
    }

    // Add to cart or update existing cart item
    const cartItem = await Cart.findOne({
      where: { userId: req.user.userId, productId: wishlistItem.productId }
    });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      await Cart.create({
        userId: req.user.userId,
        productId: wishlistItem.productId,
        quantity,
        addedAt: new Date()
      });
    }

    // Remove from wishlist
    await wishlistItem.destroy();

    res.json({
      success: true,
      message: 'Product moved to cart'
    });
  } catch (error) {
    console.error('Move to cart error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to move to cart',
      data: null
    });
  }
};

/**
 * Like/favorite product (same as add to wishlist variant)
 */
exports.likeProduct = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Same as addToWishlist
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const exists = await Wishlist.findOne({
      where: { userId: req.user.userId, productId }
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Product already liked'
      });
    }

    const wishlistItem = await Wishlist.create({
      userId: req.user.userId,
      productId,
      addedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Product liked',
      data: { 
        id: wishlistItem.id,
        productId: wishlistItem.productId,
        addedAt: wishlistItem.addedAt
      }
    });
  } catch (error) {
    console.error('Like product error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to like product',
      data: null
    });
  }
};
