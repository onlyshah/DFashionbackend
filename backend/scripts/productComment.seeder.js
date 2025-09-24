// ProductComment Seeder Script
// Usage: node scripts/productComment.seeder.js

const mongoose = require('mongoose');
const ProductComment = require('../models/ProductComment');
const User = require('../models/User');
const Product = require('../models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedProductComments() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  const product = await Product.findOne();
  if (!user || !product) {
    throw new Error('Missing user or product for product comment seeding.');
  }

  const comments = [
    {
      product: product._id,
      user: user._id,
      text: 'Great product! Highly recommend.',
      rating: 5,
      likes: [],
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await ProductComment.deleteMany({});
  await ProductComment.insertMany(comments);
  console.log('ProductComments seeded successfully!');
  await mongoose.disconnect();
}

seedProductComments().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
