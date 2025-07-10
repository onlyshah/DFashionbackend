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

// Essential roles for e-commerce platform
const essentialRoles = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    department: 'administration',
    level: 10,
    required: true
  },
  {
    name: 'admin',
    displayName: 'Administrator', 
    description: 'Administrative access with most permissions',
    department: 'administration',
    level: 9,
    required: true
  },
  {
    name: 'customer',
    displayName: 'Customer',
    description: 'End user/buyer with full e-commerce and social features access',
    department: 'customer_service',
    level: 1,
    required: true
  },
  {
    name: 'vendor',
    displayName: 'Vendor',
    description: 'Vendor with product management and order fulfillment access',
    department: 'vendor_management',
    level: 2,
    required: true
  },
  {
    name: 'sales_manager',
    displayName: 'Sales Manager',
    description: 'Manages sales operations and team',
    department: 'sales',
    level: 7,
    required: false
  },
  {
    name: 'support_manager',
    displayName: 'Support Manager',
    description: 'Manages customer support operations',
    department: 'support',
    level: 6,
    required: false
  }
];

async function verifyRoles() {
  try {
    console.log('🔍 Starting Role Verification...\n');
    console.log('=' .repeat(70));
    console.log('   DFashion E-Commerce Platform - Role Verification');
    console.log('=' .repeat(70));
    console.log('');

    // Get all existing roles
    const existingRoles = await Role.find({}).sort({ level: -1 });
    console.log(`📊 Found ${existingRoles.length} existing roles in database\n`);

    // Check essential roles
    console.log('🔍 Checking Essential Roles:');
    console.log('-' .repeat(40));

    const missingRoles = [];
    const foundRoles = [];

    for (const essentialRole of essentialRoles) {
      const existingRole = existingRoles.find(r => r.name === essentialRole.name);
      
      if (existingRole) {
        foundRoles.push(existingRole);
        const status = essentialRole.required ? '✅ REQUIRED' : '✅ OPTIONAL';
        console.log(`${status} - ${essentialRole.name}: ${existingRole.displayName} (Level ${existingRole.level})`);
        console.log(`   Department: ${existingRole.department}`);
        console.log(`   Description: ${existingRole.description}`);
      } else {
        missingRoles.push(essentialRole);
        const status = essentialRole.required ? '❌ MISSING REQUIRED' : '⚠️ MISSING OPTIONAL';
        console.log(`${status} - ${essentialRole.name}: ${essentialRole.displayName}`);
      }
      console.log('');
    }

    // Display all roles
    console.log('📋 Complete Role Hierarchy:');
    console.log('-' .repeat(40));
    existingRoles.forEach(role => {
      const isEssential = essentialRoles.find(er => er.name === role.name);
      const marker = isEssential?.required ? '🔑' : isEssential ? '⭐' : '📝';
      console.log(`${marker} Level ${role.level}: ${role.name} (${role.displayName})`);
      console.log(`   Department: ${role.department}`);
      console.log(`   Active: ${role.isActive ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check users for each essential role
    console.log('👥 User Distribution by Essential Roles:');
    console.log('-' .repeat(40));
    
    for (const essentialRole of essentialRoles) {
      const userCount = await User.countDocuments({ role: essentialRole.name });
      const status = userCount > 0 ? '✅' : '❌';
      console.log(`${status} ${essentialRole.name}: ${userCount} users`);
      
      if (userCount > 0 && essentialRole.required) {
        // Show sample users for required roles
        const sampleUsers = await User.find({ role: essentialRole.name }).limit(3).select('username email');
        sampleUsers.forEach(user => {
          console.log(`   - ${user.username} (${user.email})`);
        });
      }
      console.log('');
    }

    // Summary
    console.log('📊 ROLE VERIFICATION SUMMARY:');
    console.log('=' .repeat(70));
    console.log(`Total Roles in Database: ${existingRoles.length}`);
    console.log(`Essential Roles Found: ${foundRoles.length}/${essentialRoles.length}`);
    console.log(`Missing Required Roles: ${missingRoles.filter(r => r.required).length}`);
    console.log(`Missing Optional Roles: ${missingRoles.filter(r => !r.required).length}`);

    // Check critical e-commerce roles
    const customerRole = existingRoles.find(r => r.name === 'customer');
    const adminRole = existingRoles.find(r => r.name === 'admin');
    const superAdminRole = existingRoles.find(r => r.name === 'super_admin');

    console.log('\n🛒 E-COMMERCE ROLE READINESS:');
    console.log('-' .repeat(40));
    console.log(`Customer Role: ${customerRole ? '✅ Ready' : '❌ Missing'}`);
    console.log(`Admin Role: ${adminRole ? '✅ Ready' : '❌ Missing'}`);
    console.log(`Super Admin Role: ${superAdminRole ? '✅ Ready' : '❌ Missing'}`);

    if (customerRole) {
      console.log('\n🔍 Customer Role Details:');
      console.log(`   Display Name: ${customerRole.displayName}`);
      console.log(`   Department: ${customerRole.department}`);
      console.log(`   Level: ${customerRole.level}`);
      console.log(`   Active: ${customerRole.isActive}`);
      console.log(`   E-commerce Ready: ${customerRole.permissions?.cart ? '✅' : '❌'}`);
    }

    // Final assessment
    const requiredMissing = missingRoles.filter(r => r.required);
    if (requiredMissing.length === 0) {
      console.log('\n🎉 ALL ESSENTIAL ROLES ARE PROPERLY CONFIGURED!');
      console.log('✅ E-commerce platform is ready for user role management');
    } else {
      console.log('\n⚠️ MISSING REQUIRED ROLES:');
      requiredMissing.forEach(role => {
        console.log(`❌ ${role.name}: ${role.displayName}`);
      });
      console.log('\n💡 Run the seeder to create missing roles:');
      console.log('   node scripts/seedRealData.js');
    }

  } catch (error) {
    console.error('❌ Error during role verification:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await verifyRoles();
    console.log('\n✅ Role verification completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Role verification failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { verifyRoles, connectDatabase };
