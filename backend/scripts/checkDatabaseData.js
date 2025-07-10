const mongoose = require('mongoose');

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

async function checkDatabaseData() {
  try {
    console.log('🔍 Checking Database Data...\n');
    console.log('=' .repeat(60));
    console.log('   Database Content Verification');
    console.log('=' .repeat(60));
    console.log('');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections in database\n`);

    // Check each collection
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      const status = count > 0 ? '✅' : '❌';
      console.log(`${status} ${col.name}: ${count} documents`);
      
      // Show sample data for important collections
      if (count > 0 && ['users', 'roles', 'products', 'stories', 'reels'].includes(col.name)) {
        const sample = await mongoose.connection.db.collection(col.name).findOne();
        if (sample) {
          console.log(`   Sample: ${sample.name || sample.username || sample.title || sample._id}`);
        }
      }
    }

    // Check specific models
    console.log('\n🔍 Checking Model Availability:');
    console.log('-' .repeat(40));

    const models = ['User', 'Role', 'Product', 'Story', 'Reel', 'Order'];
    for (const modelName of models) {
      try {
        const Model = require(`../models/${modelName}`);
        const count = await Model.countDocuments();
        const status = count > 0 ? '✅' : '⚠️';
        console.log(`${status} ${modelName}: ${count} records`);
      } catch (error) {
        console.log(`❌ ${modelName}: Model not available (${error.message})`);
      }
    }

    // Test API endpoints data availability
    console.log('\n🔍 API Data Readiness:');
    console.log('-' .repeat(40));

    try {
      const User = require('../models/User');
      const userCount = await User.countDocuments();
      console.log(`👥 Users: ${userCount} (${userCount > 0 ? 'Ready for auth' : 'Need seeding'})`);
      
      if (userCount > 0) {
        const customerCount = await User.countDocuments({ role: 'customer' });
        const adminCount = await User.countDocuments({ role: { $in: ['admin', 'super_admin'] } });
        console.log(`   - Customers: ${customerCount}`);
        console.log(`   - Admins: ${adminCount}`);
      }
    } catch (error) {
      console.log(`❌ User model check failed: ${error.message}`);
    }

    try {
      const Product = require('../models/Product');
      const productCount = await Product.countDocuments();
      console.log(`🛍️ Products: ${productCount} (${productCount > 0 ? 'Ready for e-commerce' : 'Need seeding'})`);
    } catch (error) {
      console.log(`❌ Product model check failed: ${error.message}`);
    }

    try {
      const Story = require('../models/Story');
      const storyCount = await Story.countDocuments();
      console.log(`📖 Stories: ${storyCount} (${storyCount > 0 ? 'Ready for social features' : 'Need seeding'})`);
    } catch (error) {
      console.log(`❌ Story model check failed: ${error.message}`);
    }

    try {
      const Reel = require('../models/Reel');
      const reelCount = await Reel.countDocuments();
      console.log(`🎬 Reels: ${reelCount} (${reelCount > 0 ? 'Ready for video content' : 'Need seeding'})`);
    } catch (error) {
      console.log(`❌ Reel model check failed: ${error.message}`);
    }

    // Summary
    console.log('\n📋 DATABASE READINESS SUMMARY:');
    console.log('=' .repeat(60));
    
    const totalCollections = collections.length;
    const nonEmptyCollections = collections.filter(async col => {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      return count > 0;
    }).length;

    console.log(`Total Collections: ${totalCollections}`);
    console.log(`Collections with Data: ${nonEmptyCollections}`);
    
    if (totalCollections === 0) {
      console.log('❌ Database is empty - Run seeders to populate data');
      console.log('💡 Run: npm run seed:real');
    } else if (nonEmptyCollections < totalCollections) {
      console.log('⚠️ Some collections are empty - Consider running seeders');
      console.log('💡 Run: npm run seed:real');
    } else {
      console.log('✅ Database appears to be properly populated');
    }

  } catch (error) {
    console.error('❌ Error checking database data:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await checkDatabaseData();
    console.log('\n✅ Database check completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkDatabaseData, connectDatabase };
