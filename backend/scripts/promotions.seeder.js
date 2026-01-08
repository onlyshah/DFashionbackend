// Promotions Seeder Script
// Creates coupons, flash sales, and discount rules
// Usage: node scripts/promotions.seeder.js

const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Campaign = require('../models/Campaign');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedPromotions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for promotions seeding');

    // Get products and categories
    const products = await Product.find().limit(40);
    const categories = await Category.find();

    if (!products.length || !categories.length) {
      throw new Error('Products or categories not found for promotion seeding');
    }

    // Clear existing promotions
    await Coupon.deleteMany({});
    await FlashSale.deleteMany({});
    await Campaign.deleteMany({});

    const coupons = [];
    const flashSales = [];
    const campaigns = [];

    // Create 15 coupons with various states
    const couponCodes = [
      'SUMMER20', 'FASHION10', 'SAVE15', 'WELCOME5', 'MEGA30',
      'FLASH25', 'LUCKY50', 'NEWYEAR20', 'SPRING15', 'HOLIDAY10',
      'VIP30', 'EXPIRED99', 'LIMITED5', 'FREESHIP', 'CASHBACK10'
    ];

    couponCodes.forEach((code, index) => {
      const couponId = new mongoose.Types.ObjectId();
      const discountType = ['percentage', 'flat_amount', 'free_shipping'][index % 3];
      const isValid = code !== 'EXPIRED99';
      const startDate = new Date(Date.now() - 30*24*60*60*1000);
      const endDate = new Date(Date.now() + (isValid ? 60 : -5)*24*60*60*1000);

      const coupon = {
        _id: couponId,
        code: code,
        description: `Discount coupon code ${code}`,
        discountType: discountType,
        discountValue: discountType === 'percentage' ? 20 + (index % 15) : 500 + (index * 100),
        maxDiscountAmount: discountType === 'percentage' ? 5000 : null,
        minPurchaseAmount: 1000 + (index * 500),
        maxUsageLimit: 100 + (index * 10),
        usageCount: Math.floor(Math.random() * 50),
        perCustomerLimit: 5 + index,
        applicableCategories: [categories[index % categories.length]._id],
        applicableProducts: index % 3 === 0 ? [products[index]._id, products[(index + 1) % products.length]._id] : [],
        excludedProducts: [],
        validFrom: startDate,
        validUpto: endDate,
        isActive: isValid && new Date() < endDate,
        status: isValid ? 'active' : 'expired',
        couponType: ['seasonal', 'promotional', 'loyalty', 'referral'][index % 4],
        terms: `Valid for ${discountType === 'percentage' ? (20 + (index % 15)) + '%' : '₹' + (500 + (index * 100))} discount`,
        createdAt: startDate,
        updatedAt: new Date()
      };

      coupons.push(coupon);

      // No need for audit logs for promotion creation
    });

    // Create 5 flash sales
    const flashSaleNames = [
      'Midnight Madness',
      'Summer Clearance',
      'Fashion Festival',
      'Weekend Special',
      'Grand Launch'
    ];

    flashSaleNames.forEach((name, index) => {
      const isActive = index < 3;
      const startTime = isActive ? new Date(Date.now() - 2*60*60*1000) : new Date(Date.now() - 30*24*60*60*1000);
      const endTime = isActive ? new Date(Date.now() + (6 - index)*60*60*1000) : new Date(Date.now() + 2*60*60*1000);

      const saleProducts = products.slice(index * 8, (index + 1) * 8);
      const saleProductsList = saleProducts.map(p => ({
        productId: p._id,
        salePrice: p.price * (0.5 + Math.random() * 0.4),
        stockLimit: Math.floor(Math.random() * 100) + 50,
        claimed: Math.floor(Math.random() * 40)
      }));

      const flashSale = {
        title: name,
        description: `Exciting ${name} sale with discounts up to 70%`,
        startDate: startTime,
        endDate: endTime,
        discountPercent: 30 + (index * 10),
        products: saleProductsList,
        status: isActive && new Date() < endTime ? 'live' : isActive ? 'scheduled' : 'ended',
        createdBy: new mongoose.Types.ObjectId()
      };

      flashSales.push(flashSale);

      // No need for audit logs for promotion creation
    });

    // Create 3 campaigns
    const campaignNames = ['Spring Collection Launch', 'Festival Bonanza', 'Year-End Sale'];

    campaignNames.forEach((name, index) => {
      const isActive = index === 0;

      const campaign = {
        name: name,
        description: `Marketing campaign: ${name}`,
        startDate: new Date(Date.now() - 15*24*60*60*1000),
        endDate: new Date(Date.now() + (90 - index*30)*24*60*60*1000),
        status: isActive ? 'active' : 'draft',
        budget: 500000 + (index * 200000),
        spent: isActive ? Math.floor(Math.random() * 300000) : 0,
        createdBy: new mongoose.Types.ObjectId()
      };

      campaigns.push(campaign);
    });

    await Coupon.insertMany(coupons);
    await FlashSale.insertMany(flashSales);
    await Campaign.insertMany(campaigns);

    console.log(`✓ ${coupons.length} coupons created`);
    console.log(`✓ ${flashSales.length} flash sales created`);
    console.log(`✓ ${campaigns.length} campaigns created`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Promotions seeding failed:', err.message);
    process.exit(1);
  }
}

seedPromotions();
