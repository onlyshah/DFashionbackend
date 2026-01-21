// Creators Seeder for Postgres
// Usage: node scripts/creators.seeder.postgres.js

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping creators.seeder.postgres - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'dfashion',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

// Define User model for seeding
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fullName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  role: {
    type: DataTypes.STRING(100),
    defaultValue: 'customer'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, { tableName: 'users', timestamps: true });

// Creator seed data
const CREATORS_DATA = [
  {
    username: 'fashionista_emma',
    email: 'emma@creators.com',
    fullName: 'Emma Johnson',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'style_guru_alex',
    email: 'alex@creators.com',
    fullName: 'Alexander Smith',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'trend_setter_sarah',
    email: 'sarah@creators.com',
    fullName: 'Sarah Williams',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'chic_lifestyle_mike',
    email: 'mike@creators.com',
    fullName: 'Michael Brown',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'minimalist_jane',
    email: 'jane@creators.com',
    fullName: 'Jane Davis',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'urban_fashion_joe',
    email: 'joe@creators.com',
    fullName: 'Joseph Martinez',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'luxury_style_kate',
    email: 'kate@creators.com',
    fullName: 'Katherine Garcia',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'casual_chic_tom',
    email: 'tom@creators.com',
    fullName: 'Thomas Wilson',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'boho_vibes_lisa',
    email: 'lisa@creators.com',
    fullName: 'Lisa Anderson',
    password: 'CreatorPass123!',
    isActive: true
  },
  {
    username: 'streetwear_mark',
    email: 'mark@creators.com',
    fullName: 'Mark Taylor',
    password: 'CreatorPass123!',
    isActive: true
  }
];

async function seedCreators() {
  try {
    console.log('🌱 Starting creators seeding for PostgreSQL...\n');

    // Authenticate sequelize connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Hash passwords
    const creatorsToInsert = await Promise.all(
      CREATORS_DATA.map(async (creator) => {
        const hashedPassword = await bcrypt.hash(creator.password, 10);
        return {
          username: creator.username,
          email: creator.email,
          password: hashedPassword,
          fullName: creator.fullName,
          role: 'creator',
          isActive: creator.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      })
    );

    // Insert creators
    let insertedCount = 0;
    for (const creator of creatorsToInsert) {
      try {
        const existingUser = await User.findOne({
          where: { email: creator.email }
        });

        if (existingUser) {
          console.log(`⏭️  Skipping ${creator.username} - already exists`);
        } else {
          await User.create(creator);
          insertedCount++;
          console.log(`✅ Created creator: ${creator.username} (${creator.fullName})`);
        }
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
          console.log(`⏭️  Skipping ${creator.username} - duplicate entry`);
        } else {
          console.error(`❌ Error creating ${creator.username}:`, err.message);
        }
      }
    }

    // Verify seeding
    const totalCreators = await User.count({
      where: { role: 'creator' }
    });

    console.log(`\n📊 Seeding Summary:`);
    console.log(`   - Inserted: ${insertedCount} new creators`);
    console.log(`   - Total creators in DB: ${totalCreators}`);
    console.log(`\n✅ Creators seeding completed successfully!\n`);

    // Display all creators
    const allCreators = await User.findAll({
      where: { role: 'creator' },
      attributes: ['id', 'username', 'email', 'fullName', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log('📋 All Creators:');
    allCreators.forEach((creator, index) => {
      console.log(`   ${index + 1}. ${creator.username} - ${creator.fullName} (${creator.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run seeder
seedCreators();
