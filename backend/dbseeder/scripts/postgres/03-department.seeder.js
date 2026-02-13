/**
 * 🏢 Department Seeder (Phase 1 - Root Model)
 * Seeds the departments table
 * No dependencies
 */

const models = require('../../../models_sql');

const departmentData = [
  { name: 'Engineering', description: 'Product development and technical team' },
  { name: 'Marketing', description: 'Marketing and brand management' },
  { name: 'Sales', description: 'Sales and business development' },
  { name: 'Human Resources', description: 'HR and recruitment' },
  { name: 'Finance', description: 'Accounting and financial management' },
  { name: 'Operations', description: 'Business operations and logistics' },
  { name: 'Customer Support', description: 'Customer service and support' },
  { name: 'Quality Assurance', description: 'QA and testing' }
];

async function seedDepartments() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Department seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Department = models._raw?.Department || models.Department;
    if (!Department || !Department.create) {
      throw new Error('Department model not available');
    }

    let createdCount = 0;
    for (const dept of departmentData) {
      const existing = await Department.findOne({
        where: { name: dept.name }
      });

      if (existing) {
        console.log(`✅ Department '${dept.name}' already exists (skipping)`);
        continue;
      }

      await Department.create(dept);
      console.log(`✅ Created department: ${dept.name}`);
      createdCount++;
    }

    console.log(`✨ Department seeding completed (${createdCount} new departments)\n`);
    return true;
  } catch (error) {
    console.error('❌ Department seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedDepartments };
