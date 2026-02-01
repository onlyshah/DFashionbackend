const { getModels } = require('../../config');
const models = getModels();
const Product = models.Product;
const User = models.User;
const UserBehavior = models.UserBehavior;
const Post = models.Post;
const Story = models.Story;

class RecommendationEngine {
  constructor() {
    this.weights = {
      collaborative: 0.3,
      contentBased: 0.4,
      social: 0.2,
      trending: 0.1
    };
  }

  // Main recommendation method
  async getPersonalizedRecommendations(userId, options = {}) {
    const {
      limit = 20,
      category = null,
      excludeViewed = true,
      includeReasons = true
    } = options;

    try {
      // Get user behavior data
      const userBehavior = await UserBehavior.findOne({ user: userId });
      const user = await User.findById(userId);

      if (!userBehavior || !user) {
        // Return trending products for new users
        return this.getTrendingProducts({ limit, category });
      }

      // Get recommendations from different algorithms
      const [collaborative, contentBased, social, trending] = await Promise.all([
        this.getCollaborativeRecommendations(userId, userBehavior, limit),
        this.getContentBasedRecommendations(userId, userBehavior, limit),
        this.getSocialRecommendations(userId, userBehavior, limit),
        this.getTrendingProducts({ limit: Math.ceil(limit * 0.3), category })
      ]);

      // Combine and score recommendations
      const combinedRecommendations = this.combineRecommendations({
        collaborative,
        contentBased,
        social,
        trending
      }, limit);

      // Filter out viewed products if requested
      let finalRecommendations = combinedRecommendations;
      if (excludeViewed && userBehavior.interactions) {
        const viewedProductIds = userBehavior.interactions
          .filter(i => i.type === 'product_view' && i.targetType === 'product')
          .map(i => i.targetId.toString());
        
        finalRecommendations = combinedRecommendations.filter(
          rec => !viewedProductIds.includes(rec._id.toString())
        );
      }

      // Add recommendation reasons if requested
      if (includeReasons) {
        finalRecommendations = await this.addRecommendationReasons(
          finalRecommendations,
          userBehavior,
          user
        );
      }

      return finalRecommendations.slice(0, limit);
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      return this.getTrendingProducts({ limit, category });
    }
  }

  // Collaborative filtering recommendations
  async getCollaborativeRecommendations(userId, userBehavior, limit) {
    try {
      // Find similar users
      const similarUsers = await this.findSimilarUsers(userId, userBehavior);
      
      if (similarUsers.length === 0) {
        return [];
      }

      // Get products liked/purchased by similar users
      const similarUserIds = similarUsers.map(u => u.user);
      const similarUserBehaviors = await UserBehavior.find({
        user: { $in: similarUserIds }
      });

      // Aggregate product scores from similar users
      const productScores = {};
      
      for (const behavior of similarUserBehaviors) {
        const userSimilarity = similarUsers.find(
          u => u.user.toString() === behavior.user.toString()
        )?.similarity || 0;

        for (const interaction of behavior.interactions) {
          if (interaction.targetType === 'product' && 
              ['product_like', 'product_purchase', 'cart_add', 'wishlist_add'].includes(interaction.type)) {
            
            const productId = interaction.targetId.toString();
            const weight = this.getInteractionWeight(interaction.type);
            
            if (!productScores[productId]) {
              productScores[productId] = 0;
            }
            
            productScores[productId] += weight * userSimilarity;
          }
        }
      }

      // Get top products
      const topProductIds = Object.entries(productScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit * 2)
        .map(([productId]) => productId);

      const products = await Product.find({
        _id: { $in: topProductIds },
        isActive: true
      })
      .populate('vendor', 'username fullName avatar')
      .lean();

      // Add collaborative scores
      return products.map(product => ({
        ...product,
        recommendationScore: productScores[product._id.toString()] || 0,
        algorithm: 'collaborative'
      }));

    } catch (error) {
      console.error('Error in collaborative filtering:', error);
      return [];
    }
  }

  // Content-based recommendations
  async getContentBasedRecommendations(userId, userBehavior, limit) {
    try {
      // Get user preferences
      const preferences = userBehavior.preferences;
      
      // Build query based on preferences
      const query = { isActive: true };
      
      // Category preferences
      if (preferences.categories && preferences.categories.length > 0) {
        const topCategories = preferences.categories
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(cat => cat.name);
        
        query.category = { $in: topCategories };
      }

      // Brand preferences
      const brandFilter = {};
      if (preferences.brands && preferences.brands.length > 0) {
        const topBrands = preferences.brands
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(brand => brand.name);
        
        brandFilter.brand = { $in: topBrands };
      }

      // Price range preferences
      const priceFilter = {};
      if (preferences.priceRanges && preferences.priceRanges.length > 0) {
        const topPriceRange = preferences.priceRanges
          .sort((a, b) => b.score - a.score)[0];
        
        if (topPriceRange) {
          priceFilter.price = {
            $gte: topPriceRange.min,
            $lte: topPriceRange.max
          };
        }
      }

      // Combine filters
      const finalQuery = { ...query, ...brandFilter, ...priceFilter };

      const products = await Product.find(finalQuery)
        .sort({ 'rating.average': -1, 'analytics.views': -1 })
        .limit(limit * 2)
        .populate('vendor', 'username fullName avatar')
        .lean();

      // Calculate content-based scores
      return products.map(product => {
        let score = 0;
        
        // Category score
        const categoryPref = preferences.categories?.find(cat => cat.name === product.category);
        if (categoryPref) {
          score += categoryPref.score * 0.4;
        }
        
        // Brand score
        const brandPref = preferences.brands?.find(brand => brand.name === product.brand);
        if (brandPref) {
          score += brandPref.score * 0.3;
        }
        
        // Rating score
        score += product.rating.average * 0.2;
        
        // Popularity score
        score += Math.log(product.analytics.views + 1) * 0.1;

        return {
          ...product,
          recommendationScore: score,
          algorithm: 'content-based'
        };
      }).sort((a, b) => b.recommendationScore - a.recommendationScore);

    } catch (error) {
      console.error('Error in content-based filtering:', error);
      return [];
    }
  }

  // Social recommendations based on followed users/vendors
  async getSocialRecommendations(userId, userBehavior, limit) {
    try {
      const user = await User.findById(userId).populate('following');
      
      if (!user.following || user.following.length === 0) {
        return [];
      }

      // Get products from followed vendors
      const followedVendorIds = user.following
        .filter(followedUser => followedUser.role === 'vendor')
        .map(vendor => vendor._id);

      const vendorProducts = await Product.find({
        vendor: { $in: followedVendorIds },
        isActive: true
      })
      .sort({ createdAt: -1, 'rating.average': -1 })
      .limit(limit)
      .populate('vendor', 'username fullName avatar')
      .lean();

      // Get products liked by followed users
      const followedUserIds = user.following.map(u => u._id);
      const followedUserBehaviors = await UserBehavior.find({
        user: { $in: followedUserIds }
      });

      const likedProductIds = [];
      for (const behavior of followedUserBehaviors) {
        const likedProducts = behavior.interactions
          .filter(i => i.type === 'product_like' && i.targetType === 'product')
          .map(i => i.targetId);
        likedProductIds.push(...likedProducts);
      }

      const socialProducts = await Product.find({
        _id: { $in: likedProductIds },
        isActive: true
      })
      .limit(limit)
      .populate('vendor', 'username fullName avatar')
      .lean();

      // Combine and score
      const allSocialProducts = [...vendorProducts, ...socialProducts];
      const uniqueProducts = allSocialProducts.filter((product, index, self) =>
        index === self.findIndex(p => p._id.toString() === product._id.toString())
      );

      return uniqueProducts.map(product => ({
        ...product,
        recommendationScore: Math.random() * 0.5 + 0.5, // Random score for now
        algorithm: 'social'
      }));

    } catch (error) {
      console.error('Error in social recommendations:', error);
      return [];
    }
  }

