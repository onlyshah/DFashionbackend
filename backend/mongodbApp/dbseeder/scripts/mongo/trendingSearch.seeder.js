// Seeder for TrendingSearch collection
require('dotenv').config();
const mongoose = require('mongoose');
const { TrendingSearch } = require('../models/SearchHistory');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping trendingSearch.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedTrendingSearches() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  // Example image pool from uploads
  const imagePool = [
    '/uploads/default-product.jpg',
    '/uploads/categories/men.svg',
    '/uploads/categories/women.svg',
    '/uploads/categories/accessories.svg',
    '/uploads/brands/default-brand.png'
  ];
  const trending = Array.from({ length: 25 }, (_, i) => ({
    query: `trending${i+1}`,
    metrics: {
      totalSearches: Math.floor(Math.random()*1000)+1,
      uniqueUsers: Math.floor(Math.random()*100)+1,
      searchesLast24h: Math.floor(Math.random()*50),
      searchesLast7d: Math.floor(Math.random()*200),
      searchesLast30d: Math.floor(Math.random()*500),
      peakSearchDate: new Date(),
      trendingScore: Math.random()*100
    },
    imagePath: imagePool[Math.floor(Math.random() * imagePool.length)]
  }));
  await TrendingSearch.deleteMany({});
  await TrendingSearch.insertMany(trending);
  console.log('TrendingSearches seeded successfully!');
  await mongoose.disconnect();
}

seedTrendingSearches().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
