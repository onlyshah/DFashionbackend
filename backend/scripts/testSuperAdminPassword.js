const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Load environment variables
require('dotenv').config();

async function connectDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dfashion';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function testSuperAdminPassword() {
  try {
    console.log('🔍 Testing superadmin password...\n');
    
    const user = await User.findOne({ email: 'superadmin@dfashion.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('👤 Username:', user.username);
    console.log('🔐 Password hash exists:', !!user.password);
    console.log('🔐 Hash length:', user.password ? user.password.length : 0);
    console.log('🔐 Hash preview:', user.password ? user.password.substring(0, 20) + '...' : 'N/A');
    
    // Test password comparison
    const testPassword = 'password123';
    console.log('\n🧪 Testing password:', testPassword);
    
    try {
      const isMatch = await user.comparePassword(testPassword);
      console.log('🔐 Password match result:', isMatch);
      
      // Also test direct bcrypt comparison
      const directMatch = await bcrypt.compare(testPassword, user.password);
      console.log('🔐 Direct bcrypt match:', directMatch);
      
      if (!isMatch) {
        console.log('\n❌ Password does not match - investigating...');
        console.log('🔐 Hash format check:');
        console.log('   - Starts with $2:', user.password.startsWith('$2'));
        console.log('   - Hash length:', user.password.length);
        console.log('   - Expected length: 60');
        
        // Try to create a new hash with the same password
        console.log('\n🔧 Creating new hash for comparison...');
        const newHash = await bcrypt.hash(testPassword, 12);
        console.log('🔐 New hash:', newHash.substring(0, 20) + '...');
        const newHashMatch = await bcrypt.compare(testPassword, newHash);
        console.log('🔐 New hash matches:', newHashMatch);
      } else {
        console.log('\n✅ Password matches correctly!');
      }
    } catch (error) {
      console.error('❌ Error during password test:', error);
    }
    
    // Test other users for comparison
    console.log('\n🔍 Testing other users for comparison...');
    const customerUser = await User.findOne({ email: 'priya@example.com' });
    if (customerUser) {
      console.log('👤 Customer user found:', customerUser.email);
      const customerMatch = await customerUser.comparePassword('password123');
      console.log('🔐 Customer password match:', customerMatch);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await testSuperAdminPassword();
    console.log('\n✅ Password test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Password test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testSuperAdminPassword, connectDatabase };
