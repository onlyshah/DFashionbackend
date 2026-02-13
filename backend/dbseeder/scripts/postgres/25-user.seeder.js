/**
 * 👤 User Seeder (Phase 2 - Tier 1)
 * Depends on: Role, Department
 * Creates system users with various roles
 */

const bcrypt = require('bcryptjs');
const models = require('../../../models_sql');

async function seedUsers() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting User seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const User = models._raw?.User || models.User;
    const Role = models._raw?.Role || models.Role;
    const Department = models._raw?.Department || models.Department;

    if (!User || !User.create) throw new Error('User model not available');
    if (!Role || !Role.findOne) throw new Error('Role model not available');
    if (!Department || !Department.findOne) throw new Error('Department model not available');

    // Get default roles
    const superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    const userRole = await Role.findOne({ where: { name: 'user' } });
    const sellerRole = await Role.findOne({ where: { name: 'seller' } });

    if (!superAdminRole || !adminRole || !userRole || !sellerRole) {
      throw new Error('Required roles not found. Ensure Role seeder ran first.');
    }

    // Get departments
    const engDept = await Department.findOne({ where: { name: 'Engineering' } });
    const salesDept = await Department.findOne({ where: { name: 'Sales' } });

    const userData = [
      {
        username: 'superadmin',
        email: 'superadmin@example.com',
        passwordHash: bcrypt.hashSync('Admin@123', 12),
        firstName: 'Super',
        lastName: 'Admin',
        roleId: superAdminRole.id,
        departmentId: engDept?.id || null,
        phone: '+91-9999999999',
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        twoFactorEnabled: false,
        loginAttempts: 0
      },
      {
        username: 'admin1',
        email: 'admin@example.com',
        passwordHash: bcrypt.hashSync('Admin@123', 12),
        firstName: 'Admin',
        lastName: 'User',
        roleId: adminRole.id,
        departmentId: engDept?.id || null,
        phone: '+91-9888888888',
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        twoFactorEnabled: false,
        loginAttempts: 0
      },
      {
        username: 'seller1',
        email: 'seller1@example.com',
        passwordHash: bcrypt.hashSync('Seller@123', 12),
        firstName: 'Seller',
        lastName: 'One',
        roleId: sellerRole.id,
        departmentId: salesDept?.id || null,
        phone: '+91-9777777777',
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        twoFactorEnabled: false,
        loginAttempts: 0
      },
      {
        username: 'customer1',
        email: 'customer1@example.com',
        passwordHash: bcrypt.hashSync('Customer@123', 12),
        firstName: 'John',
        lastName: 'Doe',
        roleId: userRole.id,
        departmentId: null,
        phone: '+91-9666666666',
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        twoFactorEnabled: false,
        loginAttempts: 0
      },
      {
        username: 'customer2',
        email: 'customer2@example.com',
        passwordHash: bcrypt.hashSync('Customer@123', 12),
        firstName: 'Jane',
        lastName: 'Smith',
        roleId: userRole.id,
        departmentId: null,
        phone: '+91-9555555555',
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        twoFactorEnabled: false,
        loginAttempts: 0
      }
    ];

    let createdCount = 0;
    for (const user of userData) {
      const existing = await User.findOne({
        where: { email: user.email }
      });

      if (existing) {
        console.log(`✅ User '${user.email}' already exists (skipping)`);
        continue;
      }

      await User.create(user);
      console.log(`✅ Created user: ${user.email}`);
      createdCount++;
    }

    console.log(`✨ User seeding completed (${createdCount} new users)\n`);
    return true;
  } catch (error) {
    console.error('❌ User seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedUsers };
