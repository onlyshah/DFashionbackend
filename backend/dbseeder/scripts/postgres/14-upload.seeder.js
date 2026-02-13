/**
 * 📦 Upload Seeder (Phase 1 - Root Model)
 * Seeds the uploads table
 * No dependencies
 */

const models = require('../../../models_sql');

const uploadData = [
  {
    fileName: 'logo.png',
    fileUrl: 'https://cdn.example.com/uploads/logo.png',
    fileType: 'image/png',
    fileSize: 102400,
    uploadedBy: 'system',
    isPublic: true
  },
  {
    fileName: 'banner.jpg',
    fileUrl: 'https://cdn.example.com/uploads/banner.jpg',
    fileType: 'image/jpeg',
    fileSize: 256000,
    uploadedBy: 'system',
    isPublic: true
  }
];

async function seedUploads() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Upload seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Upload = models._raw?.Upload || models.Upload;
    if (!Upload || !Upload.create) {
      throw new Error('Upload model not available');
    }

    let createdCount = 0;
    const count = await Upload.count();
    
    if (count > 0) {
      console.log(`✅ Upload data already exists (${count} records)`);
      return true;
    }

    for (const upload of uploadData) {
      await Upload.create(upload);
      console.log(`✅ Created upload: ${upload.fileName}`);
      createdCount++;
    }

    console.log(`✨ Upload seeding completed (${createdCount} new uploads)\n`);
    return true;
  } catch (error) {
    console.error('❌ Upload seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedUploads };
