/**
 * 📢 Campaign Seeder (Phase 1 - Root Model)
 * Seeds the campaigns table
 * No dependencies
 */

const models = require('../../../models_sql');

const campaignData = [
  {
    name: 'Diwali Campaign',
    description: 'Special offers for Diwali',
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  {
    name: 'New Year Sale',
    description: 'Welcome 2026 Sale',
    status: 'planned',
    startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000)
  }
];

async function seedCampaigns() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Campaign seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Campaign = models._raw?.Campaign || models.Campaign;
    if (!Campaign || !Campaign.create) {
      throw new Error('Campaign model not available');
    }

    let createdCount = 0;
    const count = await Campaign.count();
    
    if (count > 0) {
      console.log(`✅ Campaign data already exists (${count} records)`);
      return true;
    }

    for (const camp of campaignData) {
      await Campaign.create(camp);
      console.log(`✅ Created campaign: ${camp.name}`);
      createdCount++;
    }

    console.log(`✨ Campaign seeding completed (${createdCount} new campaigns)\n`);
    return true;
  } catch (error) {
    console.error('❌ Campaign seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedCampaigns };
