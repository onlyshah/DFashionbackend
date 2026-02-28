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

    const User = models._raw?.User || models.User;
    if (!User || !User.findOne) throw new Error('User model not available');

    const admin = await User.findOne({ where: { username: 'admin1' } });
    if (!admin) throw new Error('Admin user not found');

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });

    await client.connect();

    // Check if audit logs already exist
    const countRes = await client.query('SELECT COUNT(*) FROM audit_logs');
    const existingCount = parseInt(countRes.rows[0].count || 0);
    
    if (existingCount > 0) {
      console.log(`✅ AuditLog data already exists (${existingCount} records)`);
      await client.end();
      return true;
    }

    // Sample audit log data with correct schema
    const logs = [
      {
        action: 'login',
        resource_type: 'auth',
        details: 'Admin login'
      },
      {
        action: 'create',
        resource_type: 'product',
        details: 'Created new product'
      },
      {
        action: 'update',
        resource_type: 'order',
        details: 'Updated order status'
      },
      {
        action: 'delete',
        resource_type: 'coupon',
        details: 'Deleted expired coupon'
      },
      {
        action: 'approve',
        resource_type: 'seller',
        details: 'Approved seller account'
      }
    ];

    let createdCount = 0;
    for (const log of logs) {
      try {
        await client.query(
          `INSERT INTO audit_logs 
           (actor_user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            admin.id,
            log.action,
            log.resource_type,
            null,
            JSON.stringify({ description: log.details }),
            null,
            '127.0.0.1',
            'System Seeder'
          ]
        );
        console.log(`✅ Created audit log: ${log.action} on ${log.resource_type}`);
        createdCount++;
      } catch (insertError) {
        console.warn(`⚠️  Failed to insert audit log (${log.action}):`, insertError.message);
      }
    }

    await client.end();

    console.log(`✨ AuditLog seeding completed (${createdCount} new logs)\n`);
    return true;
  } catch (error) {
    console.error('❌ AuditLog seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedAuditLogs };
