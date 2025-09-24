// SearchHistory Seeder Script
// Usage: node scripts/searchHistory.seeder.js

const mongoose = require('mongoose');
const { SearchHistory } = require('../models/SearchHistory');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedSearchHistories() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  if (!user) {
    throw new Error('Missing user for search history seeding.');
  }

  const histories = [
    {
      user: user._id,
      query: 'gold necklace',
      filters: { category: 'Jewelry' },
      resultsCount: 12,
      searchedAt: new Date()
    }
  ];

  await SearchHistory.deleteMany({});
  await SearchHistory.insertMany(histories);
  console.log('SearchHistories seeded successfully!');
  await mongoose.disconnect();
}

seedSearchHistories().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
