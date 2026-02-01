// UserBehavior Seeder Script
// Usage: node scripts/userBehavior.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const UserBehavior = require('../models/UserBehavior');
const User = require('../models/User');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping userBehavior.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedUserBehaviors() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({});
  if (!users.length) {
    throw new Error('No users found for user behavior seeding.');
  }
  const types = [
    'product_view', 'product_like', 'product_share', 'product_purchase',
    'post_view', 'post_like', 'post_share', 'post_comment',
    'story_view', 'story_like', 'story_share',
    'search', 'category_browse', 'filter_apply',
    'cart_add', 'cart_remove', 'wishlist_add', 'wishlist_remove',
    'vendor_follow', 'vendor_unfollow', 'user_follow', 'user_unfollow'
  ];
  const targetTypes = ['product', 'post', 'story', 'user', 'vendor', 'category'];
  const behaviors = users.map((user, i) => ({
    user: user._id,
    interactions: Array.from({ length: 20 }, (_, j) => ({
      type: types[(i * 3 + j) % types.length],
      targetId: user._id, // For demo, use user._id; in real, use real target ids
      targetType: targetTypes[j % targetTypes.length],
      metadata: {
        category: 'Fashion',
        brand: 'BrandX',
        price: 100 + j * 5,
        searchQuery: `query${j}`,
        filters: { color: 'Red', size: 'M' },
        duration: Math.floor(Math.random() * 60),
        source: 'web',
        deviceType: 'desktop',
        sessionId: `sess${i}${j}`
      },
      timestamp: new Date(Date.now() - j * 3600 * 1000)
    })),
    preferences: {},
    patterns: {},
    socialBehavior: {},
    recommendationScores: {},
    similarUsers: [],
    analytics: {}
  }));
  await UserBehavior.deleteMany({});
  await UserBehavior.insertMany(behaviors);
  console.log('UserBehaviors seeded successfully!');
  await mongoose.disconnect();
}

seedUserBehaviors().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
