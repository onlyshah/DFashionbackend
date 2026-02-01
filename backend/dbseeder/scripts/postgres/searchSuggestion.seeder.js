// Seeder for SearchSuggestion collection
require('dotenv').config();
const mongoose = require('mongoose');
const { SearchSuggestion } = require('../models/SearchHistory');
const Product = require('../models/Product');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping searchSuggestion.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedSearchSuggestions() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  const product = await Product.findOne();
  // Example image pool from uploads
  const imagePool = [
    '/uploads/products/product-1.jpg',
    '/uploads/products/product-2.jpg',
    '/uploads/products/product-3.jpg',
    '/uploads/categories/men.jpg',
    '/uploads/categories/women.jpg',
    '/uploads/categories/accessories.jpg',
    '/uploads/brands/nike.png',
    '/uploads/brands/adidas.png',
    '/uploads/brands/louis-vuitton.png'
  ];
  const suggestions = Array.from({ length: 25 }, (_, i) => ({
    query: `suggestion${i+1}`,
    type: 'product',
    source: { productId: product?._id },
    imagePath: imagePool[Math.floor(Math.random() * imagePool.length)]
  }));
  await SearchSuggestion.deleteMany({});
  await SearchSuggestion.insertMany(suggestions);
  console.log('SearchSuggestions seeded successfully!');
  await mongoose.disconnect();
}

seedSearchSuggestions().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
