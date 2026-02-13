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
    if (!admin) throw new Error('Admin user not found');

    const count = await AuditLog.count();
    if (count > 0) {
      console.log(`✅ AuditLog data already exists (${count} records)`);
      return true;
    }

    const logs = [
      { action: 'login', entity: 'user', details: 'Admin login' },
      { action: 'create', entity: 'product', details: 'Created new product' },
      { action: 'update', entity: 'order', details: 'Updated order status' },
      { action: 'delete', entity: 'coupon', details: 'Deleted expired coupon' }
    ];

    for (const log of logs) {
      await AuditLog.create({
        actorUserId: admin.id,
        action: log.action,
        entity: log.entity,
        entityId: null,
        details: log.details,
        changes: JSON.stringify({}),
        timestamp: new Date()
      });

      console.log(`✅ Created audit log: ${log.action} on ${log.entity}`);
    }

    console.log(`✨ AuditLog seeding completed (${logs.length} new logs)\n`);
    return true;
  } catch (error) {
    console.error('❌ AuditLog seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedAuditLogs };
