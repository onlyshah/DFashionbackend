/**
 * Wishlist Controller
 * Handles wishlist management operations
 * Model → Controller → Routes pattern
 */

const dbType = process.env.DB_TYPE || 'mongodb';
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');

// Helper to ensure models are initialized before use
const ensureModelsReady = async () => {
  try {
    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }
  } catch (err) {
    console.warn('⚠️  Warning: Could not reinitialize models:', err.message);
  }
};

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
        wishlist: {
          items: [],
          itemCount: 0
        },
        summary: {
          totalItems: 0,
          totalValue: 0,
          totalSavings: 0,
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

    // Get lazy-loaded models
    const Wishlist = models.Wishlist;
    const Product = models.Product;

    if (!Wishlist) {
      console.error('[wishlistController] Wishlist model not available');
      return res.status(500).json({
        success: false,
        message: 'Models not initialized - Wishlist unavailable',
        data: null
      });
    }

    if (!Product) {
      console.error('[wishlistController] Product model not available');
      return res.status(500).json({
        success: false,
        message: 'Models not initialized - Product unavailable',
        data: null
      });
    }

    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let wishlistItems;
    let total;

    if (models.isPostgres) {
      // PostgreSQL implementation
      const result = await Wishlist.findAndCountAll({
        where: { userId: req.user.id },
        offset,
        limit: parseInt(limit),
        order: [['addedAt', 'DESC']],
        attributes: ['id', 'productId', 'addedAt']
      });

      wishlistItems = result.rows;
      total = result.count;
    } else {
      // MongoDB implementation
      const result = await Wishlist.findAndCountAll({
        userId: req.user.id,
        skip: offset,
        limit: parseInt(limit),
        sort: { addedAt: -1 }
      });

      wishlistItems = result.rows;
      total = result.count;
    }

    // Get product details
    const productIds = wishlistItems.map(item => item.productId || item.product_id);
    let products = [];

    if (productIds.length > 0) {
      if (models.isPostgres) {
        products = await Product.findAll({
          where: { id: productIds },
          attributes: ['id', 'name', 'price', 'images', 'brand', 'category', 'stock', 'rating']
        });
      } else {
        products = await Product.findAll({
          _id: { $in: productIds }
        });
      }
    }

    // Map wishlist items with product details
    const items = wishlistItems.map(item => {
      const productId = item.productId || item.product_id;
      const product = products.find(p => (p.id || p._id) === productId);
      return {
        id: item.id || item._id,
        productId: productId,
        addedAt: item.addedAt || item.added_at,
        product: product || null
      };
    });

    // Calculate summary
    const totalValue = items.reduce((sum, item) => sum + (item.product?.price || 0), 0);
    const summary = {
      totalItems: total,
      totalValue: totalValue,
      totalSavings: 0, // Calculate if original prices available
      itemCount: total
    };

    res.json({
      success: true,
      wishlist: { items, itemCount: total },
      summary: summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
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
    // Ensure models are ready before use
    await ensureModelsReady();

    // Get lazy-loaded models
    const Wishlist = models.Wishlist;
    const Product = models.Product;

    if (!Wishlist || !Product) {
      return res.status(500).json({
        success: false,
        message: 'Models not initialized',
        data: null
      });
    }

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
      where: { userId: req.user.id, productId }
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add product to wishlist
    const wishlistItem = await Wishlist.create({
      userId: req.user.id,
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
    // Get lazy-loaded models
    const Wishlist = models.Wishlist;

    if (!Wishlist) {
      return res.status(500).json({
        success: false,
        message: 'Models not initialized',
        data: null
      });
    }

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
    if (wishlistItem.userId !== req.user.id) {
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
    // Get lazy-loaded models
    const Wishlist = models.Wishlist;
    const Product = models.Product;
    const Cart = models.Cart;

    if (!Wishlist || !Product || !Cart) {
      return res.status(500).json({
        success: false,
        message: 'Models not initialized',
        data: null
      });
    }

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
    if (wishlistItem.userId !== req.user.id) {
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
    let userCart = await Cart.findOne({
      where: { userId: req.user.id }
    });

    if (!userCart) {
      userCart = await Cart.create({
        userId: req.user.id
      });
    }

    const CartItem = models.CartItem;
    const existingItem = await CartItem.findOne({
      where: { cartId: userCart.id, productId: wishlistItem.productId }
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      await existingItem.save();
    } else {
      await CartItem.create({
        cartId: userCart.id,
        productId: wishlistItem.productId,
        quantity,
        price: product.price || 0
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
    // Get lazy-loaded models
    const Wishlist = models.Wishlist;
    const Product = models.Product;

    if (!Wishlist || !Product) {
      return res.status(500).json({
        success: false,
        message: 'Models not initialized',
        data: null
      });
    }

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
      where: { userId: req.user.id, productId }
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Product already liked'
      });
    }

    const wishlistItem = await Wishlist.create({
      userId: req.user.id,
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

