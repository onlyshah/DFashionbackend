// Wishlist Seeder Script
// Usage: node scripts/wishlist.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const User = require('../models/User');
const Product = require('../models/Product');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping wishlist.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedWishlists() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');


  const users = await User.find({ role: 'end_user' });
  const products = await Product.find();
  if (users.length === 0 || products.length === 0) {
    throw new Error('Missing users or products for wishlist seeding.');
  }

  // Each user gets a wishlist with 2-4 items
  const wishlists = users.slice(0, 20).map((user, idx) => {
    // Pick 2-4 random products for each wishlist
    const items = Array.from({ length: Math.floor(Math.random() * 3) + 2 }, (_, j) => {
      const product = products[(idx * 3 + j) % products.length];
      // Use product's price, color, size, vendor, etc.
      return {
        product: product._id,
        price: product.price,
        originalPrice: product.originalPrice,
        size: product.sizes && product.sizes.length > 0 ? product.sizes[0].size : 'M',
        color: product.colors && product.colors.length > 0 ? product.colors[0].name : 'Black',
        addedFrom: 'product',
        addedAt: new Date(),
        updatedAt: new Date(),
        notes: '',
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        isAvailable: true,
        vendor: product.vendor
      };
    });
    return {
      user: user._id,
      items,
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + item.price, 0),
      totalSavings: items.reduce((sum, item) => sum + (item.originalPrice - item.price), 0)
    };
  });

  // Clean slate to avoid duplicates
  await Wishlist.deleteMany({});
  await Wishlist.insertMany(wishlists);
  console.log('Wishlists seeded successfully!');
  await mongoose.disconnect();
}

seedWishlists().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
