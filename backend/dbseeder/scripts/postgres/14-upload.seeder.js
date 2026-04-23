/**
 * 📦 Upload Seeder (Phase 1 - Root Model)
 * Seeds the uploads table
 * No dependencies
 */

const models = require('../../../models_sql');
const path = require('path');
const { createFashionArtwork } = require('../../utils/image-utils');

const logoUploadPath = createFashionArtwork('brands', 'DFashion logo', 1, { subtitle: 'Fashion marketplace' });
const bannerUploadPath = createFashionArtwork('posts', 'Homepage banner', 1, { subtitle: 'Fresh fashion drops' });

const uploadData = [
  {
    uploadPath: logoUploadPath,
    fileName: path.basename(logoUploadPath),
    fileType: 'image/svg+xml',
    fileSize: 18432,
    uploadStatus: 'completed',
    uploadedAt: new Date(),
    isActive: true
  },
  {
    uploadPath: bannerUploadPath,
    fileName: path.basename(bannerUploadPath),
    fileType: 'image/svg+xml',
    fileSize: 24810,
    uploadStatus: 'completed',
    uploadedAt: new Date(),
    isActive: true
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
