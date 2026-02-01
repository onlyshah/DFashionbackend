/**
 * Search Controller
 * Handles all search operations, suggestions, analytics, and smart search features
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models')();
const { Product, SearchHistory, TrendingSearch } = models;
const searchEngine = require('../services/utils/searchEngine');

// ==================== BASIC SEARCH ====================

/**
 * Advanced product search with filters and analytics
 */
exports.searchProducts = async (req, res) => {
  try {
    const {
      q: query,
      page = 1,
      limit = 12,
      sortBy = 'relevance',
      sortOrder = 'desc',
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      rating,
      inStock,
      onSale,
      colors,
      sizes,
      tags
    } = req.query;

    const userId = req.user ? req.user.id : null;

    // Prepare filters
    const filters = {
      category,
      subcategory,
      brand,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rating: rating ? parseFloat(rating) : undefined,
      inStock: inStock === 'true',
      onSale: onSale === 'true',
      colors: colors ? colors.split(',') : undefined,
      sizes: sizes ? sizes.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      userId
    };

    const searchResults = await searchEngine.searchProducts(query, filters, options);

    res.json({
      success: true,
      ...searchResults
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== SUGGESTIONS ====================

/**
 * Get search suggestions and autocomplete
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q: query, limit = 10, type = 'all' } = req.query;
    const userId = req.user ? req.user.id : null;

    let suggestions = [];

    if (type === 'all' || type === 'autocomplete') {
      const autocompleteSuggestions = await searchEngine.getSearchSuggestions(query, parseInt(limit));
      suggestions.push(...autocompleteSuggestions);
    }

    if (type === 'all' || type === 'personalized') {
      if (userId) {
        const personalizedSuggestions = await searchEngine.getPersonalizedSuggestions(userId, 5);
        suggestions.push(...personalizedSuggestions);
      }
    }

    if (type === 'all' || type === 'trending') {
      const trendingSuggestions = await searchEngine.getTrendingSearches(5);
      suggestions.push(...trendingSuggestions.map(t => ({
        text: t.query,
        type: 'trending',
        popularity: t.searches
      })));
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text === suggestion.text)
      )
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      suggestions: uniqueSuggestions,
      query: query || ''
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search suggestions'
    });
  }
};

/**
 * Get smart AI-powered search suggestions
 */
exports.getSmartSuggestions = async (req, res) => {
  try {
    const { q: query, context } = req.query;
    const userId = req.user?.id;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    // Get basic suggestions
    const basicSuggestions = await searchEngine.getSearchSuggestions(query, 5);

    // Enhance with user context if available
    let smartSuggestions = basicSuggestions;

    if (userId) {
      // Get user's search history for personalization
      const userHistory = await SearchHistory.findOne({ user: userId });

      if (userHistory) {
        // Add personalized suggestions based on user's search patterns
        const personalizedSuggestions = userHistory.searches
          .filter(search => search.query.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3)
          .map(search => ({
            text: search.query,
            type: 'personal',
            popularity: search.results.count || 0
          }));

        smartSuggestions = [...personalizedSuggestions, ...basicSuggestions]
          .slice(0, 10);
      }
    }

    res.json({
      success: true,
      suggestions: smartSuggestions
    });

  } catch (error) {
    console.error('Smart suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get smart suggestions'
    });
  }
};

// ==================== TRENDING ====================

/**
 * Get trending searches
 */
exports.getTrendingSearches = async (req, res) => {
  try {
    const { limit = 10, timeframe = '24h' } = req.query;
    
    const trendingSearches = await searchEngine.getTrendingSearches(
      parseInt(limit), 
      timeframe
    );

    res.json({
      success: true,
      trending: trendingSearches,
      timeframe,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get trending searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending searches'
    });
  }
};

// ==================== HISTORY ====================

/**
 * Get user's search history
 */
exports.getSearchHistory = async (req, res) => {
  try {
    const { limit = 20, type = 'recent' } = req.query;
    const userId = req.user.id;
    
    const searchHistory = await SearchHistory.findOne({ user: userId });
    
    if (!searchHistory) {
      return res.json({
        success: true,
        searches: [],
        analytics: {
          totalSearches: 0,
          uniqueQueries: 0
        }
      });
    }

    let searches = [];
    
    if (type === 'recent') {
      searches = searchHistory.searches
        .slice(0, parseInt(limit))
        .map(search => ({
          query: search.query,
          timestamp: search.timestamp,
          resultsCount: search.results.count,
          filters: search.filters
        }));
    } else if (type === 'popular') {
      searches = searchHistory.popularQueries
        .slice(0, parseInt(limit))
        .map(pq => ({
          query: pq.query,
          count: pq.count,
          lastSearched: pq.lastSearched,
          avgResultsCount: pq.avgResultsCount
        }));
    }

    res.json({
      success: true,
      searches,
      analytics: searchHistory.analytics,
      preferences: searchHistory.preferences
    });

  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search history'
    });
  }
};

/**
 * Clear user's search history
 */
exports.clearSearchHistory = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const userId = req.user.id;
    
    const updateQuery = {};
    
    if (type === 'all') {
      updateQuery.$set = { 
        searches: [],
        popularQueries: [],
        'analytics.totalSearches': 0,
        'analytics.uniqueQueries': 0
      };
    } else if (type === 'recent') {
      updateQuery.$set = { searches: [] };
    } else if (type === 'popular') {
      updateQuery.$set = { popularQueries: [] };
    }
    
    await SearchHistory.findOneAndUpdate(
      { user: userId },
      updateQuery,
      { upsert: true }
    );

    res.json({
      success: true,
      message: `Search history (${type}) cleared successfully`
    });

  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear search history'
    });
  }
};

