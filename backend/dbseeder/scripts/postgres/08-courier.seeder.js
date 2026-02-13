/**
 * 🚚 Courier Seeder (Phase 1 - Root Model)
 * Seeds the couriers table with delivery partners
 * No dependencies
 */

const models = require('../../../models_sql');

const courierData = [
  {
    name: 'DHL',
    email: 'support@dhl.com',
    phone: '+91-9000000001',
    trackingUrl: 'https://www.dhl.com/track',
    apiKey: 'dhl_key_123',
    isActive: true
  },
  {
    name: 'FedEx',
    email: 'support@fedex.com',
    phone: '+91-9000000002',
    trackingUrl: 'https://www.fedex.com/track',
    apiKey: 'fedex_key_456',
    isActive: true
  },
  {
    name: 'BlueDart',
    email: 'support@bluedart.com',
    phone: '+91-9000000003',
    trackingUrl: 'https://www.bluedart.com/tracking',
    apiKey: 'bluedart_key_789',
    isActive: true
  },
  {
    name: 'Flipkart Logistics',
    email: 'logistics@flipkart.com',
    phone: '+91-9000000004',
    trackingUrl: 'https://logistics.flipkart.com/track',
    apiKey: 'flipkart_key_101',
    isActive: true
  },
  {
    name: 'DTDC',
    email: 'support@dtdc.com',
    phone: '+91-9000000005',
    trackingUrl: 'https://www.dtdc.com/tracking',
    apiKey: 'dtdc_key_202',
    isActive: true
  }
];

async function seedCouriers() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Courier seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Courier = models._raw?.Courier || models.Courier;
    if (!Courier || !Courier.create) {
      throw new Error('Courier model not available');
    }

    let createdCount = 0;
    for (const courier of courierData) {
      const existing = await Courier.findOne({
        where: { name: courier.name }
      });

      if (existing) {
        console.log(`✅ Courier '${courier.name}' already exists (skipping)`);
        continue;
      }

      await Courier.create(courier);
      console.log(`✅ Created courier: ${courier.name}`);
      createdCount++;
    }

    console.log(`✨ Courier seeding completed (${createdCount} new couriers)\n`);
    return true;
  } catch (error) {
    console.error('❌ Courier seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedCouriers };
