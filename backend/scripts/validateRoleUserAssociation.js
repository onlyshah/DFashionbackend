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

async function validateRoleUserAssociation() {
  try {
    console.log('🔍 Validating Role-User Associations...\n');
    console.log('=' .repeat(70));
    console.log('   Ensuring Every Role Has At Least One User');
    console.log('=' .repeat(70));
    console.log('');

    // Get all roles from database
    const allRoles = await Role.find({}).sort({ level: -1 });
    console.log(`📊 Found ${allRoles.length} roles defined in the system\n`);

    // Check user count for each role
    console.log('🔍 Checking User Count for Each Role:');
    console.log('-' .repeat(50));

    const roleValidation = [];
    const rolesWithoutUsers = [];
    const rolesWithUsers = [];

    for (const role of allRoles) {
      const userCount = await User.countDocuments({ role: role.name });
      const hasUsers = userCount > 0;
      
      const status = hasUsers ? '✅' : '❌';
      console.log(`${status} ${role.name} (${role.displayName})`);
      console.log(`   Level: ${role.level} | Department: ${role.department}`);
      console.log(`   Users: ${userCount}`);
      
      if (hasUsers) {
        // Show sample users for roles that have users
        const sampleUsers = await User.find({ role: role.name })
          .limit(3)
          .select('username email isActive');
        
        sampleUsers.forEach(user => {
          const activeStatus = user.isActive ? '🟢' : '🔴';
          console.log(`   ${activeStatus} ${user.username} (${user.email})`);
        });
        
        if (userCount > 3) {
          console.log(`   ... and ${userCount - 3} more users`);
        }
        
        rolesWithUsers.push({
          role: role.name,
          displayName: role.displayName,
          level: role.level,
          department: role.department,
          userCount: userCount
        });
      } else {
        rolesWithoutUsers.push({
          role: role.name,
          displayName: role.displayName,
          level: role.level,
          department: role.department,
          userCount: 0
        });
      }
      
      roleValidation.push({
        role: role.name,
        displayName: role.displayName,
        level: role.level,
        department: role.department,
        userCount: userCount,
        hasUsers: hasUsers,
        isValid: hasUsers
      });
      
      console.log('');
    }

    // Summary Statistics
    console.log('📊 VALIDATION SUMMARY:');
    console.log('=' .repeat(70));
    console.log(`Total Roles Defined: ${allRoles.length}`);
    console.log(`Roles with Users: ${rolesWithUsers.length}`);
    console.log(`Roles without Users: ${rolesWithoutUsers.length}`);
    console.log(`Validation Success Rate: ${Math.round((rolesWithUsers.length / allRoles.length) * 100)}%`);

    // Detailed Analysis
    if (rolesWithoutUsers.length > 0) {
      console.log('\n❌ ROLES WITHOUT USERS (VALIDATION FAILED):');
      console.log('-' .repeat(50));
      rolesWithoutUsers.forEach(role => {
        console.log(`❌ ${role.role} (${role.displayName})`);
        console.log(`   Level: ${role.level} | Department: ${role.department}`);
        console.log(`   Status: MISSING USERS - Validation Failed`);
        console.log('');
      });
    }

    if (rolesWithUsers.length > 0) {
      console.log('\n✅ ROLES WITH USERS (VALIDATION PASSED):');
      console.log('-' .repeat(50));
      rolesWithUsers.forEach(role => {
        console.log(`✅ ${role.role} (${role.displayName})`);
        console.log(`   Level: ${role.level} | Department: ${role.department}`);
        console.log(`   Users: ${role.userCount}`);
        console.log('');
      });
    }

    // Critical Role Analysis
    const criticalRoles = ['super_admin', 'admin', 'customer', 'vendor'];
    console.log('\n🔑 CRITICAL ROLE VALIDATION:');
    console.log('-' .repeat(50));
    
    let criticalRolesMissing = 0;
    for (const criticalRole of criticalRoles) {
      const roleData = roleValidation.find(r => r.role === criticalRole);
      if (roleData) {
        const status = roleData.hasUsers ? '✅' : '❌';
        console.log(`${status} ${criticalRole}: ${roleData.userCount} users`);
        if (!roleData.hasUsers) criticalRolesMissing++;
      } else {
        console.log(`❌ ${criticalRole}: ROLE NOT DEFINED`);
        criticalRolesMissing++;
      }
    }

    // Department Analysis
    console.log('\n🏢 DEPARTMENT USER DISTRIBUTION:');
    console.log('-' .repeat(50));
    
    const departmentStats = {};
    roleValidation.forEach(role => {
      if (!departmentStats[role.department]) {
        departmentStats[role.department] = { roles: 0, users: 0 };
      }
      departmentStats[role.department].roles++;
      departmentStats[role.department].users += role.userCount;
    });

    Object.entries(departmentStats).forEach(([dept, stats]) => {
      console.log(`📁 ${dept}:`);
      console.log(`   Roles: ${stats.roles} | Users: ${stats.users}`);
    });

    // Final Validation Result
    console.log('\n🎯 FINAL VALIDATION RESULT:');
    console.log('=' .repeat(70));
    
    const isFullyValid = rolesWithoutUsers.length === 0;
    const isCriticalValid = criticalRolesMissing === 0;
    
    if (isFullyValid) {
      console.log('🎉 ✅ VALIDATION PASSED: All roles have at least one user!');
      console.log('✅ Database requirement fulfilled: Every role has associated records');
    } else {
      console.log('❌ VALIDATION FAILED: Some roles have no users');
      console.log(`❌ ${rolesWithoutUsers.length} roles need user assignments`);
      
      if (isCriticalValid) {
        console.log('✅ Critical roles (admin, customer) have users');
      } else {
        console.log('❌ Critical roles missing users - URGENT');
      }
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-' .repeat(50));
    
    if (!isFullyValid) {
      console.log('🔧 To fix missing user associations:');
      console.log('   1. Run comprehensive seeder: npm run seed:real');
      console.log('   2. Create specific admin users: npm run seed:admin');
      console.log('   3. Manually create users for missing roles');
      console.log('');
      
      console.log('📝 Missing roles that need users:');
      rolesWithoutUsers.forEach(role => {
        console.log(`   - ${role.role} (${role.displayName})`);
      });
    } else {
      console.log('✅ All roles have users - No action needed');
      console.log('✅ Database is properly configured');
    }

    return {
      totalRoles: allRoles.length,
      rolesWithUsers: rolesWithUsers.length,
      rolesWithoutUsers: rolesWithoutUsers.length,
      isValid: isFullyValid,
      criticalRolesValid: isCriticalValid,
      missingRoles: rolesWithoutUsers,
      validationDetails: roleValidation
    };

  } catch (error) {
    console.error('❌ Error during role-user validation:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    const result = await validateRoleUserAssociation();
    
    console.log('\n✅ Role-User validation completed!');
    
    if (!result.isValid) {
      console.log('⚠️ Action required to fulfill database requirements');
      process.exit(1);
    } else {
      console.log('🎉 All database requirements fulfilled!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Role-User validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateRoleUserAssociation, connectDatabase };
