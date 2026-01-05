const express = require('express');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const ProductComment = require('../models/ProductComment');
const ProductShare = require('../models/ProductShare');
const { auth, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// ==================== PRODUCT SOCIAL FEATURES ====================

// @route   POST /api/ecommerce/products/:id/like
// @desc    Like/unlike a product
// @access  Private
router.post('/products/:id/like', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const existingLike = product.likes.find(like => 
      like.user.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      product.likes = product.likes.filter(like => 
        like.user.toString() !== req.user._id.toString()
      );
      product.analytics.likes = Math.max(0, product.analytics.likes - 1);
    } else {
      // Like
      product.likes.push({
        user: req.user._id,
        likedAt: new Date()
      });
      product.analytics.likes += 1;
    }

    await product.save();

    res.json({
      success: true,
      message: existingLike ? 'Product unliked' : 'Product liked',
      isLiked: !existingLike,
      likesCount: product.likes.length
    });
  } catch (error) {
    console.error('Like product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like product',
      error: error.message
    });
  }
});

// @route   POST /api/ecommerce/products/:id/share
// @desc    Share a product
// @access  Private
router.post('/products/:id/share', [
  auth,
  body('platform').isIn(['facebook', 'twitter', 'instagram', 'whatsapp', 'email', 'copy_link']).withMessage('Invalid platform'),
  body('message').optional().isLength({ max: 500 }).withMessage('Message too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { platform, message } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Add to product shares
    product.shares.push({
      user: req.user._id,
      platform,
      message,
      sharedAt: new Date()
    });
    product.analytics.shares += 1;

    // Create detailed share record
    const shareUrl = `${process.env.FRONTEND_URL}/product/${product._id}`;
    const shortUrl = ProductShare.generateShortUrl();

    const productShare = new ProductShare({
      product: product._id,
      sharedBy: req.user._id,
      sharedWith: [{
        platform,
        sharedAt: new Date()
      }],
      message,
      shareUrl,
      shortUrl,
      privacy: {
        isPublic: req.body.isPublic || false,
        allowComments: true,
        allowLikes: true
      }
    });

    await Promise.all([product.save(), productShare.save()]);

    res.json({
      success: true,
      message: 'Product shared successfully',
      shareUrl: `${process.env.FRONTEND_URL}/s/${shortUrl}`,
      share: productShare
    });
  } catch (error) {
    console.error('Share product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share product',
      error: error.message
    });
  }
});

// ==================== WISHLIST SOCIAL FEATURES ====================

// @route   POST /api/ecommerce/wishlist/items/:itemId/like
// @desc    Like/unlike a wishlist item
// @access  Private
router.post('/wishlist/items/:itemId/like', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      'items._id': req.params.itemId
    }).populate('user', 'username fullName');

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    const item = wishlist.items.id(req.params.itemId);
    const existingLike = item.likes.find(like => 
      like.user.toString() === req.user._id.toString()
    );

    if (existingLike) {
      wishlist.unlikeItem(req.params.itemId, req.user._id);
    } else {
      wishlist.likeItem(req.params.itemId, req.user._id);
    }

    await wishlist.save();

    res.json({
      success: true,
      message: existingLike ? 'Item unliked' : 'Item liked',
      isLiked: !existingLike,
      likesCount: item.likes.length
    });
  } catch (error) {
    console.error('Like wishlist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like item',
      error: error.message
    });
  }
});

