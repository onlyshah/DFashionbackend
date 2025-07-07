const express = require('express');
const Product = require('../models/Product');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/brands
// @desc    Get all brands
// @access  Public
router.get('/', async (req, res) => {
  try {
    const brands = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: '$brand', 
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }},
      { $sort: { count: -1 } }
    ]);

    const brandsWithDetails = brands.map(brand => ({
      name: brand._id,
      productCount: brand.count,
      priceRange: {
        min: brand.minPrice,
        max: brand.maxPrice,
        avg: Math.round(brand.avgPrice)
      },
      logo: `/assets/images/brands/${brand._id.toLowerCase().replace(/\s+/g, '-')}.svg`,
      isPopular: brand.count > 5
    }));

    res.json({
      success: true,
      data: brandsWithDetails
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands'
    });
  }
});

// @route   GET /api/brands/featured
// @desc    Get featured brands
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    const brands = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: '$brand', 
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        totalViews: { $sum: '$analytics.views' },
        totalLikes: { $sum: '$analytics.likes' }
      }},
      { $sort: { count: -1, totalViews: -1 } },
      { $limit: limit }
    ]);

    const featuredBrands = brands.map(brand => ({
      name: brand._id,
      productCount: brand.count,
      avgPrice: Math.round(brand.avgPrice),
      totalViews: brand.totalViews || 0,
      totalLikes: brand.totalLikes || 0,
      logo: `/assets/images/brands/${brand._id.toLowerCase().replace(/\s+/g, '-')}.svg`,
      isPopular: brand.count > 5,
      isFeatured: true
    }));

    res.json({
      success: true,
      data: featuredBrands
    });
  } catch (error) {
    console.error('Get featured brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured brands'
    });
  }
});

// @route   GET /api/brands/:name
// @desc    Get brand details
// @access  Public
router.get('/:name', async (req, res) => {
  try {
    const brandName = req.params.name;
    
    // Get brand statistics
    const brandStats = await Product.aggregate([
      { $match: { brand: brandName, isActive: true } },
      { $group: { 
        _id: '$brand',
        productCount: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        totalViews: { $sum: '$analytics.views' },
        totalLikes: { $sum: '$analytics.likes' },
        avgRating: { $avg: '$rating.average' }
      }}
    ]);

    if (!brandStats.length) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    const brand = brandStats[0];
    
    // Get categories for this brand
    const categories = await Product.aggregate([
      { $match: { brand: brandName, isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        name: brand._id,
        productCount: brand.productCount,
        priceRange: {
          min: brand.minPrice,
          max: brand.maxPrice,
          avg: Math.round(brand.avgPrice)
        },
        totalViews: brand.totalViews || 0,
        totalLikes: brand.totalLikes || 0,
        avgRating: brand.avgRating ? Math.round(brand.avgRating * 10) / 10 : 0,
        categories: categories.map(cat => ({
          name: cat._id,
          count: cat.count
        })),
        logo: `/assets/images/brands/default-brand.svg`,
        isPopular: brand.productCount > 5
      }
    });
  } catch (error) {
    console.error('Get brand details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand details'
    });
  }
});

// @route   GET /api/brands/:name/products
// @desc    Get products by brand
// @access  Public
router.get('/:name/products', async (req, res) => {
  try {
    const brandName = req.params.name;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find({ 
      brand: brandName,
      isActive: true 
    })
    .populate('vendor', 'username fullName avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit);

    const total = await Product.countDocuments({ 
      brand: brandName,
      isActive: true 
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      brand: {
        name: brandName
      }
    });
  } catch (error) {
    console.error('Get brand products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand products'
    });
  }
});

module.exports = router;
