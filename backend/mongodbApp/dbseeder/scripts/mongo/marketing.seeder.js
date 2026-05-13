require('dotenv').config();
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Coupon = require('../models/Coupon');
const FlashSale = require('../models/FlashSale');
const User = require('../models/User');
const Product = require('../models/Product');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping marketing.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const marketingSeeder = async () => {
  try {
    // Check if data already exists
    const campaignCount = await Campaign.countDocuments();
    if (campaignCount > 0) {
      console.log(`✅ Marketing seeder already ran (${campaignCount} campaigns exist)`);
      return;
    }

    // Get admin user and products
    const admin = await User.findOne({ role: 'admin' }) || await User.findOne({ role: 'super_admin' });
    const products = await Product.find().limit(20);

    if (!admin || products.length === 0) {
      console.log('⚠️ Skipping Marketing seeder: Not enough data');
      return;
    }

    const now = new Date();

    // Create campaigns
    const campaigns = [
      {
        name: 'Summer Fashion Campaign',
        description: 'Promote summer collection across all channels',
        type: 'email',
        status: 'active',
        targetAudience: 'customers',
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60000), // 7 days ago
        endDate: new Date(now.getTime() + 14 * 24 * 60 * 60000), // 14 days from now
        budget: 5000,
        content: {
          subject: 'Summer Collection - Up to 40% Off',
          body: 'Explore our latest summer collection with exclusive discounts',
          imageUrl: 'https://via.placeholder.com/600x400?text=Summer+Campaign'
        },
        createdBy: admin._id,
        metrics: {
          sent: 5000,
          delivered: 4900,
          opened: 1960,
          clicked: 392,
          conversions: 98
        }
      },
      {
        name: 'New User Welcome Campaign',
        description: 'Welcome email for new customers',
        type: 'email',
        status: 'active',
        targetAudience: 'customers',
        budget: 2000,
        content: {
          subject: 'Welcome to DFashion - 20% Off Your First Order',
          body: 'Get 20% discount on your first purchase with code WELCOME20',
          imageUrl: 'https://via.placeholder.com/600x400?text=Welcome'
        },
        createdBy: admin._id,
        metrics: {
          sent: 1200,
          delivered: 1180,
          opened: 590,
          clicked: 177,
          conversions: 53
        }
      },
      {
        name: 'Holiday Special',
        description: 'Holiday season promotional campaign',
        type: 'push',
        status: 'scheduled',
        targetAudience: 'all',
        startDate: new Date(now.getTime() + 30 * 24 * 60 * 60000), // 30 days from now
        endDate: new Date(now.getTime() + 60 * 24 * 60 * 60000), // 60 days from now
        budget: 8000,
        content: {
          subject: 'Holiday Collection - Limited Time',
          body: 'Shop holiday specials before they run out',
          imageUrl: 'https://via.placeholder.com/600x400?text=Holiday'
        },
        createdBy: admin._id,
        metrics: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          conversions: 0
        }
      }
    ];

    await Campaign.insertMany(campaigns);

    // Create coupons
    const coupons = [
      {
        code: 'SUMMER40',
        discountValue: 40,
        type: 'percentage',
        maxUses: 500,
        maxDiscount: 2000,
        minOrderValue: 1000,
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60000),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60000),
        applicableProducts: products.slice(0, 10).map(p => p._id),
        createdBy: admin._id,
        status: 'active',
        usedCount: 245
      },
      {
        code: 'WELCOME20',
        discountValue: 20,
        type: 'percentage',
        maxUses: 1000,
        minOrderValue: 500,
        applicableProducts: products.map(p => p._id),
        createdBy: admin._id,
        status: 'active',
        usedCount: 350
      },
      {
        code: 'SAVE500',
        discountValue: 500,
        type: 'fixed',
        maxUses: 100,
        minOrderValue: 3000,
        applicableProducts: products.slice(10, 15).map(p => p._id),
        createdBy: admin._id,
        status: 'active',
        usedCount: 45
      }
    ];

    await Coupon.insertMany(coupons);

    // Create flash sales
    const flashSales = [
      {
        name: 'Midnight Flash Sale',
        description: '50% off selected items for 2 hours',
        startTime: new Date(now.getTime() + 8 * 60 * 60000), // 8 hours from now
        endTime: new Date(now.getTime() + 10 * 60 * 60000), // 10 hours from now
        products: products.slice(0, 5).map(p => ({
          product: p._id,
          originalPrice: p.price,
          discountedPrice: p.price * 0.5,
          quantity: 100
        })),
        status: 'scheduled',
        createdBy: admin._id
      },
      {
        name: 'Weekend Mega Sale',
        description: 'Up to 70% off on fashion items',
        startTime: new Date(now.getTime() + 48 * 60 * 60000), // 2 days from now
        endTime: new Date(now.getTime() + 72 * 60 * 60000), // 3 days from now
        products: products.slice(5, 15).map(p => ({
          product: p._id,
          originalPrice: p.price,
          discountedPrice: p.price * 0.3,
          quantity: 150
        })),
        status: 'scheduled',
        createdBy: admin._id
      },
      {
        name: 'Earlier Flash Sale (Ended)',
        description: '30% off yesterday',
        startTime: new Date(now.getTime() - 24 * 60 * 60000), // 1 day ago
        endTime: new Date(now.getTime() - 22 * 60 * 60000), // 22 hours ago
        products: products.slice(15, 20).map(p => ({
          product: p._id,
          originalPrice: p.price,
          discountedPrice: p.price * 0.7,
          quantity: 200
        })),
        status: 'ended',
        createdBy: admin._id
      }
    ];

    await FlashSale.insertMany(flashSales);

    console.log(`✅ Marketing seeder completed: ${campaigns.length} campaigns, ${coupons.length} coupons, ${flashSales.length} flash sales created`);
  } catch (error) {
    console.error('❌ Marketing seeder error:', error.message);
    throw error;
  }
};

module.exports = marketingSeeder;
