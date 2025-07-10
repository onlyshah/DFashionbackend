const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');

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

// Role to Department Mapping
const roleDepartmentMapping = {
  'super_admin': 'administration',
  'admin': 'administration',
  'sales_manager': 'sales',
  'sales_executive': 'sales',
  'marketing_manager': 'marketing',
  'marketing_executive': 'marketing',
  'account_manager': 'accounting',
  'accountant': 'accounting',
  'support_manager': 'support',
  'support_agent': 'support',
  'content_manager': 'content',
  'vendor_manager': 'vendor_management',
  'customer': 'customer_service',
  'vendor': 'vendor_management'
};

async function fixDepartmentAssignments() {
  try {
    console.log('🔧 Starting Department Assignment Fix...\n');
    console.log('=' .repeat(60));
    console.log('   Fixing Role-Department Mapping Issues');
    console.log('=' .repeat(60));
    console.log('');

    // Get all users with their roles
    const users = await User.find({}).populate('role');
    console.log(`📊 Found ${users.length} users to check`);

    let fixedCount = 0;
    let issuesFound = 0;

    console.log('\n🔍 Analyzing current assignments...');
    console.log('-' .repeat(40));

    for (const user of users) {
      const currentDepartment = user.department;
      const userRole = user.role;
      const expectedDepartment = roleDepartmentMapping[userRole];

      console.log(`👤 ${user.username} (${user.email})`);
      console.log(`   Role: ${userRole}`);
      console.log(`   Current Department: ${currentDepartment}`);
      console.log(`   Expected Department: ${expectedDepartment}`);

      if (currentDepartment !== expectedDepartment) {
        issuesFound++;
        console.log(`   ❌ MISMATCH DETECTED!`);
        
        // Fix the assignment
        user.department = expectedDepartment;
        await user.save();
        fixedCount++;
        
        console.log(`   ✅ FIXED: Updated to ${expectedDepartment}`);
      } else {
        console.log(`   ✅ CORRECT: Already properly assigned`);
      }
      console.log('');
    }

    // Summary
    console.log('📋 DEPARTMENT ASSIGNMENT FIX SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Users Checked: ${users.length}`);
    console.log(`Issues Found: ${issuesFound}`);
    console.log(`Assignments Fixed: ${fixedCount}`);
    console.log(`Correct Assignments: ${users.length - issuesFound}`);

    // Verify the fixes
    console.log('\n🔍 Verification - Current Department Distribution:');
    console.log('-' .repeat(40));
    
    const updatedUsers = await User.find({});
    const departmentCounts = {};
    
    updatedUsers.forEach(user => {
      const dept = user.department || 'undefined';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    Object.entries(departmentCounts).forEach(([dept, count]) => {
      console.log(`   ${dept}: ${count} users`);
    });

    // Check for any remaining mismatches
    console.log('\n🔍 Final Validation:');
    console.log('-' .repeat(40));
    
    const remainingIssues = [];
    for (const user of updatedUsers) {
      const expectedDept = roleDepartmentMapping[user.role];
      if (user.department !== expectedDept) {
        remainingIssues.push({
          user: user.username,
          role: user.role,
          currentDept: user.department,
          expectedDept: expectedDept
        });
      }
    }

    if (remainingIssues.length === 0) {
      console.log('✅ ALL ROLE-DEPARTMENT ASSIGNMENTS ARE NOW CORRECT!');
    } else {
      console.log(`❌ ${remainingIssues.length} issues still remain:`);
      remainingIssues.forEach(issue => {
        console.log(`   ${issue.user}: ${issue.role} → ${issue.currentDept} (should be ${issue.expectedDept})`);
      });
    }

    console.log('\n🎉 Department assignment fix completed!');

  } catch (error) {
    console.error('❌ Error during department assignment fix:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await fixDepartmentAssignments();
    console.log('\n✅ Department assignment fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Department assignment fix failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fixDepartmentAssignments, connectDatabase };
