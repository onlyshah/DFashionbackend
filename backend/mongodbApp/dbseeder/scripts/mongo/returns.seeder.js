// Returns Seeder Script
// Creates return records with various statuses and refund data
// Usage: node scripts/returns.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const Return = require('../models/Return');
const Order = require('../models/Order');
const User = require('../models/User');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping returns.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedReturns() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for returns seeding');

    // Get sample data
    const orders = await Order.find().limit(10);
    const users = await User.find({ role: 'end_user' }).limit(5);
    const admins = await User.findOne({ role: 'admin' });

    if (!orders.length || !users.length) {
      throw new Error('Missing orders or users for return seeding');
    }

    // Clear existing returns
    await Return.deleteMany({});

    const returnReasons = [
      'defective',
      'wrongitem',
      'changedmind',
      'notasexpected',
      'other'
    ];

    const returns = [];

    // Create returns for 8 of the orders
    for (let i = 0; i < Math.min(orders.length, 8); i++) {
      const order = orders[i];
      const user = users[i % users.length];

      // Vary return statuses
      const statuses = ['requested', 'approved', 'rejected', 'shipped', 'received', 'completed'];
      const status = statuses[i % statuses.length];
      const reason = returnReasons[i % returnReasons.length];

      let refund = null;

      if (['approved', 'shipped', 'received', 'completed'].includes(status)) {
        refund = {
          amount: order.totalAmount * 0.9,
          method: ['original_payment', 'wallet', 'bank'][i % 3],
          processedAt: status === 'completed' ? new Date(Date.now() - 2*24*60*60*1000) : null,
          processedBy: admins?._id,
          referenceId: `REF-${Date.now()}-${i}`
        };
      }

      const returnRecord = {
        orderId: order._id,
        customerId: user._id,
        items: order.items.map((item, idx) => ({
          productId: item.product,
          quantity: 1,
          reason: reason,
          description: `Item return for order ${order.orderNumber}`
        })),
        returnInitiatedAt: new Date(Date.now() - 10*24*60*60*1000),
        returnDeadline: new Date(Date.now() + 20*24*60*60*1000),
        status: status,
        returnShipmentId: ['shipped', 'received', 'completed'].includes(status) ? `RET${Date.now()}${i}` : null,
        returnType: 'refund',
        refund: refund,
        audits: [
          {
            actor: user._id,
            action: 'initiated',
            timestamp: new Date(Date.now() - 10*24*60*60*1000),
            notes: 'Return request initiated by customer'
          }
        ]
      };

      if (status !== 'requested') {
        returnRecord.audits.push({
          actor: admins?._id,
          action: status,
          timestamp: new Date(Date.now() - 8*24*60*60*1000),
          notes: `Return ${status} by admin`
        });
      }

      returns.push(returnRecord);
    }

    await Return.insertMany(returns);

    console.log(`✓ ${returns.length} returns seeded successfully`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Returns seeding failed:', err.message);
    process.exit(1);
  }
}

seedReturns();
