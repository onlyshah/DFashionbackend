const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection Configuration
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connection options (updated for modern MongoDB driver)
    const options = {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000
    };

    // Use local MongoDB only
    let mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dfashion';

    console.log('📡 Connecting to MongoDB...');
    console.log(`🔗 URI: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}`);

    await mongoose.connect(mongoURI, options);
    console.log('✅ Connected to MongoDB successfully!');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    console.log(`🔗 Connection: Local MongoDB`);

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during MongoDB disconnection:', error);
        process.exit(1);
      }
    });

    return mongoose.connection;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Log specific connection errors
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Possible solutions:');
      console.error('   1. Make sure MongoDB is running locally');
      console.error('   2. Check if MongoDB service is started');
      console.error('   3. Start MongoDB with: mongod --dbpath /data/db');
      console.error('   4. Verify connection string: mongodb://127.0.0.1:27017/dfashion');
    }
    
    // For development, continue without database but log the issue
    console.error('❌ Database connection failed - continuing without database for testing');
    console.error('💡 To fix this:');
    console.error('   1. Install MongoDB: https://www.mongodb.com/try/download/community');
    console.error('   2. Start MongoDB service');
    console.error('   3. Or use MongoDB Atlas cloud database');

    // Return a mock connection for testing
    return {
      readyState: 0,
      name: 'disconnected',
      host: 'localhost',
      port: 27017
    };
  }
};

// Database health check
const checkDBHealth = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        readyState: mongoose.connection.readyState
      };
    } else {
      return {
        status: 'disconnected',
        readyState: mongoose.connection.readyState
      };
    }
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      readyState: mongoose.connection.readyState
    };
  }
};

// Get database statistics
const getDBStats = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      return {
        database: mongoose.connection.name,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        objects: stats.objects
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting DB stats:', error);
    return null;
  }
};

// Initialize database indexes
const initializeIndexes = async () => {
  try {
    console.log('🔍 Initializing database indexes...');
    
    // User indexes
    if (mongoose.models.User) {
      await mongoose.models.User.createIndexes();
    }
    
    // Product indexes
    if (mongoose.models.Product) {
      await mongoose.models.Product.createIndexes();
    }
    
    // Order indexes
    if (mongoose.models.Order) {
      await mongoose.models.Order.createIndexes();
    }
    
    console.log('✅ Database indexes initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing indexes:', error);
  }
};

module.exports = {
  connectDB,
  checkDBHealth,
  getDBStats,
  initializeIndexes,
  mongoose
};
