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

async function seedComplete() {
  try {
    console.log('🚀 Starting Complete DFashion Database Seeding...\n');
    console.log('=' .repeat(70));
    console.log('   DFashion E-Commerce Platform - Complete Setup');
    console.log('   Roles, Users, Products, Orders, Stories & More');
    console.log('=' .repeat(70));
    console.log('');

    // Connect to database
    await connectDatabase();

    // Import and run the comprehensive seeder
    const { seedRealData } = require('./seedRealData');
    await seedRealData();

    // Verify critical roles and users exist
    console.log('\n🔍 Verifying Critical Setup...');
    console.log('-' .repeat(40));

    // Check roles
    const roles = await Role.find({}).sort({ level: -1 });
    console.log(`✅ Roles created: ${roles.length}`);
    
    const criticalRoles = ['super_admin', 'admin', 'customer', 'vendor'];
    const missingRoles = [];
    
    for (const roleName of criticalRoles) {
      const role = roles.find(r => r.name === roleName);
      if (role) {
        console.log(`   ✅ ${roleName} role: ${role.displayName} (Level ${role.level})`);
      } else {
        missingRoles.push(roleName);
        console.log(`   ❌ ${roleName} role: MISSING`);
      }
    }

    // Check users
    const users = await User.find({}).populate('role');
    console.log(`\n✅ Users created: ${users.length}`);
    
    const usersByRole = {};
    users.forEach(user => {
      const roleName = user.role || 'no_role';
      if (!usersByRole[roleName]) usersByRole[roleName] = 0;
      usersByRole[roleName]++;
    });

    Object.entries(usersByRole).forEach(([role, count]) => {
      console.log(`   ✅ ${role}: ${count} users`);
    });

    // Check for admin and customer users specifically
    const adminUsers = users.filter(u => ['super_admin', 'admin'].includes(u.role));
    const customerUsers = users.filter(u => u.role === 'customer');
    
    console.log(`\n📋 Critical User Check:`);
    console.log(`   Admin Users: ${adminUsers.length} ${adminUsers.length > 0 ? '✅' : '❌'}`);
    console.log(`   Customer Users: ${customerUsers.length} ${customerUsers.length > 0 ? '✅' : '❌'}`);

    // Final summary
    console.log('\n🎉 COMPLETE SEEDING FINISHED!');
    console.log('=' .repeat(70));
    
    if (missingRoles.length === 0 && adminUsers.length > 0 && customerUsers.length > 0) {
      console.log('✅ ALL CRITICAL COMPONENTS SUCCESSFULLY CREATED');
      console.log('✅ Database is ready for production use');
    } else {
      console.log('⚠️  SOME CRITICAL COMPONENTS MAY BE MISSING');
      if (missingRoles.length > 0) {
        console.log(`❌ Missing roles: ${missingRoles.join(', ')}`);
      }
      if (adminUsers.length === 0) {
        console.log('❌ No admin users found');
      }
      if (customerUsers.length === 0) {
        console.log('❌ No customer users found');
      }
    }

    console.log('\n📊 Database Summary:');
    console.log(`   Roles: ${roles.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Admin Users: ${adminUsers.length}`);
    console.log(`   Customer Users: ${customerUsers.length}`);

    console.log('\n🔑 Test Login Credentials:');
    console.log('   Super Admin: rajesh@example.com / password123');
    console.log('   Customer: priya@example.com / password123');
    console.log('   Vendor: maya@example.com / password123');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Start backend: npm run dev');
    console.log('   2. Start frontend: ng serve');
    console.log('   3. Access app: http://localhost:4200');
    console.log('   4. Admin panel: http://localhost:4200/admin');

  } catch (error) {
    console.error('❌ Complete seeding failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await seedComplete();
    console.log('\n✅ Complete seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Complete seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedComplete, connectDatabase };
