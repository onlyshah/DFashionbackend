const mongoose = require('mongoose');
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

async function fixPasswords() {
  try {
    console.log('🔧 Starting password fix...\n');

    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to fix\n`);

    for (const user of users) {
      console.log(`🔧 Fixing password for: ${user.email}`);
      
      // Set plain text password - the pre-save middleware will hash it correctly
      user.password = 'password123';
      
      // Save the user - this will trigger the pre-save middleware to hash the password
      await user.save();
      
      console.log(`✅ Fixed password for: ${user.email}`);
    }

    console.log('\n🎉 All passwords fixed successfully!');
    console.log('\n🔗 You can now login with:');
    console.log('   • Email: rajesh@example.com');
    console.log('   • Password: password123');
    console.log('   • (Same password for all users)');

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDatabase();
    await fixPasswords();
  } catch (error) {
    console.error('❌ Password fix failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the password fix
main();
