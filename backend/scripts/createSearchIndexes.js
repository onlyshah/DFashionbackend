const mongoose = require('mongoose');
require('dotenv').config();

async function createSearchIndexes() {
  try {
    console.log('Connecting to MongoDB...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB successfully!');
    console.log('Creating search indexes...');

    const db = mongoose.connection.db;
    
    // Product collection indexes for search optimization
    console.log('Creating Product collection indexes...');

    // Check and handle existing text index
    try {
      const existingIndexes = await db.collection('products').indexes();
      const textIndex = existingIndexes.find(idx => idx.key && idx.key._fts === 'text');

      if (textIndex) {
        console.log('Found existing text index:', textIndex.name);
        console.log('Keeping existing text search index...');
      } else {
        // Text index for full-text search
        await db.collection('products').createIndex({
          name: 'text',
          description: 'text',
          tags: 'text',
          brand: 'text',
          category: 'text',
          subcategory: 'text'
        }, {
          name: 'product_text_search',
          weights: {
            name: 10,
            brand: 8,
            category: 6,
            subcategory: 4,
            tags: 3,
            description: 1
          },
          default_language: 'english'
        });
        console.log('Created new text search index');
      }
    } catch (error) {
      console.log('Text index already exists, skipping...');
    }
    
    // Helper function to create index safely
    const createIndexSafely = async (collection, indexSpec, options) => {
      try {
        await db.collection(collection).createIndex(indexSpec, options);
        console.log(`✓ Created index: ${options.name}`);
      } catch (error) {
        if (error.code === 85) { // IndexOptionsConflict
          console.log(`⚠ Index ${options.name} already exists with different options, skipping...`);
        } else if (error.code === 11000) { // Duplicate key
          console.log(`⚠ Index ${options.name} already exists, skipping...`);
        } else {
          console.log(`✗ Failed to create index ${options.name}:`, error.message);
        }
      }
    };

    // Compound indexes for filtered searches
    await createIndexSafely('products', {
      isActive: 1,
      category: 1,
      price: 1
    }, { name: 'category_price_active' });

    await createIndexSafely('products', {
      isActive: 1,
      brand: 1,
      price: 1
    }, { name: 'brand_price_active' });

    await createIndexSafely('products', {
      isActive: 1,
      'rating.average': -1,
      'analytics.views': -1
    }, { name: 'rating_popularity_active' });

    await createIndexSafely('products', {
      isActive: 1,
      createdAt: -1
    }, { name: 'newest_active' });

    await createIndexSafely('products', {
      isActive: 1,
      'inventory.quantity': 1
    }, { name: 'stock_active' });

    await createIndexSafely('products', {
      isActive: 1,
      salePrice: 1,
      price: 1
    }, { name: 'sale_price_active' });
    
    // Analytics indexes
    await createIndexSafely('products', {
      'analytics.views': -1,
      'analytics.likes': -1,
      'analytics.purchases': -1
    }, { name: 'analytics_popularity' });

    // Variant-specific indexes
    await createIndexSafely('products', {
      'variants.color': 1,
      'variants.size': 1,
      isActive: 1
    }, { name: 'variants_active' });

    // SearchHistory collection indexes
    console.log('Creating SearchHistory collection indexes...');

    await createIndexSafely('searchhistories', {
      user: 1,
      'searches.timestamp': -1
    }, { name: 'user_search_timeline' });

    await createIndexSafely('searchhistories', {
      user: 1,
      'searches.query': 1
    }, { name: 'user_search_query' });

    await createIndexSafely('searchhistories', {
      'searches.query': 'text'
    }, { name: 'search_query_text' });

    await createIndexSafely('searchhistories', {
      'popularQueries.query': 1,
      'popularQueries.count': -1
    }, { name: 'popular_queries' });
    
    // TrendingSearch collection indexes
    console.log('Creating TrendingSearch collection indexes...');

    await createIndexSafely('trendingsearches', {
      query: 1
    }, { name: 'trending_query_unique', unique: true });

    await createIndexSafely('trendingsearches', {
      'metrics.trendingScore': -1,
      lastUpdated: -1
    }, { name: 'trending_score_updated' });

    await createIndexSafely('trendingsearches', {
      'metrics.searchesLast24h': -1
    }, { name: 'trending_24h' });

    await createIndexSafely('trendingsearches', {
      'metrics.searchesLast7d': -1
    }, { name: 'trending_7d' });

    await createIndexSafely('trendingsearches', {
      'metrics.searchesLast30d': -1
    }, { name: 'trending_30d' });

    await createIndexSafely('trendingsearches', {
      lastUpdated: 1
    }, { name: 'trending_last_updated' });
    
    // SearchSuggestion collection indexes
    console.log('Creating SearchSuggestion collection indexes...');

    await createIndexSafely('searchsuggestions', {
      query: 1,
      type: 1
    }, { name: 'suggestion_query_type' });

    await createIndexSafely('searchsuggestions', {
      type: 1,
      popularity: -1,
      isActive: 1
    }, { name: 'suggestion_type_popularity' });

    await createIndexSafely('searchsuggestions', {
      query: 'text'
    }, { name: 'suggestion_text_search' });

    await createIndexSafely('searchsuggestions', {
      isActive: 1,
      lastUsed: -1
    }, { name: 'suggestion_active_recent' });

    // User collection indexes for search personalization
    console.log('Creating User collection search indexes...');

    await createIndexSafely('users', {
      'preferences.categories': 1
    }, { name: 'user_category_preferences' });

    await createIndexSafely('users', {
      'preferences.brands': 1
    }, { name: 'user_brand_preferences' });

    // Order collection indexes for search analytics
    console.log('Creating Order collection search indexes...');

    await createIndexSafely('orders', {
      'items.product': 1,
      status: 1,
      createdAt: -1
    }, { name: 'product_orders_status' });
    
    // Additional performance indexes
    console.log('Creating additional performance indexes...');

    // Geospatial index for location-based search (if needed)
    await createIndexSafely('products', {
      'vendor.location': '2dsphere'
    }, {
      name: 'vendor_location_geo',
      sparse: true
    });

    // Vendor-specific product indexes
    await createIndexSafely('products', {
      vendor: 1,
      isActive: 1,
      createdAt: -1
    }, { name: 'vendor_products_active' });

    // Category hierarchy indexes
    await createIndexSafely('products', {
      category: 1,
      subcategory: 1,
      isActive: 1
    }, { name: 'category_hierarchy_active' });

    // Price range optimization
    await createIndexSafely('products', {
      price: 1,
      isActive: 1
    }, { name: 'price_range_active' });

    await createIndexSafely('products', {
      salePrice: 1,
      isActive: 1
    }, { name: 'sale_price_range_active' });

    // Search performance monitoring indexes
    await createIndexSafely('searchhistories', {
      'searches.results.count': 1,
      'searches.timestamp': -1
    }, { name: 'search_results_performance' });

    await createIndexSafely('searchhistories', {
      'searches.results.clicked': 1,
      'searches.timestamp': -1
    }, { name: 'search_click_performance' });
    
    console.log('✅ All search indexes created successfully!');
    
    // Display created indexes
    console.log('\n📊 Created indexes summary:');
    
    const collections = ['products', 'searchhistories', 'trendingsearches', 'searchsuggestions', 'users', 'orders'];
    
    for (const collectionName of collections) {
      try {
        const indexes = await db.collection(collectionName).indexes();
        console.log(`\n${collectionName.toUpperCase()} (${indexes.length} indexes):`);
        indexes.forEach(index => {
          console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
      } catch (error) {
        console.log(`  ⚠️  Collection ${collectionName} not found or error: ${error.message}`);
      }
    }
    
    console.log('\n🚀 Search optimization complete!');
    console.log('\nRecommendations:');
    console.log('1. Monitor query performance using MongoDB Profiler');
    console.log('2. Regularly analyze slow queries and add specific indexes');
    console.log('3. Consider using MongoDB Atlas Search for advanced full-text search');
    console.log('4. Implement query result caching for frequently searched terms');
    console.log('5. Use aggregation pipelines for complex search analytics');
    
  } catch (error) {
    console.error('❌ Error creating search indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the script
createSearchIndexes();
