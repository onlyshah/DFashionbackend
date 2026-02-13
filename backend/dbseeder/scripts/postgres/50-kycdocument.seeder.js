/**
 * KYC DOCUMENTS SEEDER
 * Seeds KYC verification documents
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');

async function seedKYCDocuments() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting KYCDocument seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const KYCDocument = models._raw?.KYCDocument || models.KYCDocument;
    const User = models._raw?.User || models.User;

    if (!KYCDocument || !KYCDocument.create) throw new Error('KYCDocument model not available');

    const users = await User.findAll({ limit: 5 });

    if (users.length === 0) {
      console.log('⚠️  Skipping KYCDocument seeding - no users found');
      return true;
    }

    const count = await KYCDocument.count();
    if (count > 0) {
      console.log(`✅ KYCDocument data already exists (${count} records)`);
      return true;
    }

    const documents = [
      { type: 'aadhar', number: 'AADH1001', status: 'verified' },
      { type: 'pan', number: 'PANK1001', status: 'verified' },
      { type: 'driving_license', number: 'DL1001', status: 'pending' },
      { type: 'aadhar', number: 'AADH1002', status: 'rejected' },
      { type: 'passport', number: 'PP1001', status: 'pending' }
    ];

    const kycDocs = users.map((user, idx) => ({
      id: uuidv4(),
      userId: user.id,
      documentType: documents[idx % documents.length].type,
      documentNumber: documents[idx % documents.length].number,
      documentFile: '/uploads/kyc/doc_' + user.id + '.pdf',
      status: documents[idx % documents.length].status,
      verifiedAt: idx % 2 === 0 ? new Date() : null,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }));

    let createdCount = 0;
    for (const doc of kycDocs) {
      try {
        await KYCDocument.create(doc);
        createdCount++;
      } catch (err) {
        console.log(`⚠️  KYC doc creation skipped: ${err.message}`);
      }
    }

    console.log(`✨ KYCDocument seeding completed (${createdCount} new documents)\n`);
    return true;
  } catch (error) {
    console.error('❌ KYCDocument seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedKYCDocuments };
