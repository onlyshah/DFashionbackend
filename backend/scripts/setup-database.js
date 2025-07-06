const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Import the actual User model

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';

// Sample users data
const sampleUsers = [
  {
    fullName: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    username: 'rajesh_kumar',
    password: 'password123',
    role: 'customer',
    isVerified: true,
    isActive: true,
    followerCount: 1250
  },
  {
    fullName: 'Priya Sharma',
    email: 'priya@example.com',
    username: 'priya_sharma',
    password: 'password123',
    role: 'customer',
    isVerified: true,
    isActive: true,
    isInfluencer: true,
    followerCount: 15420
  },
  {
    fullName: 'Maya Fashion',
    email: 'maya@example.com',
    username: 'fashionista_maya',
    password: 'password123',
    role: 'vendor',
    isVerified: true,
    isActive: true,
    isInfluencer: true,
    followerCount: 25680
  },
  {
    fullName: 'Raj Style Guru',
    email: 'raj@example.com',
    username: 'style_guru_raj',
    password: 'password123',
    role: 'customer',
    isVerified: false,
    isActive: true,
    followerCount: 8930
  },
  {
    fullName: 'Admin User',
    email: 'admin@dfashion.com',
    username: 'admin',
    password: 'admin123',
    role: 'super_admin',
    isVerified: true,
    isActive: true,
    followerCount: 0
  }
];

async function setupDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    console.log('🗑️ Clearing existing users...');
    await User.deleteMany({});

    // Create sample users
    console.log('👥 Creating sample users...');
    for (const userData of sampleUsers) {
      // Don't hash password manually - User model pre-save hook will handle it
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('Customer: rajesh@example.com / password123');
    console.log('Customer (Influencer): priya@example.com / password123');
    console.log('Vendor: maya@example.com / password123');
    console.log('Super Admin: admin@dfashion.com / admin123');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
