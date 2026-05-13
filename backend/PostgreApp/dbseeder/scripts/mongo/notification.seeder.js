// Notification Seeder Script
// Usage: node scripts/notification.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping notification.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedNotifications() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  if (!user) {
    throw new Error('Missing user for notification seeding.');
  }

  const notifications = [
    {
      recipient: user._id,
      sender: user._id,
      type: 'order_placed',
      title: 'Order Placed',
      message: 'Your order has been placed successfully!',
      data: {},
      relatedEntity: { entityType: 'Order' },
      priority: 'medium',
      category: 'order',
      isRead: false
    },
    // Add more notifications as needed
  ];

  await Notification.deleteMany({});
  await Notification.insertMany(notifications);
  console.log('Notifications seeded successfully!');
  await mongoose.disconnect();
}

seedNotifications().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