// @route   POST /api/ecommerce/wishlist/items/:itemId/comment
// @desc    Comment on a wishlist item
// @access  Private
router.post('/wishlist/items/:itemId/comment', [
  auth,
  body('text').notEmpty().withMessage('Comment text is required').isLength({ max: 300 }).withMessage('Comment too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { text } = req.body;
    const wishlist = await Wishlist.findOne({
      'items._id': req.params.itemId
    }).populate('user', 'username fullName');

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    // Check if wishlist allows comments
    if (!wishlist.shareSettings.allowComments) {
      return res.status(403).json({
        success: false,
        message: 'Comments are not allowed on this wishlist'
      });
    }

    wishlist.addComment(req.params.itemId, req.user._id, text);
    await wishlist.save();

    const item = wishlist.items.id(req.params.itemId);
    const newComment = item.comments[item.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Comment on wishlist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

// @route   DELETE /api/ecommerce/wishlist/items/:itemId/comments/:commentId
// @desc    Delete a comment from wishlist item
// @access  Private (Own comment or Super Admin)
router.delete('/wishlist/items/:itemId/comments/:commentId', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      'items._id': req.params.itemId
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    const item = wishlist.items.id(req.params.itemId);
    const comment = item.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check permissions
    const isOwner = comment.user.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    wishlist.removeComment(req.params.itemId, req.params.commentId, req.user._id);
    await wishlist.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete wishlist comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
});

// ==================== CART SAVE FOR LATER ====================

// @route   POST /api/ecommerce/cart/items/:itemId/save-for-later
// @desc    Save cart item for later
// @access  Private
router.post('/cart/items/:itemId/save-for-later', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.saveForLater(req.params.itemId);
    await cart.save();

    res.json({
      success: true,
      message: 'Item saved for later',
      cart: cart
    });
  } catch (error) {
    console.error('Save for later error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save item for later',
      error: error.message
    });
  }
});

// @route   POST /api/ecommerce/cart/saved/:itemId/move-to-cart
// @desc    Move saved item back to cart
// @access  Private
router.post('/cart/saved/:itemId/move-to-cart', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.moveToCart(req.params.itemId);
    await cart.save();

    res.json({
      success: true,
      message: 'Item moved to cart',
      cart: cart
    });
  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move item to cart',
      error: error.message
    });
  }
});

// @route   DELETE /api/ecommerce/cart/saved/:itemId
// @desc    Remove item from saved for later
// @access  Private
router.delete('/cart/saved/:itemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.removeFromSaved(req.params.itemId);
    await cart.save();

    res.json({
      success: true,
      message: 'Item removed from saved for later',
      cart: cart
    });
  } catch (error) {
    console.error('Remove from saved error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item',
      error: error.message
    });
  }
});

// ==================== ADMIN MANAGEMENT ====================

// @route   DELETE /api/ecommerce/admin/products/:id
// @desc    Delete product (Super Admin only)
// @access  Private (Super Admin)
router.delete('/admin/products/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Clean up related data
    await Promise.all([
      ProductComment.deleteMany({ product: req.params.id }),
      ProductShare.deleteMany({ product: req.params.id }),
      Cart.updateMany(
        { 'items.product': req.params.id },
        { $pull: { items: { product: req.params.id } } }
      ),
      Wishlist.updateMany(
        { 'items.product': req.params.id },
        { $pull: { items: { product: req.params.id } } }
      )
    ]);

    res.json({
      success: true,
      message: 'Product and related data deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

// @route   GET /api/ecommerce/admin/analytics
// @desc    Get system analytics (Super Admin only)
// @access  Private (Super Admin)
router.get('/admin/analytics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const [
      totalProducts,
      totalUsers,
      totalComments,
      totalShares,
      totalWishlists,
      totalCarts
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      (function(){ const models = require('../models'); const User = models.User; return User.countDocuments ? User.countDocuments({ role: 'customer' }) : User.count({ where: { role: 'customer' } }); })(),
      ProductComment.countDocuments({ moderationStatus: 'approved' }),
      ProductShare.countDocuments({ isActive: true }),
      Wishlist.countDocuments({}),
      Cart.countDocuments({})
    ]);

    res.json({
      success: true,
      analytics: {
        products: totalProducts,
        customers: totalUsers,
        comments: totalComments,
        shares: totalShares,
        wishlists: totalWishlists,
        carts: totalCarts
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
});

module.exports = router;
