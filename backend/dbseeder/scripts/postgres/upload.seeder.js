// Upload Seeder Script - PostgreSQL
// Seeds file upload records and metadata
// Usage: node scripts/upload.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let Upload;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping upload.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

let sequelize;

const UPLOADS_DATA = [
  { file_name: 'product-image-1.jpg', file_size: 2048576, file_type: 'image/jpeg', upload_path: '/uploads/products', upload_status: 'completed', uploaded_at: new Date(Date.now() - 30*24*60*60*1000), is_active: true },
  { file_name: 'product-image-2.jpg', file_size: 1835008, file_type: 'image/jpeg', upload_path: '/uploads/products', upload_status: 'completed', uploaded_at: new Date(Date.now() - 25*24*60*60*1000), is_active: true },
  { file_name: 'bulk-import.csv', file_size: 524288, file_type: 'text/csv', upload_path: '/uploads/imports', upload_status: 'completed', uploaded_at: new Date(Date.now() - 15*24*60*60*1000), is_active: true },
  { file_name: 'brand-logo.png', file_size: 512000, file_type: 'image/png', upload_path: '/uploads/brands', upload_status: 'completed', uploaded_at: new Date(Date.now() - 10*24*60*60*1000), is_active: true },
  { file_name: 'catalog-backup.zip', file_size: 10485760, file_type: 'application/zip', upload_path: '/uploads/backups', upload_status: 'completed', uploaded_at: new Date(Date.now() - 5*24*60*60*1000), is_active: true }
];

async function seedUploads() {
  try {
    console.log('🚀 Starting PostgreSQL Upload Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    Upload = modelsModule._raw.Upload;
    if (!Upload) throw new Error('Upload model not initialized');

    const existing = await Upload.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing upload records. Clearing...\n`);
      await Upload.destroy({ where: {} });
    }

    console.log('📝 Seeding upload records...');
    let seededCount = 0;
    for (const uploadData of UPLOADS_DATA) {
      const upload = await Upload.create(uploadData);
      console.log(`  ✓ Created upload record: ${upload.file_name}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} upload records\n`);
    console.log('═'.repeat(50));
    console.log('UPLOAD SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Upload Records:');
    UPLOADS_DATA.forEach(u => console.log(`  • ${u.file_name} (${u.file_size} bytes)`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Upload Seeding failed:', error.message);
    process.exit(1);
  }
}

seedUploads();
