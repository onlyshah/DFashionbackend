// Department Seeder Script - PostgreSQL
// Seeds department and organizational structure data
// Usage: node scripts/department.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let Department;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping department.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const DEPARTMENTS_DATA = [
  { name: 'Sales', description: 'Sales and customer acquisition', manager: 'John Doe', head_count: 25, budget: 500000, is_active: true, created_at: new Date(Date.now() - 365*24*60*60*1000) },
  { name: 'Marketing', description: 'Marketing and brand management', manager: 'Jane Smith', head_count: 15, budget: 300000, is_active: true, created_at: new Date(Date.now() - 365*24*60*60*1000) },
  { name: 'Engineering', description: 'Software development and infrastructure', manager: 'Bob Johnson', head_count: 35, budget: 700000, is_active: true, created_at: new Date(Date.now() - 365*24*60*60*1000) },
  { name: 'Operations', description: 'Business operations and logistics', manager: 'Alice Williams', head_count: 20, budget: 400000, is_active: true, created_at: new Date(Date.now() - 365*24*60*60*1000) },
  { name: 'Finance', description: 'Financial planning and accounting', manager: 'Charlie Brown', head_count: 12, budget: 250000, is_active: true, created_at: new Date(Date.now() - 365*24*60*60*1000) }
];

async function seedDepartments() {
  try {
    console.log('🚀 Starting PostgreSQL Department Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    Department = modelsModule._raw.Department;
    if (!Department) throw new Error('Department model not initialized');

    const existing = await Department.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing departments. Clearing...\n`);
      await Department.destroy({ where: {} });
    }

    console.log('📝 Seeding departments...');
    let seededCount = 0;
    for (const deptData of DEPARTMENTS_DATA) {
      const dept = await Department.create(deptData);
      console.log(`  ✓ Created department: ${dept.name}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} departments\n`);
    console.log('═'.repeat(50));
    console.log('DEPARTMENT SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Departments:');
    DEPARTMENTS_DATA.forEach(d => console.log(`  • ${d.name} (${d.head_count} members)`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Department Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDepartments();
