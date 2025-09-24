// Session Seeder Script
// Usage: node scripts/session.seeder.js

const mongoose = require('mongoose');
const Session = require('../models/Session');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedSessions() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  if (!user) {
    throw new Error('Missing user for session seeding.');
  }

  const sessions = [
    {
      user: user._id,
      token: 'sample-session-token',
      device: 'Chrome on Windows',
      ipAddress: '127.0.0.1',
      isActive: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7*24*60*60*1000)
    }
  ];

  await Session.deleteMany({});
  await Session.insertMany(sessions);
  console.log('Sessions seeded successfully!');
  await mongoose.disconnect();
}

seedSessions().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
