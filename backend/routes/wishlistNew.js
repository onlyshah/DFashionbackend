const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');

// Get user's wishlist
router.get('/', auth, requireRole(['customer']), async (req, res) => {
  try {
    // findOrCreateForUser now handles population internally
    const wishlist = await Wishlist.findOrCreateForUser(req.user._id, true);

    res.json({
      success: true,
      wishlist: wishlist,
      summary: wishlist.summary
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist',
      error: error.message
    });
  }
});

// Add item to wishlist
router.post('/add', auth, requireRole(['customer']), async (req, res) => {
  try {
    const { productId, size, color, addedFrom = 'manual', notes, priority = 'medium' } = req.body;

    // Validate product exists and is active
    const product = await Product.findById(productId).populate('vendor');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get or create wishlist (without population for adding)
    const wishlist = await Wishlist.findOrCreateForUser(req.user._id, false);

    // Add item to wishlist
    wishlist.addItem({
      product: productId,
      size: size,
      color: color,
      price: product.price,
      originalPrice: product.originalPrice,
      addedFrom: addedFrom,
      notes: notes,
      priority: priority,
      vendor: product.vendor._id
    });

    await wishlist.save();

    // Populate the wishlist for response
    await wishlist.populate({
      path: 'items.product',
      select: 'name images price originalPrice brand category isActive',
      populate: {
        path: 'vendor',
        select: 'username fullName vendorInfo.businessName'
      }
    });

    res.json({
      success: true,
      message: 'Item added to wishlist successfully',
      wishlist: wishlist,
      summary: wishlist.summary
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to wishlist',
      error: error.message
    });
  }
});

// Update wishlist item
router.put('/update/:itemId', auth, requireRole(['customer']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { size, color, notes, priority } = req.body;

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const updateData = {};
    if (size !== undefined) updateData.size = size;
    if (color !== undefined) updateData.color = color;
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority;

    wishlist.updateItem(itemId, updateData);
    await wishlist.save();

    // Populate the wishlist for response
    await wishlist.populate({
      path: 'items.product',
      select: 'name images price originalPrice brand category isActive',
      populate: {
        path: 'vendor',
        select: 'username fullName vendorInfo.businessName'
      }
    });

    res.json({
      success: true,
      message: 'Wishlist item updated successfully',
      wishlist: wishlist,
      summary: wishlist.summary
    });
  } catch (error) {
    console.error('Update wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wishlist item',
      error: error.message
    });
  }
});

// Remove item from wishlist
router.delete('/remove/:itemId', auth, requireRole(['customer']), async (req, res) => {
  try {
    const { itemId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.removeItem(itemId);
    await wishlist.save();

    // Populate the wishlist for response
    await wishlist.populate({
      path: 'items.product',
      select: 'name images price originalPrice brand category isActive',
      populate: {
        path: 'vendor',
        select: 'username fullName vendorInfo.businessName'
      }
    });

    res.json({
      success: true,
      message: 'Item removed from wishlist successfully',
      wishlist: wishlist,
      summary: wishlist.summary
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from wishlist',
      error: error.message
    });
  }
});

// Like a wishlist item
router.post('/like/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { wishlistUserId } = req.body; // ID of the wishlist owner

    const wishlist = await Wishlist.findOne({ user: wishlistUserId || req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const item = wishlist.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    // Check if user already liked this item
    const existingLike = item.likes.find(like => like.user.toString() === req.user._id.toString());
    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: 'You have already liked this item'
      });
    }

    wishlist.likeItem(itemId, req.user._id);
    await wishlist.save();

    res.json({
      success: true,
      message: 'Item liked successfully',
      likesCount: item.likesCount + 1
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

// Unlike a wishlist item
router.delete('/unlike/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { wishlistUserId } = req.body; // ID of the wishlist owner

    const wishlist = await Wishlist.findOne({ user: wishlistUserId || req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const item = wishlist.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    wishlist.unlikeItem(itemId, req.user._id);
    await wishlist.save();

    res.json({
      success: true,
      message: 'Item unliked successfully',
      likesCount: item.likesCount
    });
  } catch (error) {
    console.error('Unlike wishlist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlike item',
      error: error.message
    });
  }
});

// Add comment to wishlist item
router.post('/comment/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { text, wishlistUserId } = req.body; // ID of the wishlist owner

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const wishlist = await Wishlist.findOne({ user: wishlistUserId || req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const item = wishlist.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found'
      });
    }

    wishlist.addComment(itemId, req.user._id, text.trim());
    await wishlist.save();

    // Populate the new comment
    await wishlist.populate({
      path: 'items.comments.user',
      select: 'username fullName avatar'
    });

    const updatedItem = wishlist.items.id(itemId);
    const newComment = updatedItem.comments[updatedItem.comments.length - 1];

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment,
      commentsCount: updatedItem.commentsCount
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

// Move item from wishlist to cart
router.post('/move-to-cart/:itemId', auth, requireRole(['customer']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity = 1 } = req.body;
    const Cart = require('../models/Cart');

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const item = wishlist.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    // Get or create cart (without population for adding)
    const cart = await Cart.findOrCreateForUser(req.user._id, false);

    // Add item to cart
    cart.addItem({
      product: item.product,
      quantity: parseInt(quantity),
      size: item.size,
      color: item.color,
      price: item.price,
      originalPrice: item.originalPrice,
      addedFrom: 'wishlist',
      notes: item.notes,
      vendor: item.vendor
    });

    // Remove item from wishlist
    wishlist.removeItem(itemId);

    await Promise.all([cart.save(), wishlist.save()]);

    res.json({
      success: true,
      message: 'Item moved to cart successfully'
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

module.exports = router;
