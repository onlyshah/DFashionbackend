const express = require('express');
const Product = require('../models/Product');
const { auth, isVendor, isApprovedVendor, optionalAuth, allowResourceOwnerOrRoles } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const searchEngine = require('../services/searchEngine');
const { SearchHistory, TrendingSearch, SearchSuggestion } = require('../models/SearchHistory');

const router = express.Router();

// @route   GET /api/products/trending
// @desc    Get trending products
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    console.log('Trending endpoint called');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    console.log('Query params:', { page, limit, skip });

    // Get trending products based on isTrending flag
    const products = await Product.find({
      isTrending: true,
      isActive: true
    })
    .populate('vendor', 'username fullName avatar')
    .sort({
      'analytics.views': -1,
      'analytics.likes': -1,
      'analytics.purchases': -1,
      createdAt: -1
    })
    .skip(skip)
    .limit(limit);

    console.log(`Found ${products.length} trending products`);

    const total = await Product.countDocuments({
      isTrending: true,
      isActive: true
    });

    console.log(`Total trending products: ${total}`);

    res.json({
      success: true,
      products: products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get trending products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/products/new-arrivals
// @desc    Get new arrival products
// @access  Public
router.get('/new-arrivals', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Get products marked as new arrivals
    const products = await Product.find({
      isNewArrival: true,
      isActive: true
    })
    .populate('vendor', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Product.countDocuments({
      isNewArrival: true,
      isActive: true
    });

    res.json({
      success: true,
      products: products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get new arrivals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/products
// @desc    Get all products with filters and advanced search
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 12,
      sortBy = 'relevance',
      sortOrder = 'desc',
      ...filters
    } = req.query;

    const userId = req.user ? req.user.id : null;

    // Use advanced search engine if search query exists
    if (search && search.trim()) {
      const searchResults = await searchEngine.searchProducts(
        search,
        filters,
        { page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder, userId }
      );

      return res.json({
        success: true,
        ...searchResults
      });
    }

    // Fallback to original logic for non-search requests
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = { isActive: true };

    if (filters.category) query.category = filters.category;
    if (filters.subcategory) query.subcategory = filters.subcategory;
    if (filters.brand) query.brand = { $regex: filters.brand, $options: 'i' };
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('vendor', 'username fullName avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/search/suggestions
// @desc    Get search suggestions and autocomplete
// @access  Public
router.get('/search/suggestions', optionalAuth, async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    const userId = req.user ? req.user.id : null;

    let suggestions;

    if (userId) {
      // Get personalized suggestions for logged-in users
      suggestions = await searchEngine.getPersonalizedSuggestions(userId, parseInt(limit));
    } else {
      // Get general suggestions for anonymous users
      suggestions = await searchEngine.getSearchSuggestions(query, parseInt(limit));
    }

    res.json({
      success: true,
      suggestions,
      query: query || ''
    });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search suggestions'
    });
  }
});

// @route   GET /api/products/search/trending
// @desc    Get trending searches
// @access  Public
router.get('/search/trending', async (req, res) => {
  try {
    const { limit = 10, timeframe = '24h' } = req.query;

    const trendingSearches = await searchEngine.getTrendingSearches(
      parseInt(limit),
      timeframe
    );

    res.json({
      success: true,
      trending: trendingSearches,
      timeframe
    });
  } catch (error) {
    console.error('Get trending searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending searches'
    });
  }
});

// @route   GET /api/products/search/recent
// @desc    Get user's recent searches
// @access  Private
router.get('/search/recent', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.id;

    const recentSearches = await searchEngine.getUserRecentSearches(
      userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      searches: recentSearches
    });
  } catch (error) {
    console.error('Get recent searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent searches'
    });
  }
});

// @route   DELETE /api/products/search/recent
// @desc    Clear user's search history
// @access  Private
router.delete('/search/recent', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    await SearchHistory.findOneAndUpdate(
      { user: userId },
      { $set: { searches: [] } }
    );

    res.json({
      success: true,
      message: 'Search history cleared successfully'
    });
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear search history'
    });
  }
});

// @route   POST /api/products/search/track
// @desc    Track search interaction (click, purchase, etc.)
// @access  Private
router.post('/search/track', auth, async (req, res) => {
  try {
    const { searchQuery, productId, action, position } = req.body;
    const userId = req.user.id;

    // Find the user's search history
    const searchHistory = await SearchHistory.findOne({ user: userId });

    if (searchHistory) {
      // Find the recent search entry
      const recentSearch = searchHistory.searches.find(
        search => search.query === searchQuery &&
        Date.now() - search.timestamp.getTime() < 3600000 // Within last hour
      );

      if (recentSearch) {
        // Track the interaction
        if (action === 'click') {
          recentSearch.results.clicked.push({
            productId,
            position: position || 0,
            clickedAt: new Date()
          });
        } else if (action === 'purchase') {
          recentSearch.results.purchased.push({
            productId,
            purchasedAt: new Date()
          });
        }

        await searchHistory.save();
      }
    }

    res.json({
      success: true,
      message: 'Search interaction tracked successfully'
    });
  } catch (error) {
    console.error('Track search interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track search interaction'
    });
  }
});