  // Trending products
  async getTrendingProducts(options = {}) {
    const { limit = 20, category = null, timeframe = 7 } = options;
    
    try {
      const query = { isActive: true };
      if (category) {
        query.category = category;
      }

      // Calculate trending score based on recent activity
      const products = await Product.find(query)
        .sort({
          'analytics.views': -1,
          'analytics.likes': -1,
          'analytics.purchases': -1,
          createdAt: -1
        })
        .limit(limit * 2)
        .populate('vendor', 'username fullName avatar')
        .lean();

      return products.map(product => {
        const trendingScore = (
          product.analytics.views * 0.1 +
          product.analytics.likes * 0.3 +
          product.analytics.purchases * 0.6 +
          (product.rating.average || 0) * 0.2
        );

        return {
          ...product,
          recommendationScore: trendingScore,
          algorithm: 'trending',
          trendingReason: 'Popular this week'
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    } catch (error) {
      console.error('Error getting trending products:', error);
      return [];
    }
  }

  // Combine recommendations from different algorithms
  combineRecommendations(recommendations, limit) {
    const { collaborative, contentBased, social, trending } = recommendations;
    const productScores = {};

    // Add scores from each algorithm
    const addToScores = (products, weight, algorithm) => {
      products.forEach(product => {
        const id = product._id.toString();
        if (!productScores[id]) {
          productScores[id] = { product, totalScore: 0, algorithms: [] };
        }
        productScores[id].totalScore += (product.recommendationScore || 0) * weight;
        productScores[id].algorithms.push(algorithm);
      });
    };

    addToScores(collaborative, this.weights.collaborative, 'collaborative');
    addToScores(contentBased, this.weights.contentBased, 'content-based');
    addToScores(social, this.weights.social, 'social');
    addToScores(trending, this.weights.trending, 'trending');

    // Sort by combined score
    return Object.values(productScores)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map(item => ({
        ...item.product,
        recommendationScore: item.totalScore,
        algorithms: item.algorithms
      }));
  }

  // Find similar users for collaborative filtering
  async findSimilarUsers(userId, userBehavior, limit = 10) {
    try {
      // Get users with similar interaction patterns
      const otherUsers = await UserBehavior.find({
        user: { $ne: userId },
        'analytics.totalInteractions': { $gte: 10 }
      }).limit(100);

      const similarities = [];

      for (const otherUser of otherUsers) {
        const similarity = this.calculateUserSimilarity(userBehavior, otherUser);
        if (similarity > 0.1) { // Minimum similarity threshold
          similarities.push({
            user: otherUser.user,
            similarity,
            commonInteractions: this.countCommonInteractions(userBehavior, otherUser)
          });
        }
      }

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }

  // Calculate similarity between two users
  calculateUserSimilarity(user1Behavior, user2Behavior) {
    // Simple cosine similarity based on category preferences
    const categories1 = user1Behavior.preferences.categories || [];
    const categories2 = user2Behavior.preferences.categories || [];

    if (categories1.length === 0 || categories2.length === 0) {
      return 0;
    }

    // Create vectors
    const allCategories = [...new Set([
      ...categories1.map(c => c.name),
      ...categories2.map(c => c.name)
    ])];

    const vector1 = allCategories.map(cat => {
      const pref = categories1.find(c => c.name === cat);
      return pref ? pref.score : 0;
    });

    const vector2 = allCategories.map(cat => {
      const pref = categories2.find(c => c.name === cat);
      return pref ? pref.score : 0;
    });

    // Calculate cosine similarity
    const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  // Count common interactions between users
  countCommonInteractions(user1Behavior, user2Behavior) {
    const user1Products = new Set(
      user1Behavior.interactions
        .filter(i => i.targetType === 'product')
        .map(i => i.targetId.toString())
    );

    const user2Products = new Set(
      user2Behavior.interactions
        .filter(i => i.targetType === 'product')
        .map(i => i.targetId.toString())
    );

    return [...user1Products].filter(id => user2Products.has(id)).length;
  }

  // Add recommendation reasons
  async addRecommendationReasons(recommendations, userBehavior, user) {
    return recommendations.map(product => {
      const reasons = [];

      // Check if it's from followed vendor
      if (user.following && user.following.includes(product.vendor._id)) {
        reasons.push(`From ${product.vendor.fullName} (following)`);
      }

      // Check category preference
      const categoryPref = userBehavior.preferences.categories?.find(
        cat => cat.name === product.category
      );
      if (categoryPref && categoryPref.score > 10) {
        reasons.push(`You like ${product.category} items`);
      }

      // Check brand preference
      const brandPref = userBehavior.preferences.brands?.find(
        brand => brand.name === product.brand
      );
      if (brandPref && brandPref.score > 5) {
        reasons.push(`You like ${product.brand} products`);
      }

      // Default reasons based on algorithm
      if (reasons.length === 0) {
        if (product.algorithms?.includes('trending')) {
          reasons.push('Trending now');
        } else if (product.algorithms?.includes('collaborative')) {
          reasons.push('People like you also liked this');
        } else {
          reasons.push('Recommended for you');
        }
      }

      return {
        ...product,
        recommendationReason: reasons[0] || 'Recommended for you'
      };
    });
  }

  // Get interaction weight
  getInteractionWeight(type) {
    const weights = {
      'product_view': 1,
      'product_like': 3,
      'product_share': 5,
      'product_purchase': 10,
      'cart_add': 5,
      'wishlist_add': 3
    };
    
    return weights[type] || 1;
  }
}

module.exports = new RecommendationEngine();
