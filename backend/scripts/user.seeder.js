// User Seeder Script
// Usage: node scripts/user.seeder.js

const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
const DEFAULT_AVATAR = '/uploads/avatars/default-avatar.svg';

const bcrypt = require('bcryptjs');
const users = [
  // 1 Super Admin
  {
    username: 'superadmin',
    email: 'superadmin@dfashion.com',
    password: 'SuperAdmin123!',
    fullName: 'Super Admin',
    avatar: '/uploads/avatars/default-avatar.svg',
    role: 'super_admin',
    department: 'administration',
    isActive: true
  },
  // 5 Admins
  ...Array.from({ length: 5 }, (_, i) => ({
    username: `admin${i+1}`,
    email: `admin${i+1}@dfashion.com`,
    password: 'Admin123!',
    fullName: `Admin User ${i+1}`,
    avatar: `/uploads/avatars/admin${i+1}.svg`,
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
    avatar: `/uploads/avatars/vendor${i+1}.svg`,
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
    avatar: `/uploads/avatars/customer${i+1}.svg`,
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
    avatar: `/uploads/avatars/influencer${i+1}.svg`,
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

// Validate avatar path (ensure it resolves inside the backend folder)
const fs = require('fs');
const path = require('path');
function validateAvatarPath(avatarPath) {
  if (!avatarPath) return DEFAULT_AVATAR;
  // Strip any leading slashes/backslashes so join resolves under backend root
  const rel = avatarPath.replace(/^[/\\]+/, '');
  const absPath = path.join(__dirname, '..', rel);
  if (fs.existsSync(absPath)) {
    // Return a normalized web-friendly path with a leading slash
    return '/' + rel.replace(/\\/g, '/');
  }
  // Fallback to default avatar (also ensure it exists under backend)
  const defRel = DEFAULT_AVATAR.replace(/^[/\\]+/, '');
  const defAbs = path.join(__dirname, '..', defRel);
  if (fs.existsSync(defAbs)) return '/' + defRel.replace(/\\/g, '/');
  // As a last resort, return the DEFAULT_AVATAR value
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
    const salt = await bcrypt.genSalt(12);
    hashed.password = await bcrypt.hash(user.password, salt);
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
