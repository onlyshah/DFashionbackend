const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Role = require('../models/Role');
const UserBehavior = require('../models/UserBehavior');
const { SearchHistory, TrendingSearch, SearchSuggestion } = require('../models/SearchHistory');

// Create Brand model if it doesn't exist
const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  logo: String,
  website: String,
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  productCount: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);

// Load environment variables
require('dotenv').config();

async function connectDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function seedMissingCollections() {
  try {
    console.log('🚀 Starting Missing Collections Seeding...\n');

    // Get existing data
    const users = await User.find({ role: 'customer' });
    const products = await Product.find();
    const categories = await Category.find();
    const brands = await Brand.find();

    console.log(`Found ${users.length} customers, ${products.length} products, ${categories.length} categories, ${brands.length} brands\n`);

    // 1. Add Customer Role
    console.log('👤 Adding customer role...');
    const existingCustomerRole = await Role.findOne({ name: 'customer' });
    
    if (!existingCustomerRole) {
      const customerRole = await Role.create({
        name: 'customer',
        displayName: 'Customer',
        description: 'End user customer with shopping and social features access',
        department: 'customer_service',
        level: 1,
        permissions: {
          products: { create: false, read: true, update: false, delete: false },
          orders: { create: true, read: true, update: false, delete: false },
          cart: { create: true, read: true, update: true, delete: true },
          wishlist: { create: true, read: true, update: true, delete: true },
          posts: { create: true, read: true, update: true, delete: true },
          stories: { create: true, read: true, update: true, delete: true },
          reels: { create: true, read: true, update: true, delete: true },
          profile: { create: false, read: true, update: true, delete: false },
          social: { create: true, read: true, update: true, delete: true },
          reviews: { create: true, read: true, update: true, delete: true },
          notifications: { create: false, read: true, update: true, delete: false }
        },
        isActive: true
      });
      console.log(`✅ Created customer role: ${customerRole.name}`);
    } else {
      console.log('✅ Customer role already exists');
    }

    // 2. Clear and Create Search Histories
    console.log('\n🔍 Creating search histories...');
    await SearchHistory.deleteMany({});
    
    const searchHistories = [];
    for (let i = 0; i < users.length; i++) {
      const customer = users[i];
      const searchQueries = [
        'summer dress', 'casual shirts', 'formal shoes', 'winter jacket',
        'party wear', 'ethnic wear', 'sports shoes', 'handbags',
        'sunglasses', 'watches', 'jeans', 'tops', 'kurtas',
        'sneakers', 'accessories', 'jewelry', 'scarves', 'belts'
      ];
      
      const searches = [];
      for (let j = 0; j < Math.floor(Math.random() * 8) + 3; j++) { // 3-10 searches per user
        const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
        const relatedProducts = products.filter(p => 
          p.name.toLowerCase().includes(query.split(' ')[0]) || 
          p.category.toLowerCase().includes(query.split(' ')[0])
        ).slice(0, Math.floor(Math.random() * 5) + 1);
        
        searches.push({
          query: query,
          filters: {
            category: Math.random() > 0.5 ? categories[Math.floor(Math.random() * categories.length)].name : undefined,
            brand: Math.random() > 0.7 ? brands[Math.floor(Math.random() * brands.length)].name : undefined,
            minPrice: Math.random() > 0.8 ? Math.floor(Math.random() * 1000) + 500 : undefined,
            maxPrice: Math.random() > 0.8 ? Math.floor(Math.random() * 5000) + 2000 : undefined,
            sortBy: ['price', 'rating', 'popularity', 'newest'][Math.floor(Math.random() * 4)],
            sortOrder: ['asc', 'desc'][Math.floor(Math.random() * 2)]
          },
          results: {
            count: relatedProducts.length,
            clicked: relatedProducts.slice(0, Math.floor(Math.random() * 3) + 1).map((product, index) => ({
              productId: product._id,
              position: index + 1,
              clickedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            })),
            purchased: Math.random() > 0.7 ? [{
              productId: relatedProducts[0]?._id,
              purchasedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            }] : []
          },
          metadata: {
            source: ['search_bar', 'voice_search', 'suggestion', 'filter'][Math.floor(Math.random() * 4)],
            sessionId: `session_${customer._id}_${j}`,
            deviceType: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)],
            location: 'Mumbai, India',
            duration: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
            refinements: Math.floor(Math.random() * 5)
          },
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }
      
      searchHistories.push({
        user: customer._id,
        searches: searches,
        totalSearches: searches.length,
        lastSearchDate: new Date(),
        topCategories: categories.slice(0, 3).map(cat => cat.name),
        topBrands: brands.slice(0, 3).map(brand => brand.name),
        averageSessionDuration: Math.floor(Math.random() * 200) + 100,
        searchPatterns: {
          peakHours: [9, 12, 15, 18, 21],
          preferredCategories: categories.slice(0, 3).map(cat => cat.name),
          priceRange: {
            min: 500,
            max: 5000,
            average: 2000
          }
        }
      });
    }
    const createdSearchHistories = await SearchHistory.create(searchHistories);
    console.log(`✅ Created ${createdSearchHistories.length} search histories`);

    // 3. Create Trending Searches
    console.log('\n🔥 Creating trending searches...');
    await TrendingSearch.deleteMany({});
    
    const trendingSearches = [
      'summer dress', 'casual shirts', 'formal shoes', 'winter jacket',
      'party wear', 'ethnic wear', 'sports shoes', 'handbags',
      'sunglasses', 'watches', 'jeans', 'tops', 'kurtas',
      'sneakers', 'accessories', 'jewelry', 'scarves', 'belts'
    ].map((query, index) => ({
      query: query,
      metrics: {
        totalSearches: Math.floor(Math.random() * 1000) + 500,
        uniqueUsers: Math.floor(Math.random() * 300) + 100,
        searchesLast24h: Math.floor(Math.random() * 50) + 20,
        searchesLast7d: Math.floor(Math.random() * 200) + 100,
        searchesLast30d: Math.floor(Math.random() * 800) + 400,
        peakSearchDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        trendingScore: Math.floor(Math.random() * 100) + 50
      },
      performance: {
        averageResults: Math.floor(Math.random() * 50) + 10,
        averageClickThroughRate: Math.floor(Math.random() * 30) + 10,
        averageConversionRate: Math.floor(Math.random() * 10) + 2,
        popularFilters: [
          { filter: 'category', value: categories[index % categories.length].name, usage: Math.floor(Math.random() * 20) + 5 },
          { filter: 'price', value: 'low-to-high', usage: Math.floor(Math.random() * 15) + 3 }
        ]
      },
      relatedQueries: [
        { query: `${query} online`, similarity: 0.8, coSearchCount: Math.floor(Math.random() * 100) + 20 },
        { query: `best ${query}`, similarity: 0.7, coSearchCount: Math.floor(Math.random() * 80) + 15 },
        { query: `cheap ${query}`, similarity: 0.6, coSearchCount: Math.floor(Math.random() * 60) + 10 },
        { query: `${query} brands`, similarity: 0.75, coSearchCount: Math.floor(Math.random() * 70) + 12 }
      ],
      seasonality: {
        isSeasonalTrend: Math.random() > 0.7,
        peakMonths: [6, 7, 8], // Summer months for most queries
        seasonalMultiplier: Math.random() * 2 + 0.5
      },
      lastUpdated: new Date()
    }));
    const createdTrendingSearches = await TrendingSearch.create(trendingSearches);
    console.log(`✅ Created ${createdTrendingSearches.length} trending searches`);

    // 4. Create Search Suggestions
    console.log('\n💡 Creating search suggestions...');
    await SearchSuggestion.deleteMany({});
    
    const searchSuggestions = [];
    const baseQueries = ['dress', 'shirt', 'shoe', 'bag', 'watch', 'jean', 'top', 'kurta'];
    baseQueries.forEach(base => {
      const suggestions = [
        `${base}s for women`,
        `${base}s for men`,
        `casual ${base}s`,
        `formal ${base}s`,
        `party ${base}s`,
        `summer ${base}s`,
        `winter ${base}s`,
        `branded ${base}s`,
        `cheap ${base}s`,
        `best ${base}s`
      ];
      
      suggestions.forEach((suggestion, index) => {
        const suggestionTypes = ['product', 'category', 'brand', 'trending', 'completion'];
        const suggestionType = suggestionTypes[Math.floor(Math.random() * suggestionTypes.length)];

        searchSuggestions.push({
          query: suggestion,
          type: suggestionType,
          source: {
            category: suggestionType === 'category' ? categories[Math.floor(Math.random() * categories.length)].name : undefined,
            brand: suggestionType === 'brand' ? brands[Math.floor(Math.random() * brands.length)].name : undefined,
            productId: suggestionType === 'product' ? products[Math.floor(Math.random() * products.length)]._id : undefined,
            metadata: {
              searchCount: Math.floor(Math.random() * 500) + 100,
              clickThroughRate: Math.floor(Math.random() * 50) + 20,
              conversionRate: Math.floor(Math.random() * 10) + 2
            }
          },
          popularity: Math.floor(Math.random() * 100) + 50,
          isActive: true
        });
      });
    });
    const createdSearchSuggestions = await SearchSuggestion.create(searchSuggestions);
    console.log(`✅ Created ${createdSearchSuggestions.length} search suggestions`);

    // 5. Fix User Behaviors (recreate with correct structure)
    console.log('\n📊 Recreating user behaviors...');
    await UserBehavior.deleteMany({});

    const userBehaviors = [];
    for (let i = 0; i < users.length; i++) {
      const customer = users[i];

      const interactions = [];
      // Generate various interactions for each user
      for (let j = 0; j < Math.floor(Math.random() * 20) + 10; j++) { // 10-30 interactions per user
        const interactionTypes = [
          'product_view', 'product_like', 'product_share', 'product_purchase',
          'post_view', 'post_like', 'post_share', 'post_comment',
          'story_view', 'story_like', 'story_share',
          'search', 'category_browse', 'filter_apply',
          'cart_add', 'cart_remove', 'wishlist_add', 'wishlist_remove',
          'vendor_follow', 'user_follow'
        ];

        const type = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
        let targetId, targetType;

        if (type.includes('product')) {
          targetId = products[Math.floor(Math.random() * products.length)]._id;
          targetType = 'product';
        } else if (type.includes('post')) {
          targetId = products[Math.floor(Math.random() * products.length)]._id; // Use product as fallback
          targetType = 'post';
        } else if (type.includes('story')) {
          targetId = products[Math.floor(Math.random() * products.length)]._id; // Use product as fallback
          targetType = 'story';
        } else if (type.includes('user')) {
          targetId = users[Math.floor(Math.random() * users.length)]._id;
          targetType = 'user';
        } else if (type.includes('vendor')) {
          targetId = users[Math.floor(Math.random() * users.length)]._id;
          targetType = 'vendor';
        } else {
          targetId = categories[Math.floor(Math.random() * categories.length)]._id;
          targetType = 'category';
        }

        interactions.push({
          type: type,
          targetId: targetId,
          targetType: targetType,
          metadata: {
            category: Math.random() > 0.5 ? categories[Math.floor(Math.random() * categories.length)].name : undefined,
            brand: Math.random() > 0.5 ? brands[Math.floor(Math.random() * brands.length)].name : undefined,
            price: Math.random() > 0.5 ? Math.floor(Math.random() * 5000) + 500 : undefined,
            searchQuery: type === 'search' ? ['summer dress', 'casual shirts', 'formal shoes'][Math.floor(Math.random() * 3)] : undefined,
            duration: Math.floor(Math.random() * 300) + 10,
            source: ['home', 'search', 'category', 'profile', 'recommendations'][Math.floor(Math.random() * 5)],
            deviceType: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)],
            sessionId: `session_${customer._id}_${Math.floor(j / 5)}`
          },
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }

      userBehaviors.push({
        user: customer._id,
        interactions: interactions,
        preferences: {
          categories: categories.slice(0, Math.floor(Math.random() * 4) + 2).map(cat => ({
            category: cat.name,
            score: Math.floor(Math.random() * 100) + 50,
            lastInteraction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          })),
          brands: brands.slice(0, Math.floor(Math.random() * 3) + 2).map(brand => ({
            brand: brand.name,
            score: Math.floor(Math.random() * 100) + 50,
            lastInteraction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          })),
          priceRange: {
            min: Math.floor(Math.random() * 1000) + 500,
            max: Math.floor(Math.random() * 5000) + 2000,
            preferred: Math.floor(Math.random() * 3000) + 1000
          },
          colors: ['Black', 'White', 'Blue', 'Red', 'Green'].slice(0, Math.floor(Math.random() * 3) + 2).map(color => ({
            name: color,
            score: Math.floor(Math.random() * 100) + 50,
            interactions: Math.floor(Math.random() * 20) + 5
          })),
          sizes: ['S', 'M', 'L', 'XL'].slice(0, Math.floor(Math.random() * 2) + 1).map(size => ({
            name: size,
            score: Math.floor(Math.random() * 100) + 50,
            interactions: Math.floor(Math.random() * 15) + 3
          }))
        },
        analytics: {
          totalInteractions: interactions.length,
          averageSessionDuration: Math.floor(Math.random() * 300) + 120,
          conversionRate: Math.floor(Math.random() * 20) + 5, // 5-25%
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          deviceUsage: {
            mobile: Math.floor(Math.random() * 60) + 40, // 40-100%
            desktop: Math.floor(Math.random() * 40) + 10, // 10-50%
            tablet: Math.floor(Math.random() * 20) + 5 // 5-25%
          },
          peakActivityHours: [9, 12, 15, 18, 21].slice(0, Math.floor(Math.random() * 3) + 2)
        },
        segments: [
          'frequent_buyer', 'window_shopper', 'price_conscious', 'brand_loyal',
          'trend_follower', 'casual_browser', 'deal_hunter'
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        lastUpdated: new Date()
      });
    }
    const createdUserBehaviors = await UserBehavior.create(userBehaviors);
    console.log(`✅ Created ${createdUserBehaviors.length} user behaviors`);

    console.log('\n📊 Missing Collections Seeding Summary:');
    console.log(`✅ Customer role added/verified`);
    console.log(`✅ Created ${createdSearchHistories.length} search histories`);
    console.log(`✅ Created ${createdTrendingSearches.length} trending searches`);
    console.log(`✅ Created ${createdSearchSuggestions.length} search suggestions`);
    console.log(`✅ Created ${createdUserBehaviors.length} user behaviors`);

    console.log('\n🎉 Missing collections seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding missing collections:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDatabase();
    await seedMissingCollections();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️ Seeding interrupted by user');
  await mongoose.disconnect();
  process.exit(0);
});

// Run the seeder
main();
