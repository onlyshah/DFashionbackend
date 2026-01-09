// SearchHistory Seeder Script
// Usage: node scripts/searchHistory.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const { SearchHistory } = require('../models/SearchHistory');
const User = require('../models/User');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping searchHistory.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

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
