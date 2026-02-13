/**
 * 🚚 Shipment Seeder (Phase 5 - Tier 4)
 * Depends on: Order, Courier
 */

const models = require('../../../models_sql');

async function seedShipments() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Shipment seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Shipment = models._raw?.Shipment || models.Shipment;
    const Order = models._raw?.Order || models.Order;
    const Courier = models._raw?.Courier || models.Courier;

    if (!Shipment || !Shipment.create) throw new Error('Shipment model not available');
    if (!Order || !Order.findAll) throw new Error('Order model not available');

    const orders = await Order.findAll({ where: { status: 'shipped' } });
    const courier = Courier && await Courier.findOne();

    if (orders.length === 0) {
      console.log(`⚠️ No shipped orders found. Skipping shipment seeding.`);
      return true;
    }

    let createdCount = 0;

    for (const order of orders) {
      const existing = await Shipment.findOne({ where: { orderId: order.id } });

      if (existing) {
        console.log(`✅ Shipment for order ${order.orderNumber} already exists (skipping)`);
        continue;
      }

      await Shipment.create({
        orderId: order.id,
        courierId: courier?.id || null,
        trackingNumber: `TRACK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'in_transit',
        weight: 0.5,
        dimensions: { length: 10, width: 10, height: 10 }
      });

      console.log(`✅ Created shipment for order: ${order.orderNumber}`);
      createdCount++;
    }

    console.log(`✨ Shipment seeding completed (${createdCount} new shipments)\n`);
    return true;
  } catch (error) {
    console.error('❌ Shipment seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedShipments };
