const mongoose = require('mongoose');
const Role = require('../models/Role');
require('dotenv').config();

async function checkRoles() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Get all roles
    const roles = await Role.find().sort({ level: -1 });
    
    console.log('🔐 Roles in Database:\n');
    console.log('='.repeat(80));
    console.log('Role Name'.padEnd(20) + 'Display Name'.padEnd(25) + 'Department'.padEnd(20) + 'Level');
    console.log('='.repeat(80));
    
    roles.forEach(role => {
      const status = role.isActive ? '✅' : '❌';
      console.log(
        `${status} ${role.name.padEnd(18)} ${role.displayName.padEnd(23)} ${role.department.padEnd(18)} ${role.level}`
      );
    });
    
    console.log('='.repeat(80));
    console.log(`\nTotal Roles: ${roles.length}`);
    
    // Check if customer role exists
    const customerRole = roles.find(role => role.name === 'customer');
    if (customerRole) {
      console.log('\n🎯 Customer Role Details:');
      console.log(`   Name: ${customerRole.name}`);
      console.log(`   Display Name: ${customerRole.displayName}`);
      console.log(`   Department: ${customerRole.department}`);
      console.log(`   Level: ${customerRole.level}`);
      console.log(`   Active: ${customerRole.isActive ? 'Yes' : 'No'}`);
      console.log(`   Permissions: ${Object.keys(customerRole.permissions).length} categories`);
    } else {
      console.log('\n❌ Customer role not found!');
    }
    
  } catch (error) {
    console.error('❌ Error checking roles:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the check
checkRoles();
