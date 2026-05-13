require('dotenv').config();

const mongoose = require('mongoose');

// MongoDB Connection
const connectDB = async () => {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    
    const conn = await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (process.env.DB_TYPE === 'postgres') {
      console.log('ℹ️  Falling back to PostgreSQL...');
      return null;
    }
    process.exit(1);
  }
};

module.exports = { connectDB };
