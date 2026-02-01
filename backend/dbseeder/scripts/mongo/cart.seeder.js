// Cart Seeder Script
// Usage: node scripts/cart.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const models = require('../models');
const User = models.User;
const Product = require('../models/Product');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping cart.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedCarts() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  const product = await Product.findOne();
  if (!user || !product) {
    throw new Error('Missing user or product for cart seeding.');
  }

  const carts = [
    {
      user: user._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          size: 'M',
          color: 'Gold',
          price: 2999,
          originalPrice: 3999,
          addedFrom: 'product',
          notes: 'Gift wrap this item',
          isAvailable: true,
          vendor: user._id
        }
      ],
      savedForLater: [],
      totalItems: 2,
      totalAmount: 5998,
      totalOriginalAmount: 7998
    }
  ];

  await Cart.deleteMany({});
  await Cart.insertMany(carts);
  console.log('Carts seeded successfully!');
  await mongoose.disconnect();
}

seedCarts().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
