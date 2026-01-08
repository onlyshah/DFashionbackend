// Logistics Seeder Script
// Creates courier partners, shipments, and shipping charge rules
// Usage: node scripts/logistics.seeder.js

const mongoose = require('mongoose');
const Courier = require('../models/Courier');
const Shipment = require('../models/Shipment');
const ShippingCharge = require('../models/ShippingCharge');
const Order = require('../models/Order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedLogistics() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for logistics seeding');

    // Get sample orders
    const orders = await Order.find().limit(30);
    if (!orders.length) {
      throw new Error('No orders found for shipment seeding');
    }

    // Clear existing data
    await Courier.deleteMany({});
    await Shipment.deleteMany({});
    await ShippingCharge.deleteMany({});

    // Create courier partners
    const courierPartners = [
      {
        name: 'DHL Express',
        apiKey: 'DHL_API_KEY_123456',
        apiSecret: 'DHL_SECRET',
        apiEndpoint: 'https://api.dhl.com/v1',
        isActive: true,
        supportedServices: ['express', 'standard'],
        pickupAvailable: true,
        codSupported: true,
        integrationDate: new Date(Date.now() - 180*24*60*60*1000),
        lastSyncDate: new Date()
      },
      {
        name: 'FedEx',
        apiKey: 'FEDEX_API_KEY_123456',
        apiSecret: 'FEDEX_SECRET',
        apiEndpoint: 'https://api.fedex.com/v1',
        isActive: true,
        supportedServices: ['express', 'standard', 'economy'],
        pickupAvailable: true,
        codSupported: true,
        integrationDate: new Date(Date.now() - 180*24*60*60*1000),
        lastSyncDate: new Date()
      },
      {
        name: 'UPS',
        apiKey: 'UPS_API_KEY_123456',
        apiSecret: 'UPS_SECRET',
        apiEndpoint: 'https://api.ups.com/v1',
        isActive: true,
        supportedServices: ['express', 'standard'],
        pickupAvailable: true,
        codSupported: false,
        integrationDate: new Date(Date.now() - 180*24*60*60*1000),
        lastSyncDate: new Date()
      },
      {
        name: 'BlueDart',
        apiKey: 'BLUEDART_API_KEY_123456',
        apiSecret: 'BLUEDART_SECRET',
        apiEndpoint: 'https://api.bluedart.com/v1',
        isActive: true,
        supportedServices: ['standard', 'economy'],
        pickupAvailable: true,
        codSupported: true,
        integrationDate: new Date(Date.now() - 180*24*60*60*1000),
        lastSyncDate: new Date()
      },
      {
        name: 'DTDC Express',
        apiKey: 'DTDC_API_KEY_123456',
        apiSecret: 'DTDC_SECRET',
        apiEndpoint: 'https://api.dtdc.com/v1',
        isActive: true,
        supportedServices: ['standard', 'economy'],
        pickupAvailable: true,
        codSupported: true,
        integrationDate: new Date(Date.now() - 180*24*60*60*1000),
        lastSyncDate: new Date()
      }
    ];

    await Courier.insertMany(courierPartners);
    console.log(`✓ ${courierPartners.length} courier partners created`);

    // Get created couriers
    const couriers = await Courier.find();

    // Create shipments for orders
    const shipments = [];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const courier = couriers[i % couriers.length];

      const shipmentStatuses = ['pending', 'labeled', 'picked', 'in_transit', 'out_for_delivery', 'delivered', 'failed'];
      const status = shipmentStatuses[i % shipmentStatuses.length];

      const trackingNumber = `TRK${Date.now()}${i}`;

      let actualDeliveryDate = null;
      let estimatedDeliveryDate = new Date(Date.now() + 5*24*60*60*1000);

      if (status === 'delivered') {
        actualDeliveryDate = new Date(Date.now() - Math.floor(Math.random() * 10)*24*60*60*1000);
        estimatedDeliveryDate = new Date(Date.now() - Math.floor(Math.random() * 5)*24*60*60*1000);
      } else if (['in_transit', 'out_for_delivery'].includes(status)) {
        estimatedDeliveryDate = new Date(Date.now() + Math.floor(Math.random() * 3)*24*60*60*1000);
      }

      const events = [];
      const eventStatuses = ['pending', 'labeled', 'picked', 'in_transit', 'out_for_delivery', 'delivered'];
      
      for (let j = 0; j < eventStatuses.length; j++) {
        if (eventStatuses[j] === status) {
          events.push({
            status: eventStatuses[j],
            timestamp: actualDeliveryDate || new Date(Date.now() - (5-j)*24*60*60*1000),
            location: 'Warehouse / Transit',
            description: `Shipment ${eventStatuses[j].replace(/_/g, ' ')}`
          });
          break;
        } else if (j < eventStatuses.findIndex(s => s === status) || status === 'delivered') {
          events.push({
            status: eventStatuses[j],
            timestamp: new Date(Date.now() - (5-j)*24*60*60*1000),
            location: 'Warehouse / Transit',
            description: `Shipment ${eventStatuses[j].replace(/_/g, ' ')}`
          });
        }
      }

      const shipment = {
        orderId: order._id,
        courier: courier.name,
        trackingNumber: trackingNumber,
        status: status,
        awbNumber: `AWB${Date.now()}${i}`,
        labelUrl: `/uploads/labels/label-${i}.pdf`,
        pickupDate: new Date(Date.now() - 7*24*60*60*1000),
        dispatchDate: new Date(Date.now() - 6*24*60*60*1000),
        estimatedDeliveryDate: estimatedDeliveryDate,
        actualDeliveryDate: actualDeliveryDate,
        deliveryProof: status === 'delivered' ? {
          signature: true,
          photo: `/uploads/delivery-proof/delivery-${i}.jpg`,
          notes: 'Delivered successfully'
        } : null,
        events: events,
        rto: status === 'failed' ? {
          initiated: true,
          reason: 'Address not found',
          status: 'in_progress',
          date: new Date()
        } : { initiated: false }
      };

      shipments.push(shipment);
    }

    // Create shipping charge rules by zone
    const zones = ['North', 'South', 'East', 'West', 'Northeast', 'Central'];
    const shippingCharges = [];

    zones.forEach((zone, index) => {
      couriers.forEach(courier => {
        const charge = {
          zone: zone,
          courier: courier.name,
          weight_slab: [
            { from: 0, to: 1, rate: 100 + (index * 20) },
            { from: 1, to: 5, rate: 150 + (index * 25) },
            { from: 5, to: 10, rate: 200 + (index * 30) },
            { from: 10, to: 25, rate: 300 + (index * 40) }
          ],
          codCharges: 20,
          insuranceCharges: 50,
          handlingCharges: 10,
          minCharges: 50,
          maxCharges: 500,
          isActive: true,
          effectiveDate: new Date(Date.now() - 30*24*60*60*1000),
          expiryDate: new Date(Date.now() + 330*24*60*60*1000)
        };

        shippingCharges.push(charge);
      });
    });

    await Shipment.insertMany(shipments);
    await ShippingCharge.insertMany(shippingCharges);

    console.log(`✓ ${shipments.length} shipments created`);
    console.log(`✓ ${shippingCharges.length} shipping charge rules created`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Logistics seeding failed:', err.message);
    process.exit(1);
  }
}

seedLogistics();
