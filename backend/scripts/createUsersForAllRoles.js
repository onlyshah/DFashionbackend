const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

// User templates for each role
const userTemplates = {
  super_admin: {
    username: 'superadmin',
    email: 'superadmin@dfashion.com',
    fullName: 'Super Administrator',
    bio: 'System Super Administrator with full access',
    phone: '+91 9000000001',
    department: 'administration'
  },
  admin: {
    username: 'admin',
    email: 'admin@dfashion.com', 
    fullName: 'System Administrator',
    bio: 'Platform Administrator',
    phone: '+91 9000000002',
    department: 'administration'
  },
  sales_manager: {
    username: 'sales_manager',
    email: 'sales.manager@dfashion.com',
    fullName: 'Rahul Sales Manager',
    bio: 'Sales Operations Manager',
    phone: '+91 9000000003',
    department: 'sales'
  },
  marketing_manager: {
    username: 'marketing_manager',
    email: 'marketing.manager@dfashion.com',
    fullName: 'Priya Marketing Manager',
    bio: 'Marketing Campaigns Manager',
    phone: '+91 9000000004',
    department: 'marketing'
  },
  account_manager: {
    username: 'account_manager',
    email: 'account.manager@dfashion.com',
    fullName: 'Suresh Account Manager',
    bio: 'Financial Operations Manager',
    phone: '+91 9000000005',
    department: 'accounting'
  },
  support_manager: {
    username: 'support_manager',
    email: 'support.manager@dfashion.com',
    fullName: 'Anita Support Manager',
    bio: 'Customer Support Manager',
    phone: '+91 9000000006',
    department: 'support'
  },
  content_manager: {
    username: 'content_manager',
    email: 'content.manager@dfashion.com',
    fullName: 'Vikram Content Manager',
    bio: 'Content Moderation Manager',
    phone: '+91 9000000007',
    department: 'content'
  },
  vendor_manager: {
    username: 'vendor_manager',
    email: 'vendor.manager@dfashion.com',
    fullName: 'Meera Vendor Manager',
    bio: 'Vendor Relations Manager',
    phone: '+91 9000000008',
    department: 'vendor_management'
  },
  sales_executive: {
    username: 'sales_executive',
    email: 'sales.executive@dfashion.com',
    fullName: 'Arjun Sales Executive',
    bio: 'Sales Team Executive',
    phone: '+91 9000000009',
    department: 'sales'
  },
  marketing_executive: {
    username: 'marketing_executive',
    email: 'marketing.executive@dfashion.com',
    fullName: 'Kavya Marketing Executive',
    bio: 'Marketing Team Executive',
    phone: '+91 9000000010',
    department: 'marketing'
  },
  accountant: {
    username: 'accountant',
    email: 'accountant@dfashion.com',
    fullName: 'Rajesh Accountant',
    bio: 'Financial Records Specialist',
    phone: '+91 9000000011',
    department: 'accounting'
  },
  support_agent: {
    username: 'support_agent',
    email: 'support.agent@dfashion.com',
    fullName: 'Sneha Support Agent',
    bio: 'Customer Support Agent',
    phone: '+91 9000000012',
    department: 'support'
  },
  vendor: {
    username: 'vendor_user',
    email: 'vendor@dfashion.com',
    fullName: 'Fashion Vendor',
    bio: 'Product Vendor and Seller',
    phone: '+91 9000000013',
    department: 'vendor_management'
  }
};

async function createUsersForAllRoles() {
  try {
    console.log('👥 Creating Users for All Roles...\n');
    console.log('=' .repeat(70));
    console.log('   Ensuring Every Role Has At Least One User');
    console.log('=' .repeat(70));
    console.log('');

    // Get all roles
    const allRoles = await Role.find({}).sort({ level: -1 });
    console.log(`📊 Found ${allRoles.length} roles in the system\n`);

    // Check which roles need users
    const rolesNeedingUsers = [];
    
    for (const role of allRoles) {
      const userCount = await User.countDocuments({ role: role.name });
      if (userCount === 0) {
        rolesNeedingUsers.push(role);
      }
    }

    console.log(`🔍 Found ${rolesNeedingUsers.length} roles without users\n`);

    if (rolesNeedingUsers.length === 0) {
      console.log('✅ All roles already have users - No action needed');
      return;
    }

    // Create users for roles that need them
    const plainPassword = 'password123';
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    
    console.log('👤 Creating users for roles without users:');
    console.log('-' .repeat(50));

    const createdUsers = [];

    for (const role of rolesNeedingUsers) {
      const template = userTemplates[role.name];
      
      if (!template) {
        console.log(`⚠️ No template found for role: ${role.name} - Skipping`);
        continue;
      }

      // Check if user with this email already exists
      const existingUser = await User.findOne({ email: template.email });
      if (existingUser) {
        console.log(`⚠️ User already exists for ${template.email} - Skipping`);
        continue;
      }

      const userData = {
        username: template.username,
        email: template.email,
        password: hashedPassword,
        fullName: template.fullName,
        role: role.name,
        department: template.department,
        isActive: true,
        isVerified: true,
        phone: template.phone,
        bio: template.bio,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(template.fullName)}&background=random`,
        address: {
          street: 'DFashion Office',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      };

      try {
        const newUser = await User.create(userData);
        createdUsers.push({
          role: role.name,
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName
        });
        
        console.log(`✅ Created user for ${role.name}:`);
        console.log(`   Username: ${newUser.username}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Full Name: ${newUser.fullName}`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ Failed to create user for ${role.name}:`, error.message);
      }
    }

    // Validation after creation
    console.log('🔍 Validating user creation...');
    console.log('-' .repeat(50));

    let validationPassed = true;
    const finalValidation = [];

    for (const role of allRoles) {
      const userCount = await User.countDocuments({ role: role.name });
      const hasUsers = userCount > 0;
      const status = hasUsers ? '✅' : '❌';
      
      console.log(`${status} ${role.name}: ${userCount} users`);
      
      finalValidation.push({
        role: role.name,
        userCount: userCount,
        hasUsers: hasUsers
      });
      
      if (!hasUsers) {
        validationPassed = false;
      }
    }

    // Summary
    console.log('\n📊 USER CREATION SUMMARY:');
    console.log('=' .repeat(70));
    console.log(`Total Roles: ${allRoles.length}`);
    console.log(`Users Created: ${createdUsers.length}`);
    console.log(`Roles Now With Users: ${finalValidation.filter(r => r.hasUsers).length}`);
    console.log(`Validation Status: ${validationPassed ? 'PASSED ✅' : 'FAILED ❌'}`);

    if (createdUsers.length > 0) {
      console.log('\n👥 CREATED USERS:');
      console.log('-' .repeat(50));
      createdUsers.forEach(user => {
        console.log(`✅ ${user.role}: ${user.username} (${user.email})`);
      });
      
      console.log('\n🔑 LOGIN CREDENTIALS:');
      console.log('-' .repeat(50));
      console.log('Password for all created users: password123');
      console.log('');
      console.log('Key accounts:');
      console.log('  Super Admin: superadmin@dfashion.com / password123');
      console.log('  Admin: admin@dfashion.com / password123');
      console.log('  Vendor: vendor@dfashion.com / password123');
    }

    if (validationPassed) {
      console.log('\n🎉 SUCCESS: All roles now have at least one user!');
      console.log('✅ Database requirement fulfilled');
    } else {
      console.log('\n⚠️ Some roles still missing users - Manual intervention needed');
    }

    return {
      totalRoles: allRoles.length,
      usersCreated: createdUsers.length,
      validationPassed: validationPassed,
      createdUsers: createdUsers
    };

  } catch (error) {
    console.error('❌ Error creating users for roles:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    const result = await createUsersForAllRoles();
    
    console.log('\n✅ User creation process completed!');
    
    if (result && result.validationPassed) {
      console.log('🎉 All database requirements fulfilled!');
      process.exit(0);
    } else {
      console.log('⚠️ Some issues remain - Check output above');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ User creation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createUsersForAllRoles, connectDatabase };
