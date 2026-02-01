// Audit Log Seeder Script - MongoDB
// Seeds initial audit logs for system tracking
// Usage: node scripts/audit-log.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping audit-log.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

const AUDIT_LOGS_DATA = [
  {
    userId: null, // Will be filled from actual user
    action: 'SYSTEM_INIT',
    module: 'system',
    entityType: 'System',
    entityId: 'system',
    description: 'System initialized',
    changes: { status: 'initialized' },
    ipAddress: '127.0.0.1',
    userAgent: 'System',
    status: 'success',
    severity: 'info',
    timestamp: new Date()
  },
  {
    userId: null,
    action: 'DATABASE_MIGRATION',
    module: 'database',
    entityType: 'Database',
    entityId: 'dfashion',
    description: 'Database migration completed',
    changes: { version: '1.0' },
    ipAddress: '127.0.0.1',
    userAgent: 'System',
    status: 'success',
    severity: 'info',
    timestamp: new Date()
  },
  {
    userId: null,
    action: 'SEED_DATA_LOADED',
    module: 'system',
    entityType: 'System',
    entityId: 'system',
    description: 'Seed data loaded successfully',
    changes: { dataCount: 100 },
    ipAddress: '127.0.0.1',
    userAgent: 'System',
    status: 'success',
    severity: 'info',
    timestamp: new Date()
  }
];

async function seedAuditLogs() {
  try {
    console.log('🚀 Starting Audit Log Seeder...\n');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a real user for userId reference
    const user = await User.findOne();
    if (user) {
      AUDIT_LOGS_DATA.forEach(log => {
        log.userId = user._id;
      });
    }

    const existing = await AuditLog.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing audit logs. Clearing...\n`);
      await AuditLog.deleteMany({});
    }

    console.log('📝 Seeding audit logs...');
    let seededCount = 0;
    for (const logData of AUDIT_LOGS_DATA) {
      const log = await AuditLog.create(logData);
      console.log(`  ✓ Created audit log: ${log.action}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} audit logs\n`);
    console.log('═'.repeat(50));
    console.log('AUDIT LOG SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Actions:');
    AUDIT_LOGS_DATA.forEach(log => console.log(`  • ${log.action} - ${log.module}`));
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Audit Log Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedAuditLogs();
