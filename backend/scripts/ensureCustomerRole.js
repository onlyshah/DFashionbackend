const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');

// Load environment variables
require('dotenv').config();

async function connectDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Comprehensive Customer Role Definition
const customerRoleDefinition = {
  name: 'customer',
  displayName: 'Customer',
  description: 'End user/buyer with full e-commerce and social features access',
  department: 'customer_service',
  level: 1,
  permissions: {
    // Dashboard Access
    dashboard: { view: true, analytics: false, reports: false },
    
    // User Management (Limited to own profile)
    users: { view: false, create: false, edit: false, delete: false, ban: false, roles: false },
    
    // Product Management (Read-only)
    products: { view: true, create: false, edit: false, delete: false, approve: false },
    
    // Order Management (Full access to own orders)
    orders: { view: true, create: true, edit: false, delete: false, cancel: true, track: true },
    
    // Category Management (Read-only)
    categories: { view: true, create: false, edit: false, delete: false },
    
    // Vendor Management (Read-only)
    vendors: { view: true, create: false, edit: false, delete: false },
    
    // Profile Management (Full access to own profile)
    profile: { view: true, create: false, edit: true, delete: false },
    
    // E-commerce Features (Full access)
    cart: { view: true, create: true, edit: true, delete: true },
    wishlist: { view: true, create: true, edit: true, delete: true },
    checkout: { view: true, create: true, edit: false, delete: false },
    payments: { view: true, create: true, edit: false, delete: false },
    addresses: { view: true, create: true, edit: true, delete: true },
    
    // Social Features (Full access to own content)
    posts: { view: true, create: true, edit: true, delete: true, like: true, share: true },
    stories: { view: true, create: true, edit: true, delete: true, like: true },
    comments: { view: true, create: true, edit: true, delete: true, like: true },
    follows: { view: true, create: true, edit: false, delete: true },
    
    // Reviews and Ratings
    reviews: { view: true, create: true, edit: true, delete: true },
    ratings: { view: true, create: true, edit: true, delete: true },
    
    // Notifications
    notifications: { view: true, create: false, edit: true, delete: true },
    
    // Support
    support: { view: true, create: true, edit: false, delete: false }
  },
  isActive: true
};

