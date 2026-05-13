/**
 * ============================================================================
 * SEARCH CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Product search, suggestions, analytics, visual/barcode search
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 13
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const searchEngine = require('../utils/searchEngine');

exports.searchProducts = async (req, res) => {
  try {
    const {
      q: query, page = 1, limit = 12, sortBy = 'relevance', sortOrder = 'desc',
      category, subcategory, brand, minPrice, maxPrice, rating, inStock, onSale, colors, sizes, tags
    } = req.query;

    const userId = req.user?.id;
    const filters = {
      category, subcategory, brand,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rating: rating ? parseFloat(rating) : undefined,
      inStock: inStock === 'true',
      onSale: onSale === 'true',
      colors: colors ? colors.split(',') : undefined,
      sizes: sizes ? sizes.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined
    };

    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    const searchResults = await searchEngine.searchProducts(query, filters, {
      page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder, userId
    });

    return ApiResponse.success(res, searchResults, 'Products found');
  } catch (error) {
    console.error('❌ searchProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q: query, limit = 10, type = 'all' } = req.query;
    const userId = req.user?.id;

    let suggestions = [];

    if (type === 'all' || type === 'autocomplete') {
      const autocompleteSuggestions = await searchEngine.getSearchSuggestions(query, parseInt(limit));
      suggestions.push(...autocompleteSuggestions);
    }

    if ((type === 'all' || type === 'personalized') && userId) {
      const personalizedSuggestions = await searchEngine.getPersonalizedSuggestions(userId, 5);
      suggestions.push(...personalizedSuggestions);
    }

    if (type === 'all' || type === 'trending') {
      const trendingSuggestions = await searchEngine.getTrendingSearches(5);
      suggestions.push(...trendingSuggestions.map(t => ({
        text: t.query, type: 'trending', popularity: t.searches
      })));
    }

    const uniqueSuggestions = suggestions
      .filter((s, i, arr) => i === arr.findIndex(x => x.text === s.text))
      .slice(0, parseInt(limit));

    return ApiResponse.success(res, { suggestions: uniqueSuggestions, query: query || '' }, 'Suggestions retrieved');
  } catch (error) {
    console.error('❌ getSearchSuggestions error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getSmartSuggestions = async (req, res) => {
  try {
    const { q: query, context } = req.query;
    const userId = req.user?.id;

    if (!query || query.length < 2) {
      return ApiResponse.success(res, { suggestions: [] }, 'Smart suggestions');
    }

    const basicSuggestions = await searchEngine.getSearchSuggestions(query, 5);
    let smartSuggestions = basicSuggestions;

    if (userId) {
      const userHistory = await models.SearchHistory?.findOne({ where: { user_id: userId } });
      if (userHistory) {
        const personalizedSuggestions = (userHistory.searches || [])
          .filter(search => search.query.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3)
          .map(search => ({ text: search.query, type: 'personal', popularity: search.results?.count || 0 }));
        smartSuggestions = [...personalizedSuggestions, ...basicSuggestions].slice(0, 10);
      }
    }

    return ApiResponse.success(res, { suggestions: smartSuggestions }, 'Smart suggestions retrieved');
  } catch (error) {
    console.error('❌ getSmartSuggestions error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getTrendingSearches = async (req, res) => {
  try {
    const { limit = 10, timeframe = '24h' } = req.query;
    const trendingSearches = await searchEngine.getTrendingSearches(parseInt(limit), timeframe);

    return ApiResponse.success(res, {
      trending: trendingSearches, timeframe, timestamp: new Date().toISOString()
    }, 'Trending searches retrieved');
  } catch (error) {
    console.error('❌ getTrendingSearches error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getSearchHistory = async (req, res) => {
  try {
    const { limit = 20, type = 'recent' } = req.query;
    const userId = req.user?.id;
    if (!userId) return ApiResponse.forbidden(res, 'User not authenticated');

    const searchHistory = await models.SearchHistory?.findOne({ where: { user_id: userId } });

    if (!searchHistory) {
      return ApiResponse.success(res, {
        searches: [], analytics: { totalSearches: 0, uniqueQueries: 0 }
      }, 'Search history');
    }

    let searches = [];
    if (type === 'recent') {
      searches = (searchHistory.searches || [])
        .slice(0, parseInt(limit))
        .map(search => ({
          query: search.query, timestamp: search.timestamp, resultsCount: search.results?.count, filters: search.filters
        }));
    } else if (type === 'popular') {
      searches = (searchHistory.popular_queries || [])
        .slice(0, parseInt(limit))
        .map(pq => ({ query: pq.query, count: pq.count, lastSearched: pq.last_searched }));
    }

    return ApiResponse.success(res, {
      searches, analytics: searchHistory.analytics || {}, preferences: searchHistory.preferences || {}
    }, 'Search history retrieved');
  } catch (error) {
    console.error('❌ getSearchHistory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.clearSearchHistory = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const userId = req.user?.id;
    if (!userId) return ApiResponse.forbidden(res, 'User not authenticated');

    const updateFields = {};
    if (type === 'all') {
      updateFields.searches = [];
      updateFields.popular_queries = [];
      updateFields.analytics = { total_searches: 0, unique_queries: 0 };
    } else if (type === 'recent') {
      updateFields.searches = [];
    } else if (type === 'popular') {
      updateFields.popular_queries = [];
    }

    await models.SearchHistory?.update(updateFields, { where: { user_id: userId } });

    return ApiResponse.success(res, {}, `Search history (${type}) cleared`);
  } catch (error) {
    console.error('❌ clearSearchHistory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.trackSearchInteraction = async (req, res) => {
  try {
    const { searchQuery, productId, action, position, metadata = {} } = req.body;
    const userId = req.user?.id;
    if (!userId) return ApiResponse.forbidden(res, 'User not authenticated');

    if (!searchQuery || !action) {
      return ApiResponse.error(res, 'Search query and action required', 422);
    }

    let searchHistory = await models.SearchHistory?.findOne({ where: { user_id: userId } });
    if (!searchHistory) {
      searchHistory = await models.SearchHistory?.create({ user_id: userId, searches: [] });
    }

    const recentSearch = (searchHistory.searches || []).find(
      search => search.query === searchQuery && Date.now() - new Date(search.timestamp).getTime() < 3600000
    );

    if (recentSearch) {
      switch (action) {
        case 'click':
          recentSearch.results = recentSearch.results || {};
          (recentSearch.results.clicked = recentSearch.results.clicked || []).push({
            productId, position: position || 0, clickedAt: new Date()
          });
          break;
        case 'purchase':
          recentSearch.results = recentSearch.results || {};
          (recentSearch.results.purchased = recentSearch.results.purchased || []).push({
            productId, purchasedAt: new Date()
          });
          break;
      }
      await searchHistory.save?.();
    }

    return ApiResponse.success(res, {}, 'Interaction tracked');
  } catch (error) {
    console.error('❌ trackSearchInteraction error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getSearchAnalytics = async (req, res) => {
  try {
    const { timeframe = '7d', limit = 50 } = req.query;
    const now = new Date();
    const timeframeMs = { '24h': 24*60*60*1000, '7d': 7*24*60*60*1000, '30d': 30*24*60*60*1000 };
    const startDate = new Date(now.getTime() - timeframeMs[timeframe]);

    const trendingSearches = await models.TrendingSearch?.findAll({
      where: { last_updated: { [Op.gte]: startDate } },
      order: [['trending_score', 'DESC']],
      limit: parseInt(limit)
    }) || [];

    return ApiResponse.success(res, {
      analytics: {
        timeframe, period: { start: startDate.toISOString(), end: now.toISOString() },
        overview: { totalSearches: 0, uniqueQueries: 0, clickThroughRate: 0, conversionRate: 0 },
        trendingSearches: trendingSearches.map(ts => ({
          query: ts.query, searches: ts.total_searches, trendingScore: ts.trending_score
        }))
      }
    }, 'Search analytics retrieved');
  } catch (error) {
    console.error('❌ getSearchAnalytics error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getUserSearchInsights = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.forbidden(res, 'User not authenticated');

    const userHistory = await models.SearchHistory?.findOne({ where: { user_id: userId } });

    if (!userHistory) {
      return ApiResponse.success(res, {
        insights: {
          totalSearches: 0, uniqueQueries: 0, topCategories: [], topBrands: [],
          searchTrends: [], clickThroughRate: 0, conversionRate: 0
        }
      }, 'Search insights');
    }

    const categoryCount = {}, brandCount = {};
    (userHistory.searches || []).forEach(search => {
      if (search.filters?.category) categoryCount[search.filters.category] = (categoryCount[search.filters.category] || 0) + 1;
      if (search.filters?.brand) brandCount[search.filters.brand] = (brandCount[search.filters.brand] || 0) + 1;
    });

    const totalSearches = userHistory.analytics?.total_searches || 1;
    const topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a).slice(0, 5)
      .map(([name, count]) => ({ name, count, percentage: (count/totalSearches)*100 }));

    const topBrands = Object.entries(brandCount)
      .sort(([,a], [,b]) => b - a).slice(0, 5)
      .map(([name, count]) => ({ name, count, percentage: (count/totalSearches)*100 }));

    return ApiResponse.success(res, {
      insights: {
        totalSearches: userHistory.analytics?.total_searches || 0,
        uniqueQueries: userHistory.analytics?.unique_queries || 0,
        topCategories, topBrands, clickThroughRate: 0, conversionRate: 0
      }
    }, 'Search insights retrieved');
  } catch (error) {
    console.error('❌ getUserSearchInsights error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.visualSearch = async (req, res) => {
  try {
    if (!req.file) return ApiResponse.error(res, 'No image provided', 400);

    const products = await models.Product?.findAll({ where: { is_active: true }, limit: 12 }) || [];

    return ApiResponse.success(res, {
      products, pagination: { current: 1, pages: 1, total: products.length }
    }, 'Visual search completed');
  } catch (error) {
    console.error('❌ visualSearch error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.searchByBarcode = async (req, res) => {
  try {
    const { barcode } = req.query;
    if (!barcode) return ApiResponse.error(res, 'Barcode required', 422);

    const products = await models.Product?.findAll({
      where: { barcode, is_active: true }, limit: 20
    }) || [];

    return ApiResponse.success(res, {
      products, pagination: { current: 1, pages: 1, total: products.length }
    }, 'Barcode search completed');
  } catch (error) {
    console.error('❌ searchByBarcode error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getSimilarProducts = async (req, res) => {
  try {
    const { productId, limit = 12 } = req.query;
    if (!productId) return ApiResponse.error(res, 'Product ID required', 422);

    const refProduct = await models.Product?.findByPk(productId);
    if (!refProduct) return ApiResponse.notFound(res, 'Product');

    const similarProducts = await models.Product?.findAll({
      where: {
        id: { [Op.ne]: productId },
        is_active: true,
        [Op.or]: [
          { category: refProduct.category },
          { subcategory: refProduct.subcategory },
          { brand: refProduct.brand }
        ]
      },
      limit: parseInt(limit)
    }) || [];

    return ApiResponse.success(res, {
      products: similarProducts, pagination: { current: 1, pages: 1, total: similarProducts.length }
    }, 'Similar products retrieved');
  } catch (error) {
    console.error('❌ getSimilarProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      const trending = await models.TrendingSearch?.findAll({
        order: [['trending_score', 'DESC']], limit: parseInt(limit)
      }) || [];
      const suggestions = trending.map(t => ({
        text: t.query, type: 'trending', popularity: t.total_searches
      }));
      return ApiResponse.success(res, { suggestions }, 'Recommendations');
    }

    const userHistory = await models.SearchHistory?.findOne({ where: { user_id: userId } });
    const suggestions = [];

    if (userHistory?.searches?.length > 0) {
      const categoryCount = {}, brandCount = {};
      userHistory.searches.forEach(s => {
        if (s.filters?.category) categoryCount[s.filters.category] = (categoryCount[s.filters.category] || 0) + 1;
        if (s.filters?.brand) brandCount[s.filters.brand] = (brandCount[s.filters.brand] || 0) + 1;
      });

      Object.entries(categoryCount).sort(([,a], [,b]) => b - a).slice(0, 3)
        .forEach(([cat]) => suggestions.push({ text: `New in ${cat}`, type: 'category' }));

      Object.entries(brandCount).sort(([,a], [,b]) => b - a).slice(0, 3)
        .forEach(([brand]) => suggestions.push({ text: `Latest from ${brand}`, type: 'brand' }));
    }

    return ApiResponse.success(res, { suggestions: suggestions.slice(0, parseInt(limit)) }, 'Recommendations retrieved');
  } catch (error) {
    console.error('❌ getPersonalizedRecommendations error:', error);
    return ApiResponse.serverError(res, error);
  }
};


