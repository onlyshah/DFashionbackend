/**
 * Wishlist Controller
 * Handles wishlist management operations
 * Model → Controller → Routes pattern
 */

const models = require('../models_sql');

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
    if (!req.user) {
      return res.json({
        success: true,
        data: {
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
        },
        message: 'Wishlist retrieved successfully'
      });
    }

    await ensureModelsReady();

    const Wishlist = models._raw?.Wishlist || models.Wishlist;
    const Product = models._raw?.Product || models.Product;

    if (!Wishlist || !Product) {
      return res.status(500).json({
        success: false,
        message: 'Models not initialized',
        data: null
      });
    }

    const parsedPage = Number.parseInt(req.query.page, 10) || 1;
    const parsedLimit = Number.parseInt(req.query.limit, 10) || 12;
    const offset = (parsedPage - 1) * parsedLimit;

    const result = await Wishlist.findAndCountAll({
      where: { userId: req.user.id },
      offset,
      limit: parsedLimit,
      order: [['addedAt', 'DESC']],
      include: [
        {
          model: Product,
          as: 'product',
          required: false,
          attributes: ['id', 'name', 'title', 'price', 'discountPrice', 'stock', 'isActive', 'ratings', 'reviews']
        }
      ]
    });

    const items = result.rows.map((item) => ({
      id: item.id,
      productId: item.productId,
      addedAt: item.addedAt,
      product: item.product ? {
        id: item.product.id,
        name: item.product.name || item.product.title || '',
        price: Number(item.product.price || 0),
        originalPrice: item.product.discountPrice ? Number(item.product.discountPrice) : undefined,
        images: [],
        brand: '',
        discount: 0,
        rating: {
          average: Number(item.product.ratings || 0),
          count: Number(item.product.reviews || 0)
        },
        analytics: {
          views: 0,
          likes: 0
        },
        isActive: !!item.product.isActive
      } : null
    })).filter((item) => !!item.product);

    const totalValue = items.reduce((sum, item) => sum + (item.product?.price || 0), 0);

    return res.json({
      success: true,
      data: {
        items,
        summary: {
          totalItems: result.count,
          totalValue,
          totalSavings: 0,
          itemCount: result.count
        },
        pagination: {
          currentPage: parsedPage,
          totalPages: Math.ceil(result.count / parsedLimit),
          totalItems: result.count,
          hasNextPage: (parsedPage * parsedLimit) < result.count,
          hasPrevPage: parsedPage > 1
        }
      },
      message: 'Wishlist retrieved successfully'
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

    // Get actual Sequelize models from _raw
    const Wishlist = models._raw?.Wishlist || models.Wishlist;
    const Product = models._raw?.Product || models.Product;

    if (!Wishlist || !Product) {
      return res.status(500).json({
        success: false,
        message: 'Models not initialized',
        data: null
      });
    }

    // Accept both productId and product_id
    const productId = req.body.productId || req.body.product_id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
        statusCode: 400
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
      return res.status(409).json({
        success: false,
        message: 'Already in wishlist',
        data: {
          id: exists.id,
          productId: exists.productId,
          addedAt: exists.addedAt
        },
        statusCode: 409
      });
    }

    // Add product to wishlist
    const wishlistItem = await Wishlist.create({
      userId: req.user.id,
      productId,
      addedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Added to wishlist',
      data: { 
        id: wishlistItem.id,
        productId: wishlistItem.productId,
        addedAt: wishlistItem.addedAt
      },
      statusCode: 201
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
    await ensureModelsReady();

    const Wishlist = models._raw?.Wishlist || models.Wishlist;

    if (!Wishlist) {
      return res.status(500).json({
        success: false,
        message: 'Models not initialized',
        data: null
      });
    }

    const itemId = req.params.itemId || req.body.itemId || req.body.item_id;
    const productId = req.body.productId || req.body.product_id || req.params.productId;

    if (!itemId && !productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const where = { userId: req.user.id };
    if (itemId) {
      where.id = itemId;
    } else {
      where.productId = productId;
    }

    const wishlistItem = await Wishlist.findOne({ where });
    if (!wishlistItem) {
      return res.status(200).json({
        success: true,
        message: 'Removed from wishlist'
      });
    }

    await wishlistItem.destroy();

    res.json({
      success: true,
      message: 'Removed from wishlist'
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

