const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');



// Debug endpoint to see raw cart data
router.get('/debug', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    res.json({
      success: true,
      debug: {
        cartExists: !!cart,
        cartId: cart?._id,
        userId: req.user._id,
        username: req.user.username,
        storedTotalItems: cart?.totalItems,
        storedTotalAmount: cart?.totalAmount,
        itemsCount: cart?.items?.length || 0,
        items: cart?.items?.map(item => ({
          id: item._id,
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          originalPrice: item.originalPrice,
          calculatedTotal: item.price * item.quantity
        })) || [],
        calculatedTotalAmount: cart?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
      }
    });
  } catch (error) {
    console.error('Debug cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

// Get cart count only (lightweight endpoint)
router.get('/count', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true })
      .select('totalItems items totalAmount');

    if (!cart) {
      return res.json({
        success: true,
        count: 0,
        totalItems: 0,
        itemCount: 0,
        totalAmount: 0,
        showTotalPrice: false
      });
    }

    // Calculate accurate counts from actual items
    const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    const itemCount = cart.items.length;
    const totalAmount = cart.totalAmount || 0;

    // Debug logging
    console.log('🔍 Cart count debug for user:', req.user.username, {
      cartId: cart._id,
      storedTotalItems: cart.totalItems,
      calculatedTotalItems: totalItems,
      itemCount: itemCount,
      storedTotalAmount: cart.totalAmount,
      items: cart.items.map(item => ({
        id: item._id,
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice
      }))
    });

    // Show total price if cart has 4 or more items
    const showTotalPrice = itemCount >= 4;

    res.json({
      success: true,
      count: totalItems, // Total quantity of all items (calculated fresh)
      totalItems: totalItems,
      itemCount: itemCount, // Number of unique items
      totalAmount: totalAmount,
      showTotalPrice: showTotalPrice,
      lastUpdated: cart.lastUpdated,
      debug: {
        storedTotalItems: cart.totalItems,
        calculatedTotalItems: totalItems,
        itemsInCart: cart.items.length
      }
    });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart count',
      error: error.message
    });
  }
});

// Recalculate cart totals (fix inconsistent data)
router.post('/recalculate', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart) {
      return res.json({
        success: true,
        message: 'No cart found to recalculate'
      });
    }

    // Store old values for comparison
    const oldTotalItems = cart.totalItems;
    const oldTotalAmount = cart.totalAmount;

    // Force recalculation
    cart.calculateTotals();
    await cart.save();

    console.log('🔧 Cart recalculated for user:', req.user.username, {
      itemsCount: cart.items.length,
      oldTotalItems: oldTotalItems,
      newTotalItems: cart.totalItems,
      oldTotalAmount: oldTotalAmount,
      newTotalAmount: cart.totalAmount,
      itemDetails: cart.items.map(item => ({
        id: item._id,
        quantity: item.quantity,
        price: item.price,
        itemTotal: item.price * item.quantity
      }))
    });

    res.json({
      success: true,
      message: 'Cart totals recalculated successfully',
      data: {
        itemsCount: cart.items.length,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        changes: {
          totalItemsChanged: oldTotalItems !== cart.totalItems,
          totalAmountChanged: oldTotalAmount !== cart.totalAmount,
          oldValues: { totalItems: oldTotalItems, totalAmount: oldTotalAmount },
          newValues: { totalItems: cart.totalItems, totalAmount: cart.totalAmount }
        }
      }
    });
  } catch (error) {
    console.error('Recalculate cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate cart',
      error: error.message
    });
  }
});

// Get combined cart and wishlist total count for specific user (no auth required)
router.get('/total-count', optionalAuth, async (req, res) => {
  try {
    // If user is not authenticated, return zero counts
    if (!req.user) {
      return res.json({
        success: true,
        data: {
          cartItemCount: 0,
          cartQuantityTotal: 0,
          cartTotalAmount: 0,
          wishlistItemCount: 0,
          combinedTotal: 0
        }
      });
    }

    console.log('🔢 Getting total count for user:', req.user._id, 'Username:', req.user.username);

    // Get cart data for this specific user
    const cart = await Cart.findOne({ user: req.user._id, isActive: true })
      .select('totalItems items totalAmount');

    // Get wishlist data for this specific user
    const Wishlist = require('../models/Wishlist');
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .select('totalItems items');

    // Calculate cart data
    const cartItemCount = cart ? cart.items.length : 0;
    const cartQuantityTotal = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
    const cartTotalAmount = cart ? cart.totalAmount || 0 : 0;

    // Calculate wishlist data
    const wishlistItemCount = wishlist ? wishlist.items.length : 0;

    // Calculate TOTAL COUNT (cart items + wishlist items)
    const totalCount = cartItemCount + wishlistItemCount;

    // Show cart total price if cart has 4 or more PRODUCTS (not quantities)
    const showCartTotalPrice = cartItemCount >= 4;

    console.log('🔢 Total count calculation for user', req.user.username, ':', {
      cartItems: cartItemCount,
      wishlistItems: wishlistItemCount,
      totalCount: totalCount,
      cartTotalAmount: cartTotalAmount,
      showCartTotalPrice: showCartTotalPrice
    });

    res.json({
      success: true,
      userId: req.user._id,
      username: req.user.username,
      data: {
        cart: {
          itemCount: cartItemCount,
          quantityTotal: cartQuantityTotal,
          totalAmount: cartTotalAmount
        },
        wishlist: {
          itemCount: wishlistItemCount
        },
        totalCount: totalCount,
        showCartTotalPrice: showCartTotalPrice,
        cartTotalAmount: showCartTotalPrice ? cartTotalAmount : 0
      },
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('❌ Error getting total count for user:', req.user._id, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get total count',
      error: error.message
    });
  }
});

// Get user's cart
router.get('/', optionalAuth, async (req, res) => {
  try {
    // If user is not authenticated, return empty cart
    if (!req.user) {
      return res.json({
        success: true,
        data: {
          cart: {
            _id: null,
            user: null,
            items: [],
            totalItems: 0,
            totalAmount: 0,
            isActive: false
          }
        }
      });
    }

    console.log('🛒 Getting cart for user:', req.user._id);
    console.log('🛒 User object:', req.user);

    // First, try to find existing cart
    let cart = await Cart.findOne({ user: req.user._id, isActive: true });
    console.log('🛒 Existing cart found:', cart ? 'Yes' : 'No');

    if (!cart) {
      console.log('🛒 Creating new cart for user');
      cart = new Cart({ user: req.user._id });
      await cart.save();
      console.log('🛒 New cart created:', cart._id);
    }

    // Try to populate the cart
    try {
      cart = await Cart.findById(cart._id)
        .populate({
          path: 'items.product',
          select: 'name images price originalPrice brand category isActive sizes colors vendor',
          populate: {
            path: 'vendor',
            select: 'username fullName vendorInfo.businessName'
          }
        });
      console.log('🛒 Cart populated successfully');
    } catch (populateError) {
      console.error('❌ Populate error:', populateError);
      // Continue without population
    }

    console.log('🛒 Cart items count:', cart?.items?.length || 0);

    // Get summary safely
    let summary;
    try {
      summary = cart.summary;
      console.log('🛒 Summary generated successfully');
    } catch (summaryError) {
      console.error('❌ Summary error:', summaryError);
      summary = {
        totalItems: 0,
        totalAmount: 0,
        totalSavings: 0,
        itemCount: 0
      };
    }

    res.json({
      success: true,
      cart: cart,
      summary: summary
    });
  } catch (error) {
    console.error('❌ Get cart error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error.message
    });
  }
});

