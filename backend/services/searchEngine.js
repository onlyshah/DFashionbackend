const Product = require('../models/Product');
const { SearchHistory, TrendingSearch, SearchSuggestion } = require('../models/SearchHistory');

class SearchEngine {
  constructor() {
    this.searchWeights = {
      name: 3.0,
      description: 1.5,
      tags: 2.0,
      brand: 2.5,
      category: 2.0,
      subcategory: 1.5
    };
  }

  // Advanced product search with relevance scoring
  async searchProducts(query, filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 12,
        sortBy = 'relevance',
        sortOrder = 'desc',
        userId = null
      } = options;

      const skip = (page - 1) * limit;
      
      // Build base query
      let baseQuery = { isActive: true };
      
      // Apply filters
      this.applyFilters(baseQuery, filters);
      
      let products;
      let total;
      
      if (query && query.trim()) {
        // Full-text search with relevance scoring
        const searchResults = await this.performFullTextSearch(query, baseQuery, skip, limit, sortBy);
        products = searchResults.products;
        total = searchResults.total;
        
        // Track search if user is provided
        if (userId) {
          await this.trackSearch(userId, query, filters, products.length);
        }
        
        // Update trending searches
        await TrendingSearch.updateTrendingQuery(query.trim(), userId);
        
      } else {
        // Regular filtered search without query
        const sort = this.buildSortOptions(sortBy, sortOrder);
        
        products = await Product.find(baseQuery)
          .populate('vendor', 'username fullName avatar')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean();
          
        total = await Product.countDocuments(baseQuery);
      }
      
      return {
        products: products.map(product => this.enhanceProductResult(product, query)),
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        searchMeta: {
          query: query || '',
          filters,
          resultsCount: total,
          searchTime: Date.now(),
          suggestions: await this.getSearchSuggestions(query, 5)
        }
      };
      
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Search failed');
    }
  }

  // Apply various filters to the base query
  applyFilters(baseQuery, filters) {
    const {
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      tags,
      vendor,
      rating,
      inStock,
      onSale,
      colors,
      sizes
    } = filters;

    if (category) baseQuery.category = category;
    if (subcategory) baseQuery.subcategory = subcategory;
    if (brand) baseQuery.brand = { $regex: brand, $options: 'i' };
    if (vendor) baseQuery.vendor = vendor;
    
    // Price range filter
    if (minPrice || maxPrice) {
      baseQuery.price = {};
      if (minPrice) baseQuery.price.$gte = parseFloat(minPrice);
      if (maxPrice) baseQuery.price.$lte = parseFloat(maxPrice);
    }
    
    // Rating filter
    if (rating) {
      baseQuery['rating.average'] = { $gte: parseFloat(rating) };
    }
    
    // Stock filter
    if (inStock === 'true') {
      baseQuery['inventory.quantity'] = { $gt: 0 };
    }
    
    // Sale filter
    if (onSale === 'true') {
      baseQuery.salePrice = { $exists: true, $lt: baseQuery.price || 999999 };
    }
    
    // Tags filter
    if (tags && Array.isArray(tags)) {
      baseQuery.tags = { $in: tags };
    }
    
    // Colors filter
    if (colors && Array.isArray(colors)) {
      baseQuery['variants.color'] = { $in: colors };
    }
    
    // Sizes filter
    if (sizes && Array.isArray(sizes)) {
      baseQuery['variants.size'] = { $in: sizes };
    }
  }

  // Perform full-text search with relevance scoring
  async performFullTextSearch(query, baseQuery, skip, limit, sortBy) {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    // Create text search conditions
    const textSearchConditions = [];
    
    searchTerms.forEach(term => {
      const termRegex = { $regex: term, $options: 'i' };
      
      textSearchConditions.push({
        $or: [
          { name: termRegex },
          { description: termRegex },
          { tags: termRegex },
          { brand: termRegex },
          { category: termRegex },
          { subcategory: termRegex }
        ]
      });
    });
    
    // Combine with base query
    const searchQuery = {
      ...baseQuery,
      $and: textSearchConditions
    };
    
    // Get products with text search
    let products = await Product.find(searchQuery)
      .populate('vendor', 'username fullName avatar')
      .lean();
    
    // Calculate relevance scores
    products = products.map(product => {
      const relevanceScore = this.calculateRelevanceScore(product, searchTerms);
      return { ...product, relevanceScore };
    });
    
    // Sort by relevance or other criteria
    if (sortBy === 'relevance') {
      products.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else {
      const sort = this.buildSortOptions(sortBy, 'desc');
      const sortField = Object.keys(sort)[0];
      const sortDirection = sort[sortField];
      
      products.sort((a, b) => {
        const aValue = this.getNestedValue(a, sortField) || 0;
        const bValue = this.getNestedValue(b, sortField) || 0;
        return sortDirection === 1 ? aValue - bValue : bValue - aValue;
      });
    }
    
    const total = products.length;
    const paginatedProducts = products.slice(skip, skip + limit);
    
    return {
      products: paginatedProducts,
      total
    };
  }

  // Calculate relevance score for a product
  calculateRelevanceScore(product, searchTerms) {
    let score = 0;
    
    searchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      
      // Name matches (highest weight)
      if (product.name && product.name.toLowerCase().includes(termLower)) {
        score += this.searchWeights.name;
        // Exact match bonus
        if (product.name.toLowerCase() === termLower) {
          score += 2;
        }
        // Start of word bonus
        if (product.name.toLowerCase().startsWith(termLower)) {
          score += 1;
        }
      }
      
      // Brand matches
      if (product.brand && product.brand.toLowerCase().includes(termLower)) {
        score += this.searchWeights.brand;
      }
      
      // Category matches
      if (product.category && product.category.toLowerCase().includes(termLower)) {
        score += this.searchWeights.category;
      }
      
      // Subcategory matches
      if (product.subcategory && product.subcategory.toLowerCase().includes(termLower)) {
        score += this.searchWeights.subcategory;
      }
      
      // Description matches
      if (product.description && product.description.toLowerCase().includes(termLower)) {
        score += this.searchWeights.description;
      }
      
      // Tags matches
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach(tag => {
          if (tag.toLowerCase().includes(termLower)) {
            score += this.searchWeights.tags;
          }
        });
      }
    });
    
    // Boost score based on product popularity
    const popularityBoost = (
      (product.analytics?.views || 0) * 0.001 +
      (product.analytics?.likes || 0) * 0.01 +
      (product.analytics?.purchases || 0) * 0.1 +
      (product.rating?.average || 0) * 0.5
    );
    
    score += popularityBoost;
    
    // Boost for products in stock
    if (product.inventory && product.inventory.quantity > 0) {
      score += 0.5;
    }
    
    // Boost for products on sale
    if (product.salePrice && product.salePrice < product.price) {
      score += 0.3;
    }
    
    return score;
  }

  // Build sort options
  buildSortOptions(sortBy, sortOrder = 'desc') {
    const direction = sortOrder === 'desc' ? -1 : 1;
    
    switch (sortBy) {
      case 'price':
        return { price: direction };
      case 'rating':
        return { 'rating.average': direction, 'rating.count': -1 };
      case 'popularity':
        return { 'analytics.views': direction, 'analytics.likes': direction };
      case 'newest':
        return { createdAt: -1 };
      case 'name':
        return { name: direction };
      case 'relevance':
      default:
        return { relevanceScore: -1, 'analytics.views': -1 };
    }
  }

  // Get nested object value by path
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  // Enhance product result with search-specific data
  enhanceProductResult(product, query) {
    const enhanced = { ...product };
    
    // Add search highlights if query exists
    if (query) {
      enhanced.searchHighlights = this.generateHighlights(product, query);
    }
    
    // Add quick stats
    enhanced.quickStats = {
      isPopular: (product.analytics?.views || 0) > 100,
      isHighRated: (product.rating?.average || 0) >= 4.0,
      isInStock: (product.inventory?.quantity || 0) > 0,
      isOnSale: product.salePrice && product.salePrice < product.price
    };
    
    return enhanced;
  }

  // Generate search highlights
  generateHighlights(product, query) {
    const highlights = {};
    const searchTerms = query.toLowerCase().split(' ');
    
    searchTerms.forEach(term => {
      if (product.name && product.name.toLowerCase().includes(term)) {
        highlights.name = this.highlightText(product.name, term);
      }
      if (product.description && product.description.toLowerCase().includes(term)) {
        highlights.description = this.highlightText(product.description, term);
      }
    });
    
    return highlights;
  }

  // Highlight matching text
  highlightText(text, term) {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Track user search
  async trackSearch(userId, query, filters, resultsCount) {
    try {
      let searchHistory = await SearchHistory.findOne({ user: userId });
      
      if (!searchHistory) {
        searchHistory = new SearchHistory({ user: userId });
      }
      
      const searchData = {
        query: query.trim(),
        filters,
        results: { count: resultsCount },
        metadata: {
          source: 'search_bar',
          sessionId: `session_${Date.now()}`,
          deviceType: 'web'
        }
      };
      
      await searchHistory.addSearch(searchData);
      
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query, limit = 10) {
    if (!query || query.length < 2) {
      // Return trending searches if no query
      const trending = await TrendingSearch.find({})
        .sort({ 'metrics.trendingScore': -1 })
        .limit(limit)
        .select('query metrics.totalSearches');
      
      return trending.map(t => ({
        text: t.query,
        type: 'trending',
        popularity: t.metrics.totalSearches
      }));
    }
    
    const suggestions = [];
    
    // Get completion suggestions
    const completions = await SearchSuggestion.find({
      query: { $regex: `^${query}`, $options: 'i' },
      type: 'completion',
      isActive: true
    })
    .sort({ popularity: -1 })
    .limit(5);
    
    suggestions.push(...completions.map(s => ({
      text: s.query,
      type: 'completion',
      popularity: s.popularity
    })));
    
    // Get product name suggestions
    const products = await Product.find({
      name: { $regex: query, $options: 'i' },
      isActive: true
    })
    .select('name')
    .limit(3);
    
    suggestions.push(...products.map(p => ({
      text: p.name,
      type: 'product',
      popularity: 0
    })));
    
    // Get brand suggestions
    const brands = await Product.distinct('brand', {
      brand: { $regex: query, $options: 'i' },
      isActive: true
    });
    
    suggestions.push(...brands.slice(0, 2).map(brand => ({
      text: brand,
      type: 'brand',
      popularity: 0
    })));
    
    return suggestions.slice(0, limit);
  }

  // Get trending searches
  async getTrendingSearches(limit = 10, timeframe = '24h') {
    const sortField = timeframe === '24h' ? 'searchesLast24h' : 
                     timeframe === '7d' ? 'searchesLast7d' : 'searchesLast30d';
    
    const trending = await TrendingSearch.find({})
      .sort({ [`metrics.${sortField}`]: -1 })
      .limit(limit)
      .select('query metrics');
    
    return trending.map(t => ({
      query: t.query,
      searches: t.metrics[sortField],
      trendingScore: t.metrics.trendingScore
    }));
  }

  // Get user's recent searches
  async getUserRecentSearches(userId, limit = 10) {
    const searchHistory = await SearchHistory.findOne({ user: userId })
      .select('searches')
      .lean();
    
    if (!searchHistory) return [];
    
    return searchHistory.searches
      .slice(0, limit)
      .map(search => ({
        query: search.query,
        timestamp: search.timestamp,
        resultsCount: search.results.count
      }));
  }

  // Get personalized search suggestions based on user history
  async getPersonalizedSuggestions(userId, limit = 10) {
    const searchHistory = await SearchHistory.findOne({ user: userId });
    
    if (!searchHistory) {
      return this.getTrendingSearches(limit);
    }
    
    const suggestions = [];
    
    // Add popular queries from user's history
    suggestions.push(...searchHistory.popularQueries.slice(0, 5).map(pq => ({
      text: pq.query,
      type: 'personal',
      popularity: pq.count
    })));
    
    // Add category-based suggestions
    const topCategories = searchHistory.preferences.preferredCategories
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    for (const catPref of topCategories) {
      const categoryProducts = await Product.find({
        category: catPref.category,
        isActive: true
      })
      .select('name')
      .sort({ 'analytics.views': -1 })
      .limit(2);
      
      suggestions.push(...categoryProducts.map(p => ({
        text: p.name,
        type: 'category_suggestion',
        popularity: 0
      })));
    }
    
    return suggestions.slice(0, limit);
  }
}

module.exports = new SearchEngine();
