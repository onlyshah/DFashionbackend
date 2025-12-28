const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const UserBehavior = require('../models/UserBehavior');
const recommendationEngine = require('../services/recommendationEngine');

// If running with Postgres (Sequelize) use SQL models as a fallback when Mongo is not available
let sequelizeMode = false;
let SQLModels = null;
try {
  if (process.env.DB_TYPE === 'postgres') {
    SQLModels = require('../models_sql');
    if (SQLModels && SQLModels.Product && typeof SQLModels.Product.findAll === 'function') {
      sequelizeMode = true;
      console.log('[recommendations] Running in Sequelize mode (Postgres fallback)');
    }
  }
} catch (err) {
  // ignore - fallback to Mongoose
}
const { auth } = require('../middleware/auth');

// Get trending products
router.get('/trending', async (req, res) => {
  try {
    const { category, limit = 10 } = req.query;
    // If using Sequelize (Postgres) return products from SQL models
    if (sequelizeMode && SQLModels && SQLModels.Product) {
      const where = { };
      if (category) {
        // SQL model uses categoryId - try to resolve by name if Category model exists
        // Fallback: ignore category filter
      }

      const products = await SQLModels.Product.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        raw: true
      });

      const trendingProducts = products.map(product => ({
        _id: product.id,
        title: product.title || product.name || 'Untitled',
        description: product.description || '',
        price: product.price,
        brand: product.brandId || null,
        category: product.categoryId || null,
        isActive: true,
        trendingScore: Math.random() * 0.5 + 0.5,
        trendingReason: 'Popular this week',
        viewCount: Math.floor(Math.random() * 1000) + 100,
        purchaseCount: Math.floor(Math.random() * 50) + 10,
        shareCount: Math.floor(Math.random() * 200) + 20,
        engagementRate: (Math.random() * 5 + 3).toFixed(1)
      }));

      return res.json({ success: true, data: trendingProducts });
    }

    // Default Mongoose flow
    let query = { isActive: true };
    if (category) {
      query.category = category;
    }

    // Get products sorted by popularity (you can adjust this logic)
    const products = await Product.find(query)
      .sort({ 
        'analytics.views': -1, 
        'analytics.purchases': -1,
        createdAt: -1 
      })
      .limit(parseInt(limit))
      .populate('vendor', 'businessName')
      .lean();

    // Add trending metadata
    const trendingProducts = products.map(product => ({
      ...product,
      trendingScore: Math.random() * 0.5 + 0.5, // Random score between 0.5-1
      trendingReason: 'Popular this week',
      viewCount: product.analytics?.views || Math.floor(Math.random() * 1000) + 100,
      purchaseCount: product.analytics?.purchases || Math.floor(Math.random() * 50) + 10,
      shareCount: Math.floor(Math.random() * 200) + 20,
      engagementRate: (Math.random() * 5 + 3).toFixed(1)
    }));

    res.json({
      success: true,
      data: trendingProducts
    });

  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending products',
      error: error.message
    });
  }
});

// Get suggested products (personalized recommendations)
router.get('/suggested', async (req, res) => {
  try {
    const { userId, limit = 10, category } = req.query;

    if (!userId) {
      // Return trending products for anonymous users
      const trendingProducts = await recommendationEngine.getTrendingProducts({
        limit: parseInt(limit),
        category
      });

      return res.json({
        success: true,
        data: trendingProducts,
        message: 'Trending products (no user specified)'
      });
    }

    // Get personalized recommendations
    const recommendations = await recommendationEngine.getPersonalizedRecommendations(
      userId,
      {
        limit: parseInt(limit),
        category,
        excludeViewed: true,
        includeReasons: true
      }
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Personalized recommendations generated'
    });

  } catch (error) {
    console.error('Error fetching suggested products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggested products',
      error: error.message
    });
  }
});

// Get similar products
router.get('/similar/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 6 } = req.query;

    // Get the original product to find similar ones
    const originalProduct = await Product.findById(productId);
    if (!originalProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find similar products based on category and subcategory
    const similarProducts = await Product.find({
      _id: { $ne: productId }, // Exclude the original product
      isActive: true,
      $or: [
        { category: originalProduct.category },
        { subcategory: originalProduct.subcategory },
        { brand: originalProduct.brand }
      ]
    })
    .sort({ 'rating.average': -1 })
    .limit(parseInt(limit))
    .populate('vendor', 'businessName')
    .lean();

    // Add recommendation metadata
    const recommendedProducts = similarProducts.map(product => ({
      ...product,
      recommendationScore: Math.random() * 0.3 + 0.6, // Random score between 0.6-0.9
      recommendationReason: 'Similar to your viewed item'
    }));

    res.json({
      success: true,
      data: recommendedProducts
    });

  } catch (error) {
    console.error('Error fetching similar products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch similar products',
      error: error.message
    });
  }
});

// Get recently viewed products
router.get('/recent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 8 } = req.query;

    // In a real app, you'd track user view history
    // For now, return random recent products
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('vendor', 'businessName')
      .lean();

    // Add recommendation metadata
    const recentProducts = products.map(product => ({
      ...product,
      recommendationScore: Math.random() * 0.2 + 0.5, // Random score between 0.5-0.7
      recommendationReason: 'Recently viewed'
    }));

    res.json({
      success: true,
      data: recentProducts
    });

  } catch (error) {
    console.error('Error fetching recent products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent products',
      error: error.message
    });
  }
});

// Get category-based recommendations
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 8 } = req.query;

    const products = await Product.find({ 
      category: category,
      isActive: true 
    })
    .sort({ 
      'rating.average': -1,
      'analytics.views': -1 
    })
    .limit(parseInt(limit))
    .populate('vendor', 'businessName')
    .lean();

    // Add recommendation metadata
    const categoryProducts = products.map(product => ({
      ...product,
      recommendationScore: Math.random() * 0.3 + 0.6, // Random score between 0.6-0.9
      recommendationReason: `Popular in ${category}`
    }));

    res.json({
      success: true,
      data: categoryProducts
    });

  } catch (error) {
    console.error('Error fetching category recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category recommendations',
      error: error.message
    });
  }
});

// Track user behavior for analytics
router.post('/track-view', auth, async (req, res) => {
  try {
    const { productId, category, duration = 0, source = 'unknown' } = req.body;
    const userId = req.user._id;

    // Update product view count
    await Product.findByIdAndUpdate(productId, {
      $inc: { 'analytics.views': 1 }
    });

    // Track user behavior
    let userBehavior = await UserBehavior.findOne({ user: userId });
    if (!userBehavior) {
      userBehavior = new UserBehavior({ user: userId, interactions: [] });
    }

    // Get product details for metadata
    const product = await Product.findById(productId);

    const interaction = {
      type: 'product_view',
      targetId: productId,
      targetType: 'product',
      metadata: {
        category: product?.category || category,
        subcategory: product?.subcategory,
        brand: product?.brand,
        price: product?.price,
        duration,
        source,
        timestamp: new Date()
      }
    };

    await userBehavior.addInteraction(interaction);

    res.json({
      success: true,
      message: 'View tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view',
      error: error.message
    });
  }
});

router.post('/track-search', async (req, res) => {
  try {
    const { query, category, resultsClicked } = req.body;
    
    // In a real app, you'd save search analytics
    console.log('Search tracked:', { query, category, resultsClicked });

    res.json({
      success: true,
      message: 'Search tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track search',
      error: error.message
    });
  }
});

router.post('/track-purchase', async (req, res) => {
  try {
    const { productId, category, price } = req.body;
    
    // Update product purchase count
    await Product.findByIdAndUpdate(productId, {
      $inc: { 'analytics.purchases': 1 }
    });

    res.json({
      success: true,
      message: 'Purchase tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track purchase',
      error: error.message
    });
  }
});

// Get user analytics
router.get('/analytics/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real app, you'd fetch user analytics from database
    // For now, return mock data
    const userAnalytics = {
      userId,
      viewHistory: [],
      searchHistory: [],
      purchaseHistory: [],
      wishlistItems: [],
      cartItems: [],
      preferredCategories: ['women', 'men', 'accessories'],
      priceRange: { min: 500, max: 5000 },
      brandPreferences: []
    };

    res.json({
      success: true,
      data: userAnalytics
    });

  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics',
      error: error.message
    });
  }
});

// Track user interaction (like, share, cart add, etc.)
router.post('/track-interaction', auth, async (req, res) => {
  try {
    const {
      type,
      targetId,
      targetType,
      metadata = {}
    } = req.body;
    const userId = req.user._id;

    // Validate interaction type
    const validTypes = [
      'product_view', 'product_like', 'product_share', 'product_purchase',
      'post_view', 'post_like', 'post_share', 'post_comment',
      'story_view', 'story_like', 'story_share',
      'search', 'category_browse', 'filter_apply',
      'cart_add', 'cart_remove', 'wishlist_add', 'wishlist_remove',
      'vendor_follow', 'vendor_unfollow', 'user_follow', 'user_unfollow'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interaction type'
      });
    }

    // Get or create user behavior
    let userBehavior = await UserBehavior.findOne({ user: userId });
    if (!userBehavior) {
      userBehavior = new UserBehavior({ user: userId, interactions: [] });
    }

    // Create interaction
    const interaction = {
      type,
      targetId,
      targetType,
      metadata: {
        ...metadata,
        timestamp: new Date(),
        sessionId: req.sessionID || 'unknown'
      }
    };

    await userBehavior.addInteraction(interaction);

    // Update product analytics if applicable
    if (targetType === 'product') {
      const updateField = {};
      if (type === 'product_like') updateField['analytics.likes'] = 1;
      if (type === 'product_share') updateField['analytics.shares'] = 1;
      if (type === 'product_purchase') updateField['analytics.purchases'] = 1;

      if (Object.keys(updateField).length > 0) {
        await Product.findByIdAndUpdate(targetId, { $inc: updateField });
      }
    }

    res.json({
      success: true,
      message: 'Interaction tracked successfully',
      userSegment: userBehavior.calculateUserSegment(),
      engagementLevel: userBehavior.calculateEngagementLevel()
    });

  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track interaction',
      error: error.message
    });
  }
});

// Get user behavior analytics
router.get('/user-analytics/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user can access this data (own data or admin)
    if (req.user._id.toString() !== userId && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userBehavior = await UserBehavior.findOne({ user: userId });

    if (!userBehavior) {
      return res.json({
        success: true,
        data: {
          userId,
          totalInteractions: 0,
          preferences: {},
          patterns: {},
          analytics: {
            userSegment: 'new',
            engagementLevel: 'low'
          }
        }
      });
    }

    // Calculate recent activity
    const recentInteractions = userBehavior.interactions.filter(interaction => {
      const daysDiff = (new Date() - interaction.timestamp) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    const analytics = {
      userId,
      totalInteractions: userBehavior.analytics.totalInteractions,
      recentInteractions: recentInteractions.length,
      preferences: userBehavior.preferences,
      patterns: userBehavior.patterns,
      socialBehavior: userBehavior.socialBehavior,
      analytics: {
        userSegment: userBehavior.calculateUserSegment(),
        engagementLevel: userBehavior.calculateEngagementLevel(),
        lastActivity: userBehavior.analytics.lastActivity
      },
      topCategories: userBehavior.preferences.categories
        ?.sort((a, b) => b.score - a.score)
        .slice(0, 5) || [],
      topBrands: userBehavior.preferences.brands
        ?.sort((a, b) => b.score - a.score)
        .slice(0, 5) || []
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics',
      error: error.message
    });
  }
});

// Get recommendation insights
router.get('/insights/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user._id.toString() !== userId && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userBehavior = await UserBehavior.findOne({ user: userId });

    if (!userBehavior) {
      return res.json({
        success: true,
        data: {
          message: 'Start browsing to get personalized insights!',
          recommendations: []
        }
      });
    }

    // Generate insights
    const insights = {
      personalityProfile: {
        segment: userBehavior.calculateUserSegment(),
        engagementLevel: userBehavior.calculateEngagementLevel(),
        shoppingStyle: this.determineShoppingStyle(userBehavior),
        preferredTime: this.getPreferredShoppingTime(userBehavior)
      },
      preferences: {
        topCategories: userBehavior.preferences.categories
          ?.sort((a, b) => b.score - a.score)
          .slice(0, 3) || [],
        topBrands: userBehavior.preferences.brands
          ?.sort((a, b) => b.score - a.score)
          .slice(0, 3) || [],
        priceRange: this.getPreferredPriceRange(userBehavior)
      },
      recommendations: await recommendationEngine.getPersonalizedRecommendations(
        userId,
        { limit: 5, includeReasons: true }
      )
    };

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: error.message
    });
  }
});

module.exports = router;
