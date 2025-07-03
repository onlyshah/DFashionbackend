const express = require('express');
const router = express.Router();
const { auth, isVendor, requireRole } = require('../middleware/auth');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');

// @route   GET /api/vendor/dashboard/stats
// @desc    Get vendor dashboard statistics
// @access  Private (Vendor only)
router.get('/dashboard/stats', auth, requireRole(['vendor', 'super_admin']), async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Get total products count
    const totalProducts = await Product.countDocuments({ 
      vendor: vendorId,
      isActive: true 
    });

    // Get total orders count for vendor's products
    const totalOrders = await Order.countDocuments({
      'items.product': { 
        $in: await Product.find({ vendor: vendorId }).distinct('_id') 
      }
    });

    // Calculate total revenue from completed orders
    const revenueAggregation = await Order.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $match: {
          'productDetails.vendor': vendorId,
          status: 'delivered',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

    // Get pending orders count
    const pendingOrders = await Order.countDocuments({
      'items.product': { 
        $in: await Product.find({ vendor: vendorId }).distinct('_id') 
      },
      status: { $in: ['pending', 'confirmed', 'processing'] }
    });

    // Get low stock products count
    const lowStockProducts = await Product.countDocuments({
      vendor: vendorId,
      isActive: true,
      $or: [
        { stock: { $lte: 5 } },
        { 'sizes.stock': { $lte: 5 } }
      ]
    });

    // Get recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrdersCount = await Order.countDocuments({
      'items.product': { 
        $in: await Product.find({ vendor: vendorId }).distinct('_id') 
      },
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $match: {
          'productDetails.vendor': vendorId,
          status: 'delivered',
          paymentStatus: 'paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          totalOrders,
          totalRevenue,
          pendingOrders,
          lowStockProducts,
          recentOrdersCount
        },
        monthlyRevenue
      }
    });

  } catch (error) {
    console.error('Vendor dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor dashboard statistics'
    });
  }
});

// @route   GET /api/vendor/products
// @desc    Get vendor's products with pagination and filters
// @access  Private (Vendor only)
router.get('/products', auth, requireRole(['vendor', 'super_admin']), async (req, res) => {
  try {
    const vendorId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = { vendor: vendorId };
    
    if (req.query.status) {
      filter.isActive = req.query.status === 'active';
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortBy = { createdAt: -1 };
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case 'name':
          sortBy = { name: req.query.sortOrder === 'desc' ? -1 : 1 };
          break;
        case 'price':
          sortBy = { price: req.query.sortOrder === 'desc' ? -1 : 1 };
          break;
        case 'stock':
          sortBy = { stock: req.query.sortOrder === 'desc' ? -1 : 1 };
          break;
        case 'rating':
          sortBy = { 'rating.average': req.query.sortOrder === 'desc' ? -1 : 1 };
          break;
      }
    }

    const products = await Product.find(filter)
      .select('name description price originalPrice images category stock sizes isActive rating.average rating.count createdAt')
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalProducts,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Vendor products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor products'
    });
  }
});

// @route   GET /api/vendor/orders
// @desc    Get orders for vendor's products
// @access  Private (Vendor only)
router.get('/orders', auth, requireRole(['vendor', 'super_admin']), async (req, res) => {
  try {
    const vendorId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get vendor's product IDs
    const vendorProductIds = await Product.find({ vendor: vendorId }).distinct('_id');

    // Build filter query
    const filter = {
      'items.product': { $in: vendorProductIds }
    };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Sort options
    let sortBy = { createdAt: -1 };
    if (req.query.sortBy === 'amount') {
      sortBy = { totalAmount: req.query.sortOrder === 'desc' ? -1 : 1 };
    }

    const orders = await Order.find(filter)
      .populate('customer', 'fullName email phone')
      .populate({
        path: 'items.product',
        select: 'name images price vendor',
        match: { vendor: vendorId }
      })
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    // Filter out orders that don't have vendor's products after population
    const filteredOrders = orders.filter(order => 
      order.items.some(item => item.product && item.product.vendor.toString() === vendorId.toString())
    );

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      success: true,
      data: {
        orders: filteredOrders,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalOrders,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Vendor orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor orders'
    });
  }
});

// @route   PUT /api/vendor/orders/:orderId/status
// @desc    Update order status for vendor's products
// @access  Private (Vendor only)
router.put('/orders/:orderId/status', auth, requireRole(['vendor', 'super_admin']), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const vendorId = req.user._id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Check if order contains vendor's products
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const hasVendorProducts = order.items.some(item => 
      item.product && item.product.vendor.toString() === vendorId.toString()
    );

    if (!hasVendorProducts) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Order does not contain your products.'
      });
    }

    // Update order status
    order.status = status;
    order.updatedAt = new Date();

    // Add status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: vendorId
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          updatedAt: order.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

module.exports = router;
