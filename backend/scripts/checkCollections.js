const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollections() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Get database instance
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    console.log('📊 Database Collections Status:\n');
    console.log('='.repeat(60));
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();
      
      const status = count > 0 ? '✅' : '❌';
      const padding = ' '.repeat(Math.max(0, 20 - collectionName.length));
      
      console.log(`${status} ${collectionName}${padding} | ${count} documents`);
    }
    
    console.log('='.repeat(60));
    
    // Summary
    const totalCollections = collections.length;
    const populatedCollections = [];
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      if (count > 0) {
        populatedCollections.push({
          name: collection.name,
          count: count
        });
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total Collections: ${totalCollections}`);
    console.log(`   Populated Collections: ${populatedCollections.length}`);
    console.log(`   Empty Collections: ${totalCollections - populatedCollections.length}`);
    
    if (populatedCollections.length > 0) {
      console.log(`\n🎯 Populated Collections Details:`);
      populatedCollections.forEach(col => {
        console.log(`   • ${col.name}: ${col.count} documents`);
      });
    }
    
    // Check specific collections mentioned in the request
    const requiredCollections = [
      'notification', 'payment', 'reel', 'roles', 'searchhistories', 
      'searchsuggestions', 'stories', 'userbehaviors', 'users', 
      'products', 'categories', 'orders', 'posts', 'carts', 'wishlists'
    ];
    
    console.log(`\n🔍 Required Collections Check:`);
    for (const reqCol of requiredCollections) {
      const exists = collections.find(col => col.name === reqCol || col.name === reqCol + 's');
      if (exists) {
        const count = await db.collection(exists.name).countDocuments();
        const status = count > 0 ? '✅' : '⚠️ ';
        console.log(`   ${status} ${exists.name}: ${count} documents`);
      } else {
        console.log(`   ❌ ${reqCol}: Collection not found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the check
checkCollections();
