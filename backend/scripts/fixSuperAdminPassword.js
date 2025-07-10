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

async function fixSuperAdminPassword() {
  try {
    console.log('🔧 Fixing superadmin password...\n');
    
    const user = await User.findOne({ email: 'superadmin@dfashion.com' });
    if (!user) {
      console.log('❌ Superadmin user not found');
      return;
    }
    
    console.log('✅ Found superadmin user:', user.email);
    console.log('👤 Current username:', user.username);
    console.log('🔐 Current password hash:', user.password.substring(0, 20) + '...');
    
    // Create new password hash
    const newPassword = 'password123';
    console.log('\n🔧 Creating new password hash for:', newPassword);
    
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    console.log('🔐 New password hash:', newPasswordHash.substring(0, 20) + '...');
    
    // Test the new hash before saving
    const testMatch = await bcrypt.compare(newPassword, newPasswordHash);
    console.log('🧪 New hash test:', testMatch ? '✅ PASS' : '❌ FAIL');
    
    if (!testMatch) {
      console.log('❌ New hash failed test - aborting');
      return;
    }
    
    // Update the user's password directly in database to bypass pre-save hook
    await User.updateOne(
      { email: 'superadmin@dfashion.com' },
      { $set: { password: newPasswordHash } }
    );

    console.log('\n✅ Password updated successfully!');
    
    // Verify the update
    console.log('\n🔍 Verifying the update...');
    const updatedUser = await User.findOne({ email: 'superadmin@dfashion.com' });
    const verifyMatch = await updatedUser.comparePassword(newPassword);
    console.log('🔐 Verification test:', verifyMatch ? '✅ SUCCESS' : '❌ FAILED');
    
    if (verifyMatch) {
      console.log('\n🎉 Superadmin password successfully reset to: password123');
      console.log('📧 Email: superadmin@dfashion.com');
      console.log('🔑 Password: password123');
    } else {
      console.log('\n❌ Password update failed verification');
    }
    
  } catch (error) {
    console.error('❌ Error during password fix:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await fixSuperAdminPassword();
    console.log('\n✅ Password fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Password fix failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fixSuperAdminPassword, connectDatabase };