async function ensureCustomerRole() {
  try {
    console.log('🛒 Ensuring Customer Role for E-Commerce...\n');
    console.log('=' .repeat(60));
    console.log('   Customer Role Setup & Verification');
    console.log('=' .repeat(60));
    console.log('');

    // Check if Customer role exists
    console.log('🔍 Checking for existing Customer role...');
    let customerRole = await Role.findOne({ name: 'customer' });

    if (customerRole) {
      console.log('✅ Customer role found in database');
      console.log(`   Display Name: ${customerRole.displayName}`);
      console.log(`   Department: ${customerRole.department}`);
      console.log(`   Level: ${customerRole.level}`);
      console.log(`   Active: ${customerRole.isActive}`);
      
      // Check if permissions are comprehensive
      const hasEcommercePermissions = customerRole.permissions?.cart && 
                                     customerRole.permissions?.wishlist && 
                                     customerRole.permissions?.orders;
      
      if (!hasEcommercePermissions) {
        console.log('⚠️ Customer role exists but lacks comprehensive e-commerce permissions');
        console.log('🔄 Updating Customer role with full e-commerce permissions...');
        
        customerRole = await Role.findOneAndUpdate(
          { name: 'customer' },
          customerRoleDefinition,
          { new: true, upsert: false }
        );
        
        console.log('✅ Customer role updated with comprehensive permissions');
      } else {
        console.log('✅ Customer role has comprehensive e-commerce permissions');
      }
    } else {
      console.log('❌ Customer role not found in database');
      console.log('🔄 Creating Customer role...');
      
      customerRole = await Role.create(customerRoleDefinition);
      console.log('✅ Customer role created successfully');
    }

    // Display Customer role permissions
    console.log('\n📋 Customer Role E-Commerce Permissions:');
    console.log('-' .repeat(40));
    
    const permissions = customerRole.permissions;
    const ecommerceFeatures = [
      { name: 'Products', permission: permissions.products?.view },
      { name: 'Shopping Cart', permission: permissions.cart?.create },
      { name: 'Wishlist', permission: permissions.wishlist?.create },
      { name: 'Orders', permission: permissions.orders?.create },
      { name: 'Checkout', permission: permissions.checkout?.create },
      { name: 'Payments', permission: permissions.payments?.create },
      { name: 'Addresses', permission: permissions.addresses?.create },
      { name: 'Reviews', permission: permissions.reviews?.create },
      { name: 'Ratings', permission: permissions.ratings?.create }
    ];

    ecommerceFeatures.forEach(feature => {
      const status = feature.permission ? '✅' : '❌';
      console.log(`${status} ${feature.name}`);
    });

    // Display Social features
    console.log('\n📱 Customer Role Social Features:');
    console.log('-' .repeat(40));
    
    const socialFeatures = [
      { name: 'Posts', permission: permissions.posts?.create },
      { name: 'Stories', permission: permissions.stories?.create },
      { name: 'Comments', permission: permissions.comments?.create },
      { name: 'Follows', permission: permissions.follows?.create },
      { name: 'Likes', permission: permissions.posts?.like }
    ];

    socialFeatures.forEach(feature => {
      const status = feature.permission ? '✅' : '❌';
      console.log(`${status} ${feature.name}`);
    });

    // Check for Customer users
    console.log('\n👥 Customer Users in Database:');
    console.log('-' .repeat(40));
    
    const customerUsers = await User.find({ role: 'customer' }).select('username email isActive');
    console.log(`Found ${customerUsers.length} customer users`);
    
    if (customerUsers.length > 0) {
      console.log('\nSample Customer Users:');
      customerUsers.slice(0, 5).forEach(user => {
        const status = user.isActive ? '✅' : '❌';
        console.log(`${status} ${user.username} (${user.email})`);
      });
      
      if (customerUsers.length > 5) {
        console.log(`... and ${customerUsers.length - 5} more`);
      }
    } else {
      console.log('⚠️ No customer users found in database');
      console.log('💡 Consider running the user seeder to create customer accounts');
    }

    // Final assessment
    console.log('\n🎯 E-COMMERCE READINESS ASSESSMENT:');
    console.log('=' .repeat(60));
    
    const readinessChecks = [
      { name: 'Customer Role Exists', status: !!customerRole },
      { name: 'E-commerce Permissions', status: !!permissions.cart?.create },
      { name: 'Social Features', status: !!permissions.posts?.create },
      { name: 'Customer Users Exist', status: customerUsers.length > 0 },
      { name: 'Role is Active', status: customerRole.isActive }
    ];

    readinessChecks.forEach(check => {
      const status = check.status ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
    });

    const allReady = readinessChecks.every(check => check.status);
    
    if (allReady) {
      console.log('\n🎉 CUSTOMER ROLE IS FULLY CONFIGURED FOR E-COMMERCE!');
      console.log('✅ Platform is ready for customer registration and shopping');
    } else {
      console.log('\n⚠️ SOME ISSUES NEED ATTENTION:');
      const issues = readinessChecks.filter(check => !check.status);
      issues.forEach(issue => {
        console.log(`❌ ${issue.name}`);
      });
      
      console.log('\n💡 Recommended Actions:');
      if (!customerUsers.length) {
        console.log('   - Run user seeder: node scripts/seedRealData.js');
      }
      if (!customerRole.isActive) {
        console.log('   - Activate customer role in database');
      }
    }

    return customerRole;

  } catch (error) {
    console.error('❌ Error ensuring customer role:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await ensureCustomerRole();
    console.log('\n✅ Customer role setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Customer role setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ensureCustomerRole, connectDatabase };
