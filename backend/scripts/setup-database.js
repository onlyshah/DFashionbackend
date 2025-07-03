const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },
  avatar: { type: String, default: '/assets/images/default-avatar.svg' },
  isVerified: { type: Boolean, default: false },
  isInfluencer: { type: Boolean, default: false },
  followerCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Sample users data
const sampleUsers = [
  {
    fullName: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    username: 'rajesh_kumar',
    password: 'password123',
    role: 'user',
    isVerified: true,
    followerCount: 1250
  },
  {
    fullName: 'Priya Sharma',
    email: 'priya@example.com',
    username: 'priya_sharma',
    password: 'password123',
    role: 'user',
    isVerified: true,
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
    isInfluencer: true,
    followerCount: 25680
  },
  {
    fullName: 'Raj Style Guru',
    email: 'raj@example.com',
    username: 'style_guru_raj',
    password: 'password123',
    role: 'user',
    isVerified: false,
    followerCount: 8930
  },
  {
    fullName: 'Admin User',
    email: 'admin@dfashion.com',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    isVerified: true,
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
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('User: rajesh@example.com / password123');
    console.log('Vendor: maya@example.com / password123');
    console.log('Admin: admin@dfashion.com / admin123');

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
