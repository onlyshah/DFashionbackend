const mongoose = require('mongoose');

// Individual search entry schema
const searchEntrySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true
  },
  filters: {
    category: String,
    subcategory: String,
    brand: String,
    minPrice: Number,
    maxPrice: Number,
    sortBy: String,
    sortOrder: String,
    tags: [String]
  },
  results: {
    count: { type: Number, default: 0 },
    clicked: [{ 
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      position: Number,
      clickedAt: { type: Date, default: Date.now }
    }],
    purchased: [{ 
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      purchasedAt: { type: Date, default: Date.now }
    }]
  },
  metadata: {
    source: { type: String, enum: ['search_bar', 'voice_search', 'suggestion', 'filter'], default: 'search_bar' },
    sessionId: String,
    deviceType: String,
    location: String,
    duration: Number, // Time spent on search results page
    refinements: Number // Number of times filters were changed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// User search history schema
const searchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Recent searches (last 100)
  searches: [searchEntrySchema],
  
  // Search analytics
  analytics: {
    totalSearches: { type: Number, default: 0 },
    uniqueQueries: { type: Number, default: 0 },
    averageResultsPerSearch: { type: Number, default: 0 },
    clickThroughRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    lastSearchDate: Date,
    searchFrequency: {
      daily: { type: Number, default: 0 },
      weekly: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 }
    }
  },
  
  // Popular queries for this user
  popularQueries: [{
    query: String,
    count: { type: Number, default: 1 },
    lastSearched: { type: Date, default: Date.now },
    avgResultsCount: { type: Number, default: 0 },
    clickThroughRate: { type: Number, default: 0 }
  }],
  
  // Search preferences learned from behavior
  preferences: {
    preferredCategories: [{
      category: String,
      score: { type: Number, default: 0 },
      searchCount: { type: Number, default: 0 }
    }],
    preferredBrands: [{
      brand: String,
      score: { type: Number, default: 0 },
      searchCount: { type: Number, default: 0 }
    }],
    priceRangePreference: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 10000 },
      mostCommonRange: String
    },
    sortPreference: {
      field: { type: String, default: 'relevance' },
      order: { type: String, default: 'desc' },
      usage: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true
});

// Global trending searches schema
const trendingSearchSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Search volume metrics
  metrics: {
    totalSearches: { type: Number, default: 1 },
    uniqueUsers: { type: Number, default: 1 },
    searchesLast24h: { type: Number, default: 1 },
    searchesLast7d: { type: Number, default: 1 },
    searchesLast30d: { type: Number, default: 1 },
    peakSearchDate: Date,
    trendingScore: { type: Number, default: 0 }
  },
  
  // Search performance
  performance: {
    averageResults: { type: Number, default: 0 },
    averageClickThroughRate: { type: Number, default: 0 },
    averageConversionRate: { type: Number, default: 0 },
    popularFilters: [{
      filter: String,
      value: String,
      usage: Number
    }]
  },
  
  // Related queries
  relatedQueries: [{
    query: String,
    similarity: { type: Number, min: 0, max: 1 },
    coSearchCount: Number
  }],
  
  // Seasonal data
  seasonality: {
    isSeasonalTrend: { type: Boolean, default: false },
    peakMonths: [Number], // 1-12
    category: String,
    tags: [String]
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Search suggestions schema
const searchSuggestionSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['product', 'category', 'brand', 'trending', 'completion'],
    required: true
  },
  source: {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    category: String,
    brand: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  popularity: {
    type: Number,
    default: 0
  },
  imagePath: {
    type: String,
    default: ''
  },
}, {
  timestamps: true
});

// Indexes for performance
searchHistorySchema.index({ user: 1 });
searchHistorySchema.index({ 'searches.timestamp': -1 });
searchHistorySchema.index({ 'searches.query': 1 });
searchHistorySchema.index({ 'analytics.lastSearchDate': -1 });

trendingSearchSchema.index({ query: 1 });
trendingSearchSchema.index({ 'metrics.trendingScore': -1 });
trendingSearchSchema.index({ 'metrics.searchesLast24h': -1 });
trendingSearchSchema.index({ lastUpdated: -1 });

searchSuggestionSchema.index({ query: 'text' });
searchSuggestionSchema.index({ type: 1, popularity: -1 });
searchSuggestionSchema.index({ isActive: 1 });

// Methods for SearchHistory
searchHistorySchema.methods.addSearch = function(searchData) {
  // Add new search to the beginning
  this.searches.unshift(searchData);
  
  // Keep only last 100 searches
  if (this.searches.length > 100) {
    this.searches = this.searches.slice(0, 100);
  }
  
  // Update analytics
  this.analytics.totalSearches += 1;
  this.analytics.lastSearchDate = new Date();
  
  // Update popular queries
  this.updatePopularQuery(searchData.query, searchData.results.count);
  
  // Update preferences
  this.updatePreferences(searchData);
  
  return this.save();
};

searchHistorySchema.methods.updatePopularQuery = function(query, resultsCount) {
  const existingQuery = this.popularQueries.find(pq => pq.query === query);
  
  if (existingQuery) {
    existingQuery.count += 1;
    existingQuery.lastSearched = new Date();
    existingQuery.avgResultsCount = (existingQuery.avgResultsCount + resultsCount) / 2;
  } else {
    this.popularQueries.push({
      query,
      count: 1,
      lastSearched: new Date(),
      avgResultsCount: resultsCount
    });
  }
  
  // Sort by count and keep top 20
  this.popularQueries.sort((a, b) => b.count - a.count);
  this.popularQueries = this.popularQueries.slice(0, 20);
};

searchHistorySchema.methods.updatePreferences = function(searchData) {
  // Update category preferences
  if (searchData.filters.category) {
    const categoryPref = this.preferences.preferredCategories.find(
      pc => pc.category === searchData.filters.category
    );
    
    if (categoryPref) {
      categoryPref.score += 1;
      categoryPref.searchCount += 1;
    } else {
      this.preferences.preferredCategories.push({
        category: searchData.filters.category,
        score: 1,
        searchCount: 1
      });
    }
  }
  
  // Update brand preferences
  if (searchData.filters.brand) {
    const brandPref = this.preferences.preferredBrands.find(
      pb => pb.brand === searchData.filters.brand
    );
    
    if (brandPref) {
      brandPref.score += 1;
      brandPref.searchCount += 1;
    } else {
      this.preferences.preferredBrands.push({
        brand: searchData.filters.brand,
        score: 1,
        searchCount: 1
      });
    }
  }
  
  // Update price range preferences
  if (searchData.filters.minPrice || searchData.filters.maxPrice) {
    const min = searchData.filters.minPrice || 0;
    const max = searchData.filters.maxPrice || 10000;
    
    // Simple average for now - could be more sophisticated
    this.preferences.priceRangePreference.min = 
      (this.preferences.priceRangePreference.min + min) / 2;
    this.preferences.priceRangePreference.max = 
      (this.preferences.priceRangePreference.max + max) / 2;
  }
};

// Static methods for TrendingSearch
trendingSearchSchema.statics.updateTrendingQuery = async function(query, userId) {
  try {
    const trending = await this.findOne({ query });
    
    if (trending) {
      trending.metrics.totalSearches += 1;
      trending.metrics.searchesLast24h += 1;
      trending.metrics.searchesLast7d += 1;
      trending.metrics.searchesLast30d += 1;
      trending.lastUpdated = new Date();
      
      // Calculate trending score (simple algorithm)
      trending.metrics.trendingScore = 
        trending.metrics.searchesLast24h * 10 +
        trending.metrics.searchesLast7d * 2 +
        trending.metrics.searchesLast30d * 0.5;
      
      await trending.save();
    } else {
      await this.create({
        query,
        metrics: {
          totalSearches: 1,
          uniqueUsers: 1,
          searchesLast24h: 1,
          searchesLast7d: 1,
          searchesLast30d: 1,
          peakSearchDate: new Date(),
          trendingScore: 10
        }
      });
    }
  } catch (error) {
    console.error('Error updating trending query:', error);
  }
};

module.exports = {
  SearchHistory: mongoose.model('SearchHistory', searchHistorySchema),
  TrendingSearch: mongoose.model('TrendingSearch', trendingSearchSchema),
  SearchSuggestion: mongoose.model('SearchSuggestion', searchSuggestionSchema)
};
