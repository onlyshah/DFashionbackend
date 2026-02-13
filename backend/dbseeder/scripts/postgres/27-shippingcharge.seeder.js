/**
 * 🚚 ShippingCharge Seeder (Phase 2 - Tier 1)
 * Depends on: Courier (nullable)
 * Creates shipping charges for different scenarios
 */

const models = require('../../../models_sql');

const shippingChargeData = [
  {
    name: 'Free Shipping',
    description: 'Free shipping for orders above ₹500',
    charge: 0,
    minOrderAmount: 500,
    maxWeight: null,
    isActive: true
  },
  {
    name: 'Standard Shipping',
    description: 'Standard shipping charges',
    charge: 50,
    minOrderAmount: null,
    maxWeight: 5,
    isActive: true
  },
  {
    name: 'Express Shipping',
    description: 'Express delivery (1-2 days)',
    charge: 100,
    minOrderAmount: null,
    maxWeight: 5,
    isActive: true
  },
  {
    name: 'Bulk Shipping',
    description: 'Shipping for orders above 10kg',
    charge: 200,
    minOrderAmount: null,
    maxWeight: null,
    isActive: true
  }
];

async function seedShippingCharges() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting ShippingCharge seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const ShippingCharge = models._raw?.ShippingCharge || models.ShippingCharge;
    const Courier = models._raw?.Courier || models.Courier;

    if (!ShippingCharge || !ShippingCharge.create) throw new Error('ShippingCharge model not available');

    // Get a default courier (optional)
    let defaultCourierId = null;
    if (Courier && Courier.findOne) {
      const defaultCourier = await Courier.findOne({ where: { name: 'DHL' } });
      if (defaultCourier) {
        defaultCourierId = defaultCourier.id;
      }
    }

    let createdCount = 0;
    for (const charge of shippingChargeData) {
      const existing = await ShippingCharge.findOne({
        where: { name: charge.name }
      });

      if (existing) {
        console.log(`✅ ShippingCharge '${charge.name}' already exists (skipping)`);
        continue;
      }

      await ShippingCharge.create({
        ...charge,
        courierId: defaultCourierId
      });

      console.log(`✅ Created shipping charge: ${charge.name}`);
      createdCount++;
    }

    console.log(`✨ ShippingCharge seeding completed (${createdCount} new charges)\n`);
    return true;
  } catch (error) {
    console.error('❌ ShippingCharge seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedShippingCharges };
