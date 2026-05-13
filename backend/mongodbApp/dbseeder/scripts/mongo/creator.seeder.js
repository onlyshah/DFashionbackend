// Creator Seeder Script for PostgreSQL
// Usage: node scripts/creator.seeder.postgres.js

require('dotenv').config();
const { sequelize } = require('../config/sequelize');
const bcrypt = require('bcryptjs');

// Initialize models
const defineUser = require('../models_sql/User');
const User = defineUser(sequelize, require('sequelize').DataTypes);

const creatorData = [
  {
    username: 'creator_fashionista',
    email: 'fashionista@creators.com',
    password: 'Creator123!',
    fullName: 'Sarah Fashion',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_styleking',
    email: 'styleking@creators.com',
    password: 'Creator123!',
    fullName: 'Alex Style',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_trendqueen',
    email: 'trendqueen@creators.com',
    password: 'Creator123!',
    fullName: 'Emma Trends',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_designpro',
    email: 'designpro@creators.com',
    password: 'Creator123!',
    fullName: 'Chris Designer',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_vibemaster',
    email: 'vibemaster@creators.com',
    password: 'Creator123!',
    fullName: 'Maya Vibes',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_luxelook',
    email: 'luxelook@creators.com',
    password: 'Creator123!',
    fullName: 'Jordan Luxury',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_streetstyle',
    email: 'streetstyle@creators.com',
    password: 'Creator123!',
    fullName: 'Taylor Street',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_minimalist',
    email: 'minimalist@creators.com',
    password: 'Creator123!',
    fullName: 'Riley Minimal',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_boho',
    email: 'boho@creators.com',
    password: 'Creator123!',
    fullName: 'Casey Boho',
    role: 'creator',
    isActive: true
  },
  {
    username: 'creator_vintage',
    email: 'vintage@creators.com',
    password: 'Creator123!',
    fullName: 'Morgan Vintage',
    role: 'creator',
    isActive: true
  }
];

async function seedCreators() {
  try {
    console.log('🌱 Starting Creator Seeding for PostgreSQL...');
    
    // Authenticate Sequelize connection
    await sequelize.authenticate();
    console.log('✅ Sequelize authenticated');

    if (!User) {
      throw new Error('User model not initialized');
    }

    // Check if creators already exist
    const existingCreators = await User.count({ where: { role: 'creator' } });
    console.log(`📊 Existing creators in database: ${existingCreators}`);

    if (existingCreators > 0) {
      console.log('✅ Creators already exist. Skipping seeding.');
      await sequelize.close();
      process.exit(0);
    }

    // Hash passwords and create creators
    console.log(`📝 Creating ${creatorData.length} creator records...`);
    
    const creatorRecords = await Promise.all(
      creatorData.map(async (creator) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(creator.password, salt);
        return {
          ...creator,
          password: hashedPassword
        };
      })
    );

    // Bulk insert creators
    const createdCreators = await User.bulkCreate(creatorRecords);
    
    console.log(`✅ Successfully created ${createdCreators.length} creators:`);
    createdCreators.forEach((creator) => {
      console.log(`   • ${creator.username} (${creator.email})`);
    });

    // Verify insertion
    const count = await User.count({ where: { role: 'creator' } });
    console.log(`\n📊 Total creators in database: ${count}`);

    await sequelize.close();
    console.log('✨ Creator seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding creators:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run seeder
seedCreators();