// Add item to cart
router.post('/add', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { productId, quantity = 1, size, color, addedFrom = 'manual', notes } = req.body;

    // Validate product exists and is active
    const product = await Product.findById(productId).populate('vendor');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    // Get or create cart
    const cart = await Cart.findOrCreateForUser(req.user._id);

    // Add item to cart
    cart.addItem({
      product: productId,
      quantity: parseInt(quantity),
      size: size,
      color: color,
      price: product.price,
      originalPrice: product.originalPrice,
      addedFrom: addedFrom,
      notes: notes,
      vendor: product.vendor._id
    });

    await cart.save();

    // Populate the cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name images price originalPrice brand category isActive',
      populate: {
        path: 'vendor',
        select: 'username fullName vendorInfo.businessName'
      }
    });

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      cart: cart,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error.message
    });
  }
});

// Update item quantity in cart
router.put('/update/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, size, color, notes } = req.body;

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Update item properties
    if (quantity !== undefined) {
      if (quantity <= 0) {
        cart.removeItem(itemId);
      } else {
        cart.updateItemQuantity(itemId, parseInt(quantity));
      }
    }

    if (size !== undefined) item.size = size;
    if (color !== undefined) item.color = color;
    if (notes !== undefined) item.notes = notes;

    if (item.parent()) {
      item.updatedAt = new Date();
    }

    await cart.save();

    // Populate the cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name images price originalPrice brand category isActive',
      populate: {
        path: 'vendor',
        select: 'username fullName vendorInfo.businessName'
      }
    });

    res.json({
      success: true,
      message: 'Cart updated successfully',
      cart: cart,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart',
      error: error.message
    });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.removeItem(itemId);
    await cart.save();

    // Populate the cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name images price originalPrice brand category isActive',
      populate: {
        path: 'vendor',
        select: 'username fullName vendorInfo.businessName'
      }
    });

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      cart: cart,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message
    });
  }
});

// Bulk remove items from cart
router.delete('/bulk-remove', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item IDs array is required'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Remove multiple items
    let removedCount = 0;
    itemIds.forEach(itemId => {
      const itemExists = cart.items.id(itemId);
      if (itemExists) {
        cart.removeItem(itemId);
        removedCount++;
      }
    });

    await cart.save();

    // Populate the cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name images price originalPrice brand category isActive',
      populate: {
        path: 'vendor',
        select: 'username fullName vendorInfo.businessName'
      }
    });

    res.json({
      success: true,
      message: `${removedCount} item(s) removed from cart successfully`,
      removedCount: removedCount,
      cart: cart,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Bulk remove cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove items from cart',
      error: error.message
    });
  }
});

// Clear entire cart
router.delete('/clear', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemCount = cart.items.length;
    cart.clearCart();
    await cart.save();

    res.json({
      success: true,
      message: `Cart cleared successfully. ${itemCount} item(s) removed.`,
      clearedCount: itemCount,
      cart: cart,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
});

// Get cart items grouped by vendor
router.get('/vendors', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOrCreateForUser(req.user._id)
      .populate({
        path: 'items.product',
        select: 'name images price originalPrice brand category isActive',
        populate: {
          path: 'vendor',
          select: 'username fullName vendorInfo.businessName avatar'
        }
      });

    const vendorGroups = cart.getItemsByVendor();

    res.json({
      success: true,
      vendorGroups: vendorGroups,
      summary: cart.summary
    });
  } catch (error) {
    console.error('Get cart vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart vendors',
      error: error.message
    });
  }
});

// Move item from cart to wishlist
router.post('/move-to-wishlist/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const Wishlist = require('../models/Wishlist');

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Get or create wishlist
    const wishlist = await Wishlist.findOrCreateForUser(req.user._id);

    // Add item to wishlist
    wishlist.addItem({
      product: item.product,
      size: item.size,
      color: item.color,
      price: item.price,
      originalPrice: item.originalPrice,
      addedFrom: 'cart',
      notes: item.notes,
      vendor: item.vendor
    });

    // Remove item from cart
    cart.removeItem(itemId);

    await Promise.all([cart.save(), wishlist.save()]);

    res.json({
      success: true,
      message: 'Item moved to wishlist successfully'
    });
  } catch (error) {
    console.error('Move to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move item to wishlist',
      error: error.message
    });
  }
});

module.exports = router;
