// Payment Seeder Script
// Usage: node scripts/payment.seeder.js

const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedPayments() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const order = await Order.findOne();
  const user = await User.findOne();
  if (!order || !user) {
    throw new Error('Missing order or user for payment seeding.');
  }

  const payments = [
    {
      order: order._id,
      customer: user._id,
      amount: 2999,
      currency: 'INR',
      paymentMethod: 'card',
      paymentGateway: 'razorpay',
      gatewayTransactionId: 'TXN123456',
      status: 'completed',
      paymentDetails: { cardLast4: '1234', cardBrand: 'Visa' },
      metadata: { ipAddress: '127.0.0.1', userAgent: 'SeederScript' },
      timeline: [{ status: 'completed', timestamp: new Date() }]
    }
  ];

  await Payment.deleteMany({});
  await Payment.insertMany(payments);
  console.log('Payments seeded successfully!');
  await mongoose.disconnect();
}

seedPayments().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