// @route   GET /api/products/categories
// @desc    Get all product categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    const subcategories = await Product.distinct('subcategory');
    const brands = await Product.distinct('brand');

    // Get category counts
    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const subcategoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { category: '$category', subcategory: '$subcategory' }, count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map(cat => ({
          name: cat,
          count: categoryStats.find(stat => stat._id === cat)?.count || 0
        })),
        subcategories: subcategoryStats.map(stat => ({
          category: stat._id.category,
          name: stat._id.subcategory,
          count: stat.count
        })),
        brands: brands.sort()
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// @route   GET /api/products/filters
// @desc    Get filter options for products
// @access  Public
router.get('/filters', async (req, res) => {
  try {
    const { category } = req.query;

    let matchStage = { isActive: true };
    if (category) {
      matchStage.category = category;
    }

    const [priceRange, sizes, colors, brands] = await Promise.all([
      // Price range
      Product.aggregate([
        { $match: matchStage },
        { $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }}
      ]),

      // Available sizes
      Product.aggregate([
        { $match: matchStage },
        { $unwind: '$sizes' },
        { $group: { _id: '$sizes.size', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      // Available colors
      Product.aggregate([
        { $match: matchStage },
        { $unwind: '$colors' },
        { $group: { _id: '$colors.name', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      // Brands
      Product.aggregate([
        { $match: matchStage },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 10000 },
        sizes: sizes.map(s => ({ name: s._id, count: s.count })),
        colors: colors.map(c => ({ name: c._id, count: c.count })),
        brands: brands.map(b => ({ name: b._id, count: b.count }))
      }
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filters'
    });
  }
});

// @route   GET /api/products/category/:slug
// @desc    Get products by category slug
// @access  Public
router.get('/category/:slug', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find({
      category: req.params.slug,
      isActive: true
    })
    .populate('vendor', 'username fullName avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit);

    const total = await Product.countDocuments({
      category: req.params.slug,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category products'
    });
  }
});

// @route   GET /api/products/featured-brands
// @desc    Get featured brands with their top products
// @access  Public
router.get('/featured-brands', optionalAuth, async (req, res) => {
  try {
    console.log('Featured brands endpoint called');

    // Get all active products first
    const products = await Product.find({
      isActive: true
    }).select('brand name price discountPrice images analytics stock').limit(100);

    console.log(`Found ${products.length} products`);

    if (products.length === 0) {
      return res.json({
        success: true,
        brands: []
      });
    }

    // Group products by brand manually
    const brandMap = new Map();

    products.forEach(product => {
      const brand = product.brand;
      if (!brandMap.has(brand)) {
        brandMap.set(brand, {
          brand: brand,
          productCount: 0,
          totalViews: 0,
          totalLikes: 0,
          avgPrice: 0,
          products: []
        });
      }

      const brandData = brandMap.get(brand);
      brandData.productCount++;
      brandData.totalViews += (product.analytics?.views || 0);
      brandData.totalLikes += (product.analytics?.likes || 0);
      brandData.products.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        images: product.images,
        analytics: product.analytics
      });
    });

    // Convert to array and calculate averages
    const featuredBrands = Array.from(brandMap.values()).map(brand => {
      brand.avgPrice = brand.products.reduce((sum, p) => sum + p.price, 0) / brand.productCount;
      brand.products = brand.products.slice(0, 6); // Top 6 products per brand
      return brand;
    });

    // Sort by popularity
    featuredBrands.sort((a, b) => {
      if (b.totalViews !== a.totalViews) return b.totalViews - a.totalViews;
      if (b.totalLikes !== a.totalLikes) return b.totalLikes - a.totalLikes;
      return b.productCount - a.productCount;
    });

    // Limit to top 10 brands
    const topBrands = featuredBrands.slice(0, 10);

    console.log(`Returning ${topBrands.length} featured brands`);

    res.json({
      success: true,
      brands: topBrands
    });
  } catch (error) {
    console.error('Get featured brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'username fullName avatar socialStats')
      .populate('reviews.user', 'username fullName avatar');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment view count
    await Product.findByIdAndUpdate(req.params.id, {
      $inc: { 'analytics.views': 1 }
    });

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/products
// @desc    Create product
// @access  Private (Vendor only)
router.post('/', [
  auth,
  isVendor,
  isApprovedVendor,
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').isIn(['men', 'women', 'children']).withMessage('Invalid category'),
  body('subcategory').notEmpty().withMessage('Subcategory is required'),
  body('brand').notEmpty().withMessage('Brand is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productData = {
      ...req.body,
      vendor: req.user._id
    };

    const product = new Product(productData);
    await product.save();

    await product.populate('vendor', 'username fullName avatar');

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Vendor only - own products)
router.put('/:id', [
  auth,
  allowResourceOwnerOrRoles('Product', 'id', 'vendor', ['admin', 'super_admin']),
  isApprovedVendor
], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('vendor', 'username fullName avatar');

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Vendor only - own products)
router.delete('/:id', [auth, allowResourceOwnerOrRoles('Product', 'id', 'vendor', ['admin', 'super_admin']), isApprovedVendor], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});






// @route   POST /api/products/:id/review
// @desc    Add product review
// @access  Private
router.post('/:id/review', [
  auth,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment, images } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Add review
    product.reviews.push({
      user: req.user._id,
      rating,
      comment,
      images: images || []
    });

    // Update rating
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.rating.average = totalRating / product.reviews.length;
    product.rating.count = product.reviews.length;

    await product.save();

    res.json({ message: 'Review added successfully' });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// @route   GET /api/products/suggested
// @desc    Get suggested products for user
// @access  Public
router.get('/suggested', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const products = await Product.find({
      isSuggested: true,
      isActive: true
    })
    .populate('vendor', 'username fullName avatar')
    .sort({ 'rating.average': -1, 'analytics.views': -1 })
    .skip(skip)
    .limit(limit);

    const total = await Product.countDocuments({
      isSuggested: true,
      isActive: true
    });

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get suggested products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});





module.exports = router;
