const mongoose = require('mongoose');
const { seedComprehensiveData, connectDatabase } = require('./seedComprehensiveData');
const { seedProductsAndOrders } = require('./seedProductsAndOrders');

// Load environment variables
require('dotenv').config();

async function masterSeed() {
  try {
    console.log('🚀 Starting Master Database Seeding Process...\n');
    console.log('=' .repeat(60));
    console.log('   DFashion E-Commerce Platform');
    console.log('   Comprehensive Database Setup');
    console.log('=' .repeat(60));
    console.log('');

    // Connect to database
    await connectDatabase();

    // Step 1: Seed comprehensive user data with roles
    console.log('📋 STEP 1: Creating Roles and Users');
    console.log('-' .repeat(40));
    await seedComprehensiveData();
    console.log('✅ Step 1 completed successfully!\n');

    // Step 2: Seed products, orders, and related data
    console.log('📋 STEP 2: Creating Products, Orders, and Commerce Data');
    console.log('-' .repeat(40));
    await seedProductsAndOrders();
    console.log('✅ Step 2 completed successfully!\n');

    // Final summary
    console.log('🎉 MASTER SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    
    // Get final counts
    const User = require('../models/User');
    const Product = require('../models/Product');
    const Order = require('../models/Order');
    const Role = require('../models/Role');
    const Category = require('../models/Category');
    const Cart = require('../models/Cart');
    const Wishlist = require('../models/Wishlist');

    const counts = {
      roles: await Role.countDocuments(),
      users: await User.countDocuments(),
      products: await Product.countDocuments(),
      orders: await Order.countDocuments(),
      categories: await Category.countDocuments(),
      carts: await Cart.countDocuments(),
      wishlists: await Wishlist.countDocuments()
    };

    console.log('\n📊 FINAL DATABASE SUMMARY:');
    console.log('-' .repeat(30));
    console.log(`   Roles: ${counts.roles}`);
    console.log(`   Users: ${counts.users}`);
    console.log(`   Categories: ${counts.categories}`);
    console.log(`   Products: ${counts.products}`);
    console.log(`   Orders: ${counts.orders}`);
    console.log(`   Shopping Carts: ${counts.carts}`);
    console.log(`   Wishlists: ${counts.wishlists}`);
    console.log('-' .repeat(30));

    // Display user breakdown by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n👥 USERS BY ROLE:');
    console.log('-' .repeat(25));
    usersByRole.forEach(role => {
      console.log(`   ${role._id.replace('_', ' ').toUpperCase()}: ${role.count}`);
    });
    console.log('-' .repeat(25));

    // Display login credentials for admin users
    console.log('\n🔑 ADMIN LOGIN CREDENTIALS:');
    console.log('=' .repeat(60));
    
    const adminUsers = await User.find({
      role: { $in: ['super_admin', 'admin', 'sales_manager', 'marketing_manager', 'account_manager', 'support_manager'] }
    }).select('email fullName role').sort({ role: 1 });

    adminUsers.forEach(user => {
      const password = user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', '') + '123!';
      console.log(`\n${user.role.toUpperCase().replace('_', ' ')}:`);
      console.log(`   Name: ${user.fullName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${password}`);
    });

    // Display sample customer credentials
    const sampleCustomer = await User.findOne({ role: 'customer' }).select('email fullName');
    if (sampleCustomer) {
      console.log(`\nSAMPLE CUSTOMER:`);
      console.log(`   Name: ${sampleCustomer.fullName}`);
      console.log(`   Email: ${sampleCustomer.email}`);
      console.log(`   Password: Customer123!`);
    }

    console.log('\n=' .repeat(60));

    // Application URLs
    console.log('\n🌐 APPLICATION URLS:');
    console.log('-' .repeat(25));
    console.log('   Frontend: http://localhost:4200');
    console.log('   Admin Panel: http://localhost:4200/admin');
    console.log('   Backend API: http://localhost:3001');
    console.log('-' .repeat(25));

    // Next steps
    console.log('\n📋 NEXT STEPS:');
    console.log('-' .repeat(15));
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend server: ng serve');
    console.log('3. Open admin panel: http://localhost:4200/admin');
    console.log('4. Test different user roles with credentials above');
    console.log('5. Verify RBAC functionality');
    console.log('-' .repeat(15));

    console.log('\n🎉 Your DFashion E-Commerce Platform is ready for testing!');
    console.log('   Database has been populated with comprehensive test data.');
    console.log('   All user roles, products, orders, and commerce data are available.');
    console.log('\n✅ Master seeding process completed successfully!');

  } catch (error) {
    console.error('❌ Master seeding failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await masterSeed();
    process.exit(0);
  } catch (error) {
    console.error('❌ Master seeding process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { masterSeed };