// ==================== TRACKING ====================

/**
 * Track search interactions and analytics
 */
exports.trackSearchInteraction = async (req, res) => {
  try {
    const { 
      searchQuery, 
      productId, 
      action, 
      position,
      metadata = {}
    } = req.body;
    const userId = req.user.id;
    
    if (!searchQuery || !action) {
      return res.status(400).json({
        success: false,
        message: 'Search query and action are required'
      });
    }
    
    // Find the user's search history
    let searchHistory = await SearchHistory.findOne({ user: userId });
    
    if (!searchHistory) {
      searchHistory = new SearchHistory({ user: userId });
    }
    
    // Find the recent search entry (within last hour)
    const recentSearch = searchHistory.searches.find(
      search => search.query === searchQuery && 
      Date.now() - search.timestamp.getTime() < 3600000
    );
    
    if (recentSearch) {
      // Track the interaction
      switch (action) {
        case 'click':
          recentSearch.results.clicked.push({
            productId,
            position: position || 0,
            clickedAt: new Date()
          });
          break;
          
        case 'purchase':
          recentSearch.results.purchased.push({
            productId,
            purchasedAt: new Date()
          });
          break;
          
        case 'view_duration':
          recentSearch.metadata.duration = metadata.duration || 0;
          break;
          
        case 'filter_change':
          recentSearch.metadata.refinements = (recentSearch.metadata.refinements || 0) + 1;
          break;
      }
      
      await searchHistory.save();
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
};

// ==================== ANALYTICS ====================

/**
 * Get search analytics for admin/vendor dashboard
 */
exports.getSearchAnalytics = async (req, res) => {
  try {
    const { timeframe = '7d', limit = 50 } = req.query;
    
    // Calculate date range
    const now = new Date();
    const timeframeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const startDate = new Date(now.getTime() - timeframeMs[timeframe]);
    
    // Get trending searches
    const trendingSearches = await TrendingSearch.find({
      lastUpdated: { $gte: startDate }
    })
    .sort({ 'metrics.trendingScore': -1 })
    .limit(parseInt(limit))
    .select('query metrics');
    
    // Get search volume statistics
    const searchStats = await SearchHistory.aggregate([
      {
        $match: {
          'searches.timestamp': { $gte: startDate }
        }
      },
      {
        $unwind: '$searches'
      },
      {
        $match: {
          'searches.timestamp': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          uniqueQueries: { $addToSet: '$searches.query' },
          avgResultsCount: { $avg: '$searches.results.count' },
          totalClicks: { $sum: { $size: '$searches.results.clicked' } },
          totalPurchases: { $sum: { $size: '$searches.results.purchased' } }
        }
      },
      {
        $project: {
          totalSearches: 1,
          uniqueQueries: { $size: '$uniqueQueries' },
          avgResultsCount: { $round: ['$avgResultsCount', 2] },
          totalClicks: 1,
          totalPurchases: 1,
          clickThroughRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalClicks', '$totalSearches'] }, 100] },
              2
            ]
          },
          conversionRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalPurchases', '$totalSearches'] }, 100] },
              2
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        timeframe,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        overview: searchStats[0] || {
          totalSearches: 0,
          uniqueQueries: 0,
          avgResultsCount: 0,
          totalClicks: 0,
          totalPurchases: 0,
          clickThroughRate: 0,
          conversionRate: 0
        },
        trendingSearches: trendingSearches.map(ts => ({
          query: ts.query,
          searches: ts.metrics.totalSearches,
          trendingScore: ts.metrics.trendingScore,
          growth: ts.metrics.searchesLast24h
        }))
      }
    });

  } catch (error) {
    console.error('Get search analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search analytics'
    });
  }
};

/**
 * Get user search insights
 */
exports.getUserSearchInsights = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's search history
    const userHistory = await SearchHistory.findOne({ user: userId });

    if (!userHistory) {
      return res.json({
        success: true,
        insights: {
          totalSearches: 0,
          uniqueQueries: 0,
          topCategories: [],
          topBrands: [],
          searchTrends: [],
          clickThroughRate: 0,
          conversionRate: 0,
          averageSearchTime: 0,
          popularFilters: [],
          searchPatterns: {
            peakHours: [],
            weeklyPattern: []
          }
        }
      });
    }

    // Analyze search patterns
    const insights = {
      totalSearches: userHistory.analytics.totalSearches,
      uniqueQueries: userHistory.analytics.uniqueQueries,
      clickThroughRate: userHistory.analytics.clickThroughRate,
      conversionRate: userHistory.analytics.conversionRate,
      averageSearchTime: 2.5, // Mock data
      topCategories: [],
      topBrands: [],
      searchTrends: [],
      popularFilters: [],
      searchPatterns: {
        peakHours: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          searches: Math.floor(Math.random() * 50)
        })),
        weeklyPattern: [
          { day: 'Mon', searches: Math.floor(Math.random() * 100) },
          { day: 'Tue', searches: Math.floor(Math.random() * 100) },
          { day: 'Wed', searches: Math.floor(Math.random() * 100) },
          { day: 'Thu', searches: Math.floor(Math.random() * 100) },
          { day: 'Fri', searches: Math.floor(Math.random() * 100) },
          { day: 'Sat', searches: Math.floor(Math.random() * 100) },
          { day: 'Sun', searches: Math.floor(Math.random() * 100) }
        ]
      }
    };

    // Analyze categories and brands from search history
    const categoryCount = {};
    const brandCount = {};
    const filterCount = {};

    userHistory.searches.forEach(search => {
      if (search.filters.category) {
        categoryCount[search.filters.category] =
          (categoryCount[search.filters.category] || 0) + 1;
      }
      if (search.filters.brand) {
        brandCount[search.filters.brand] =
          (brandCount[search.filters.brand] || 0) + 1;
      }

      // Count filter usage
      Object.keys(search.filters).forEach(filter => {
        if (search.filters[filter]) {
          filterCount[filter] = (filterCount[filter] || 0) + 1;
        }
      });
    });

    // Convert to arrays and calculate percentages
    const totalSearches = userHistory.analytics.totalSearches || 1;

    insights.topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalSearches) * 100
      }));

    insights.topBrands = Object.entries(brandCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalSearches) * 100
      }));

    insights.popularFilters = Object.entries(filterCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([filter, count]) => ({
        filter,
        usage: Math.round((count / totalSearches) * 100)
      }));

    // Mock trending data
    insights.searchTrends = [
      { query: 'summer collection', searches: 45, growth: 0.25 },
      { query: 'wireless headphones', searches: 38, growth: 0.15 },
      { query: 'running shoes', searches: 32, growth: -0.05 },
      { query: 'casual wear', searches: 28, growth: 0.10 }
    ];

    res.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('Search insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search insights'
    });
  }
};

// ==================== SPECIALIZED SEARCH ====================

/**
 * Visual search using image upload (mock implementation)
 */
exports.visualSearch = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // For now, return mock results since we don't have actual image recognition
    // In a real implementation, you would use services like Google Vision API,
    // Amazon Rekognition, or a custom ML model

    const mockResults = await Product.find({ isActive: true })
      .populate('vendor', 'username fullName avatar')
      .limit(12)
      .lean();

    res.json({
      success: true,
      products: mockResults,
      pagination: {
        current: 1,
        pages: 1,
        total: mockResults.length,
        hasNext: false,
        hasPrev: false
      },
      searchMeta: {
        query: 'Visual Search',
        filters: {},
        resultsCount: mockResults.length,
        searchTime: Date.now(),
        suggestions: []
      }
    });

  } catch (error) {
    console.error('Visual search error:', error);
    res.status(500).json({
      success: false,
      message: 'Visual search failed'
    });
  }
};

/**
 * Search by barcode/QR code
 */
exports.searchByBarcode = async (req, res) => {
  try {
    const { barcode } = req.query;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: 'Barcode is required'
      });
    }

    // Search for products with matching barcode
    const products = await Product.find({
      barcode: barcode,
      isActive: true
    })
    .populate('vendor', 'username fullName avatar')
    .lean();

    res.json({
      success: true,
      products,
      pagination: {
        current: 1,
        pages: 1,
        total: products.length,
        hasNext: false,
        hasPrev: false
      },
      searchMeta: {
        query: `Barcode: ${barcode}`,
        filters: {},
        resultsCount: products.length,
        searchTime: Date.now(),
        suggestions: []
      }
    });

  } catch (error) {
    console.error('Barcode search error:', error);
    res.status(500).json({
      success: false,
      message: 'Barcode search failed'
    });
  }
};

/**
 * Find similar products
 */
exports.getSimilarProducts = async (req, res) => {
  try {
    const { productId, limit = 12 } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Get the reference product
    const referenceProduct = await Product.findById(productId);
    if (!referenceProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find similar products based on category, subcategory, and tags
    const similarProducts = await Product.find({
      _id: { $ne: productId },
      isActive: true,
      $or: [
        { category: referenceProduct.category },
        { subcategory: referenceProduct.subcategory },
        { tags: { $in: referenceProduct.tags || [] } },
        { brand: referenceProduct.brand }
      ]
    })
    .populate('vendor', 'username fullName avatar')
    .limit(parseInt(limit))
    .lean();

    res.json({
      success: true,
      products: similarProducts,
      pagination: {
        current: 1,
        pages: 1,
        total: similarProducts.length,
        hasNext: false,
        hasPrev: false
      },
      searchMeta: {
        query: 'Similar Products',
        filters: {},
        resultsCount: similarProducts.length,
        searchTime: Date.now(),
        suggestions: []
      }
    });

  } catch (error) {
    console.error('Similar products search error:', error);
    res.status(500).json({
      success: false,
      message: 'Similar products search failed'
    });
  }
};

/**
 * Get personalized search recommendations
 */
exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.id;

    // Get user's search history and preferences
    const userHistory = await SearchHistory.findOne({ user: userId });

    if (!userHistory || userHistory.searches.length === 0) {
      // Return trending searches for new users
      const trending = await TrendingSearch.find({})
        .sort({ 'metrics.trendingScore': -1 })
        .limit(parseInt(limit))
        .select('query metrics.totalSearches');

      const suggestions = trending.map(t => ({
        text: t.query,
        type: 'trending',
        popularity: t.metrics.totalSearches
      }));

      return res.json({
        success: true,
        suggestions
      });
    }

    // Analyze user's search patterns
    const categoryPreferences = {};
    const brandPreferences = {};

    userHistory.searches.forEach(search => {
      if (search.filters.category) {
        categoryPreferences[search.filters.category] =
          (categoryPreferences[search.filters.category] || 0) + 1;
      }
      if (search.filters.brand) {
        brandPreferences[search.filters.brand] =
          (brandPreferences[search.filters.brand] || 0) + 1;
      }
    });

    // Generate personalized suggestions
    const suggestions = [];

    // Add category-based suggestions
    const topCategories = Object.entries(categoryPreferences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    for (const [category, count] of topCategories) {
      suggestions.push({
        text: `New arrivals in ${category}`,
        type: 'category',
        popularity: count
      });
    }

    // Add brand-based suggestions
    const topBrands = Object.entries(brandPreferences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    for (const [brand, count] of topBrands) {
      suggestions.push({
        text: `Latest from ${brand}`,
        type: 'brand',
        popularity: count
      });
    }

    // Add recent search variations
    const recentQueries = userHistory.searches
      .slice(0, 5)
      .map(search => ({
        text: `${search.query} sale`,
        type: 'personal',
        popularity: search.results.count || 0
      }));

    suggestions.push(...recentQueries);

    res.json({
      success: true,
      suggestions: suggestions.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('Personalized recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personalized recommendations'
    });
  }
};
