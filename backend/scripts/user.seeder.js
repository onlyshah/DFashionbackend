// User Seeder Script
// Usage: node scripts/user.seeder.js

const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
const DEFAULT_AVATAR = '/uploads/default/default-placeholder.png';

const bcrypt = require('bcrypt');
const users = [
  // 5 Admins
  ...Array.from({ length: 5 }, (_, i) => ({
    username: `admin${i+1}`,
    email: `admin${i+1}@dfashion.com`,
    password: 'Admin123!',
    fullName: `Admin User ${i+1}`,
    avatar: `/uploads/avatars/admin${i+1}.jpg`,
    role: 'admin',
    department: 'administration',
    isActive: true
  })),
  // 5 Vendors
  ...Array.from({ length: 5 }, (_, i) => ({
    username: `vendor${i+1}`,
    email: `vendor${i+1}@dfashion.com`,
    password: 'Vendor123!',
    fullName: `Vendor User ${i+1}`,
    avatar: `/uploads/avatars/vendor${i+1}.jpg`,
    role: 'vendor',
    department: 'vendor_management',
    isActive: true
  })),
  // 10 Customers
  ...Array.from({ length: 10 }, (_, i) => ({
    username: `customer${i+1}`,
    email: `customer${i+1}@dfashion.com`,
    password: 'Customer123!',
    fullName: `Customer User ${i+1}`,
    avatar: `/uploads/avatars/customer${i+1}.jpg`,
    role: 'end_user',
    department: 'customer_service',
    isActive: true
  })),
  // 10 Influencers
  ...Array.from({ length: 10 }, (_, i) => ({
    username: `influencer${i+1}`,
    email: `influencer${i+1}@dfashion.com`,
    password: 'Influencer123!',
    fullName: `Influencer User ${i+1}`,
    avatar: `/uploads/avatars/influencer${i+1}.jpg`,
    role: 'end_user',
    isInfluencer: true,
    bio: `Fashion influencer and trendsetter #${i+1}`,
    socialStats: {
      followersCount: 10000 + i * 1000,
      postsCount: 100 + i * 10,
      engagementRate: 5 + i * 0.2
    },
    isActive: true
  })),
];

// Validate avatar path
const fs = require('fs');
const path = require('path');
function validateAvatarPath(avatarPath) {
  const absPath = path.join(__dirname, '..', avatarPath);
  if (fs.existsSync(absPath)) {
    return avatarPath;
  }
  return DEFAULT_AVATAR;
}

users.forEach(user => {
  user.avatar = validateAvatarPath(user.avatar);
});

async function seedUsers() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  // Clean slate to avoid duplicates
  await User.deleteMany({});
  // Hash passwords before insertMany
  const hashedUsers = await Promise.all(users.map(async user => {
    const hashed = { ...user };
    hashed.password = await bcrypt.hash(user.password, 12);
    return hashed;
  }));
  await User.insertMany(hashedUsers);
  console.log('Users seeded successfully!');
  await mongoose.disconnect();
}

seedUsers().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
