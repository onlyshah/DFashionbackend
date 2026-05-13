// Order Seeder Script
// Usage: node scripts/order.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping order.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedOrders() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  const product = await Product.findOne();
  if (!user || !product) {
    throw new Error('Missing user or product for order seeding.');
  }

  const orders = [
    {
      orderNumber: 'ORD1001',
      customer: user._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: 2999,
          size: 'M',
          color: 'Gold'
        }
      ],
      totalAmount: 2999,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'card',
      shippingAddress: {
        fullName: user.fullName,
        phone: '9999999999',
        addressLine1: '123 Main St',
        addressLine2: '',
        city: 'Mumbai',
        state: 'MH',
        pincode: '400001',
        country: 'India'
      },
      billingAddress: {
        fullName: user.fullName,
        phone: '9999999999',
        addressLine1: '123 Main St',
        addressLine2: '',
        city: 'Mumbai',
        state: 'MH',
        pincode: '400001',
        country: 'India'
      },
      orderDate: new Date(),
      expectedDelivery: new Date(Date.now() + 7*24*60*60*1000),
      notes: 'Please deliver between 10am-5pm',
      discount: { amount: 0 },
      isGift: false
    }
  ];

  await Order.deleteMany({});
  await Order.insertMany(orders);
  console.log('Orders seeded successfully!');
  await mongoose.disconnect();
}

seedOrders().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
