/**
 * Wishlist Controller
 * Handles wishlist management operations
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models')();
const { Wishlist, Product, Cart } = models;

// ==================== WISHLIST OPERATIONS ====================

/**
 * Get user's wishlist
 */
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user.userId })
      .populate('items.productId', 'name price images brand category stock rating');

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.user.userId,
        items: []
      });
    }

    res.json({
      success: true,
      data: {
        wishlist,
        itemCount: wishlist.items.length
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist',
      error: error.message
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
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get or create wishlist
    let wishlist = await Wishlist.findOne({ userId: req.user.userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.user.userId,
        items: []
      });
    }

    // Check if product already in wishlist
    const exists = wishlist.items.find(
      item => item.productId.toString() === productId
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add product to wishlist
    wishlist.items.push({
      productId,
      addedAt: Date.now()
    });

    await wishlist.save();
    await wishlist.populate('items.productId', 'name price images brand');

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: { wishlist }
    });
  } catch (error) {
    console.error('Add to wishlist error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist',
      error: error.message
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

    const wishlist = await Wishlist.findOne({ userId: req.user.userId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.items = wishlist.items.filter(
      item => item._id.toString() !== itemId
    );

    await wishlist.save();

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      data: { wishlist }
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist',
      error: error.message
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

    const wishlist = await Wishlist.findOne({ userId: req.user.userId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const wishlistItem = wishlist.items.find(
      item => item._id.toString() === itemId
    );

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    // Verify stock
    const product = await Product.findById(wishlistItem.productId);
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }

    // Add to cart
    let cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      cart = new Cart({
        userId: req.user.userId,
        items: []
      });
    }

    const existingItem = cart.items.find(
      item => item.productId.toString() === wishlistItem.productId.toString()
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: wishlistItem.productId,
        quantity,
        addedAt: Date.now()
      });
    }

    await cart.save();

    // Remove from wishlist
    wishlist.items = wishlist.items.filter(
      item => item._id.toString() !== itemId
    );
    await wishlist.save();

    res.json({
      success: true,
      message: 'Product moved to cart',
      data: { cart, wishlist }
    });
  } catch (error) {
    console.error('Move to cart error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to move to cart',
      error: error.message
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
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let wishlist = await Wishlist.findOne({ userId: req.user.userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.user.userId,
        items: []
      });
    }

    const exists = wishlist.items.find(
      item => item.productId.toString() === productId
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Product already liked'
      });
    }

    wishlist.items.push({
      productId,
      addedAt: Date.now()
    });

    await wishlist.save();

    res.json({
      success: true,
      message: 'Product liked',
      data: { wishlist }
    });
  } catch (error) {
    console.error('Like product error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to like product',
      error: error.message
    });
  }
};
