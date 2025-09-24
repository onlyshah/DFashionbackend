// Reward Seeder Script
// Usage: node scripts/reward.seeder.js

const mongoose = require('mongoose');
const Reward = require('../models/Reward');
const User = require('../models/User');
const Order = require('../models/Order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedRewards() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  if (!user) {
    throw new Error('Missing user for reward seeding.');
  }

  const rewards = [
    {
      user: user._id,
      type: 'post_like',
      credits: 5,
      description: 'Reward for liking a post',
      isProcessed: true
    },
    {
      user: user._id,
      type: 'daily_login',
      credits: 2,
      description: 'Reward for daily login',
      isProcessed: false
    },
    // Add more rewards as needed
  ];

  await Reward.deleteMany({});
  await Reward.insertMany(rewards);
  console.log('Rewards seeded successfully!');
  await mongoose.disconnect();
}

seedRewards().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
