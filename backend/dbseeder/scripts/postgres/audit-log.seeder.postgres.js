// Audit Log Seeder Script - PostgreSQL
// Seeds initial audit logs for system tracking
// Usage: node scripts/audit-log.seeder.postgres.js

require('dotenv').config();
const { sequelize } = require('../config/sequelize');
const { _raw: models } = require('../models_sql');
const AuditLog = models.AuditLog;
const User = models.User;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping audit-log.seeder.postgres - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const AUDIT_LOGS_DATA = [
  {
    user_id: null,
    action: 'SYSTEM_INIT',
    module: 'system',
    entity_type: 'System',
    entity_id: 'system',
    description: 'System initialized',
    changes: { status: 'initialized' },
    ip_address: '127.0.0.1',
    user_agent: 'System',
    status: 'success',
    severity: 'info'
  },
  {
    user_id: null,
    action: 'DATABASE_MIGRATION',
    module: 'database',
    entity_type: 'Database',
    entity_id: 'dfashion',
    description: 'Database migration completed',
    changes: { version: '1.0' },
    ip_address: '127.0.0.1',
    user_agent: 'System',
    status: 'success',
    severity: 'info'
  },
  {
    user_id: null,
    action: 'SEED_DATA_LOADED',
    module: 'system',
    entity_type: 'System',
    entity_id: 'system',
    description: 'Seed data loaded successfully',
    changes: { dataCount: 100 },
    ip_address: '127.0.0.1',
    user_agent: 'System',
    status: 'success',
    severity: 'info'
  }
];

async function seedAuditLogs() {
  try {
    console.log('🚀 Starting PostgreSQL Audit Log Seeder...\n');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Get a real user for user_id reference
    const user = await User.findOne();
    if (user) {
      AUDIT_LOGS_DATA.forEach(log => {
        log.user_id = user.id;
      });
    }

    const existing = await AuditLog.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing audit logs. Clearing...\n`);
      await AuditLog.destroy({ where: {} });
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

    process.exit(0);
  } catch (error) {
    console.error('❌ Audit Log Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedAuditLogs();
