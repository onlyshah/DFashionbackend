/**
 * 📋 AuditLog Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedAuditLogs() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting AuditLog seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const AuditLog = models._raw?.AuditLog || models.AuditLog;
    const User = models._raw?.User || models.User;
    
    if (!AuditLog || !AuditLog.create) throw new Error('AuditLog model not available');
    if (!User || !User.findOne) throw new Error('User model not available');

    const admin = await User.findOne({ where: { username: 'admin1' } });
    if (!admin) {
      console.log(`⚠️  Admin user 'admin1' not found. Skipping audit log seeding.`);
      return true;
    }

    // Check if audit logs already exist
    const count = await AuditLog.count();
    if (count > 0) {
      console.log(`✅ AuditLog data already exists (${count} records)`);
      return true;
    }

    // Sample audit log data
    const logs = [
      {
        actorUserId: admin.id,
        action: 'login',
        resourceType: 'auth',
        resourceId: null,
        oldValues: null,
        newValues: { timestamp: new Date().toISOString() },
        ipAddress: '127.0.0.1',
        userAgent: 'System Seeder'
      },
      {
        actorUserId: admin.id,
        action: 'create',
        resourceType: 'product',
        resourceId: null,
        oldValues: null,
        newValues: { name: 'New Product', sku: 'TEST-001' },
        ipAddress: '127.0.0.1',
        userAgent: 'System Seeder'
      },
      {
        actorUserId: admin.id,
        action: 'update',
        resourceType: 'order',
        resourceId: null,
        oldValues: { status: 'pending' },
        newValues: { status: 'processing' },
        ipAddress: '127.0.0.1',
        userAgent: 'System Seeder'
      },
      {
        actorUserId: admin.id,
        action: 'delete',
        resourceType: 'coupon',
        resourceId: null,
        oldValues: { code: 'EXPIRED20' },
        newValues: null,
        ipAddress: '127.0.0.1',
        userAgent: 'System Seeder'
      },
      {
        actorUserId: admin.id,
        action: 'approve',
        resourceType: 'seller',
        resourceId: null,
        oldValues: { status: 'pending_approval' },
        newValues: { status: 'approved' },
        ipAddress: '127.0.0.1',
        userAgent: 'System Seeder'
      }
    ];

    let createdCount = 0;
    for (const log of logs) {
      try {
        await AuditLog.create(log);
        console.log(`✅ Created audit log: ${log.action} on ${log.resourceType}`);
        createdCount++;
      } catch (insertError) {
        console.warn(`⚠️  Failed to insert audit log (${log.action}):`, insertError.message);
      }
    }

    console.log(`✨ AuditLog seeding completed (${createdCount} new logs)\n`);
    return true;
  } catch (error) {
    console.error('❌ AuditLog seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedAuditLogs };
