const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Load environment variables
require('dotenv').config();

async function connectDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function createVendorUser() {
  try {
    console.log('🏪 Creating Vendor User...\n');

    // Check if vendor user already exists
    const existingVendor = await User.findOne({ role: 'vendor' });
    if (existingVendor) {
      console.log('✅ Vendor user already exists:');
      console.log(`   Username: ${existingVendor.username}`);
      console.log(`   Email: ${existingVendor.email}`);
      return existingVendor;
    }

    // Check if email is already taken
    const emailExists = await User.findOne({ email: 'vendor@dfashion.com' });
    if (emailExists) {
      console.log('⚠️ Email vendor@dfashion.com already exists, updating role to vendor...');
      emailExists.role = 'vendor';
      emailExists.department = 'vendor_management';
      await emailExists.save();
      console.log('✅ Updated existing user to vendor role');
      return emailExists;
    }

    // Create new vendor user
    const plainPassword = 'password123';
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const vendorUserData = {
      username: 'vendor_user',
      email: 'vendor@dfashion.com',
      password: hashedPassword,
      fullName: 'Fashion Vendor',
      role: 'vendor',
      department: 'vendor_management',
      isActive: true,
      isVerified: true,
      phone: '+91 9000000013',
      bio: 'Product Vendor and Seller',
      avatar: 'https://ui-avatars.com/api/?name=Fashion+Vendor&background=random',
      address: {
        street: 'Vendor Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      },
      socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
    };

    const newVendor = await User.create(vendorUserData);
    
    console.log('✅ Created vendor user:');
    console.log(`   Username: ${newVendor.username}`);
    console.log(`   Email: ${newVendor.email}`);
    console.log(`   Full Name: ${newVendor.fullName}`);
    console.log(`   Role: ${newVendor.role}`);
    console.log(`   Department: ${newVendor.department}`);
    
    return newVendor;

  } catch (error) {
    console.error('❌ Error creating vendor user:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await createVendorUser();
    
    console.log('\n✅ Vendor user creation completed!');
    console.log('🔑 Login: vendor@dfashion.com / password123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Vendor user creation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createVendorUser, connectDatabase };
