const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Story = require('../models/Story');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const Reel = require('../models/Reel');
const Role = require('../models/Role');
const UserBehavior = require('../models/UserBehavior');

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

// Helper function to generate realistic Indian names
const generateIndianNames = () => {
  const firstNames = {
    male: ['Rajesh', 'Amit', 'Suresh', 'Vikash', 'Rohit', 'Arjun', 'Karan', 'Rahul', 'Anil', 'Deepak', 'Manoj', 'Sanjay', 'Vinod', 'Ashok', 'Ravi'],
    female: ['Priya', 'Sunita', 'Kavita', 'Neha', 'Pooja', 'Anjali', 'Rekha', 'Meera', 'Sita', 'Geeta', 'Anita', 'Shanti', 'Radha', 'Lakshmi', 'Sarita']
  };
  
  const lastNames = ['Sharma', 'Kumar', 'Singh', 'Gupta', 'Agarwal', 'Verma', 'Mishra', 'Jain', 'Patel', 'Shah', 'Mehta', 'Yadav', 'Tiwari', 'Pandey', 'Srivastava'];
  
  return { firstNames, lastNames };
};

// Helper function to generate user data for specific role
const generateUserData = (role, index, names) => {
  const { firstNames, lastNames } = names;
  const isAdmin = ['super_admin', 'admin', 'sales_manager', 'marketing_manager', 'account_manager', 'support_manager', 'content_manager', 'vendor_manager', 'sales_executive', 'marketing_executive', 'accountant', 'support_agent'].includes(role);
  
  // Select appropriate name based on role and index
  const gender = index % 2 === 0 ? 'male' : 'female';
  const firstName = firstNames[gender][index % firstNames[gender].length];
  const lastName = lastNames[index % lastNames.length];
  const fullName = `${firstName} ${lastName}`;
  const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}${index > 0 ? index : ''}`;
  
  // Generate role-specific email
  const emailPrefix = role === 'customer' ? username : `${role.replace('_', '')}.${firstName.toLowerCase()}`;
  const email = `${emailPrefix}@dfashion.com`;
  
  // Role-specific data
  const roleData = {
    super_admin: {
      bio: 'System Administrator with full access to all platform features',
      department: 'Administration',
      employeeId: `SA${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43210 + index).slice(-5)}`
    },
    admin: {
      bio: 'Platform Administrator managing day-to-day operations',
      department: 'Administration', 
      employeeId: `AD${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43220 + index).slice(-5)}`
    },
    sales_manager: {
      bio: 'Sales Manager overseeing sales operations and team performance',
      department: 'Sales',
      employeeId: `SM${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43230 + index).slice(-5)}`
    },
    sales_executive: {
      bio: 'Sales Executive handling customer relationships and sales targets',
      department: 'Sales',
      employeeId: `SE${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43240 + index).slice(-5)}`
    },
    marketing_manager: {
      bio: 'Marketing Manager developing strategies and campaigns',
      department: 'Marketing',
      employeeId: `MM${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43250 + index).slice(-5)}`
    },
    marketing_executive: {
      bio: 'Marketing Executive executing campaigns and content creation',
      department: 'Marketing',
      employeeId: `ME${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43260 + index).slice(-5)}`
    },
    account_manager: {
      bio: 'Account Manager handling financial operations and client accounts',
      department: 'Accounting',
      employeeId: `AM${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43270 + index).slice(-5)}`
    },
    accountant: {
      bio: 'Accountant managing financial records and transactions',
      department: 'Accounting',
      employeeId: `AC${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43280 + index).slice(-5)}`
    },
    support_manager: {
      bio: 'Support Manager leading customer service operations',
      department: 'Customer Support',
      employeeId: `SPM${String(index + 1).padStart(2, '0')}`,
      phone: `+91 98765${String(43290 + index).slice(-5)}`
    },
    support_agent: {
      bio: 'Support Agent providing customer assistance and resolving issues',
      department: 'Customer Support',
      employeeId: `SPA${String(index + 1).padStart(2, '0')}`,
      phone: `+91 98765${String(43300 + index).slice(-5)}`
    },
    content_manager: {
      bio: 'Content Manager overseeing content creation and moderation',
      department: 'Content',
      employeeId: `CM${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43310 + index).slice(-5)}`
    },
    vendor_manager: {
      bio: 'Vendor Manager handling vendor relationships and partnerships',
      department: 'Vendor Management',
      employeeId: `VM${String(index + 1).padStart(3, '0')}`,
      phone: `+91 98765${String(43320 + index).slice(-5)}`
    },
    customer: {
      bio: `Fashion enthusiast and regular shopper. Loves ${['ethnic wear', 'western fashion', 'accessories', 'footwear', 'casual wear'][index % 5]}.`,
      phone: `+91 98765${String(50000 + index).slice(-5)}`
    }
  };

  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Telangana', 'Maharashtra', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'];
  
  const cityIndex = index % cities.length;
  
  return {
    username,
    email,
    password: isAdmin ? `${role.charAt(0).toUpperCase() + role.slice(1).replace('_', '')}123!` : 'Customer123!',
    fullName,
    role: role,
    isActive: true,
    isVerified: true,
    phone: roleData[role].phone,
    bio: roleData[role].bio,
    avatar: `https://images.unsplash.com/photo-${1500000000000 + index}?w=150&h=150&fit=crop&crop=face`,
    address: {
      street: `${100 + index} ${['MG Road', 'Park Street', 'Brigade Road', 'Anna Salai', 'Sector ' + (index + 1)][index % 5]}`,
      city: cities[cityIndex],
      state: states[cityIndex],
      zipCode: String(400001 + index),
      country: 'India'
    },
    socialStats: {
      postsCount: isAdmin ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * 50),
      followersCount: isAdmin ? Math.floor(Math.random() * 100) : Math.floor(Math.random() * 1000),
      followingCount: isAdmin ? Math.floor(Math.random() * 50) : Math.floor(Math.random() * 200)
    },
    preferences: {
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false
      }
    },
    // Add employee data for admin roles
    ...(isAdmin && {
      employeeId: roleData[role].employeeId,
      department: roleData[role].department,
      joinDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      salary: {
        basic: role.includes('manager') ? 80000 + (index * 5000) : 50000 + (index * 3000),
        currency: 'INR'
      }
    })
  };
};

async function seedComprehensiveData() {
  try {
    console.log('🚀 Starting Comprehensive Database Seeding with Role-Based Users...\n');

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Role.deleteMany({})
    ]);
    console.log('✅ Existing data cleared\n');

    // 1. Create Roles
    console.log('🔐 Creating comprehensive role system...');
    const roles = await Role.create([
      {
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        department: 'administration',
        level: 10,
        permissions: {
          users: { create: true, read: true, update: true, delete: true },
          products: { create: true, read: true, update: true, delete: true },
          orders: { create: true, read: true, update: true, delete: true },
          categories: { create: true, read: true, update: true, delete: true },
          vendors: { create: true, read: true, update: true, delete: true },
          analytics: { create: true, read: true, update: true, delete: true },
          settings: { create: true, read: true, update: true, delete: true },
          roles: { create: true, read: true, update: true, delete: true }
        },
        isActive: true
      },
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrative access with most permissions',
        department: 'administration',
        level: 9,
        permissions: {
          users: { create: true, read: true, update: true, delete: false },
          products: { create: true, read: true, update: true, delete: true },
          orders: { create: true, read: true, update: true, delete: false },
          categories: { create: true, read: true, update: true, delete: true },
          vendors: { create: true, read: true, update: true, delete: false },
          analytics: { create: false, read: true, update: false, delete: false },
          settings: { create: false, read: true, update: true, delete: false }
        },
        isActive: true
      },
      {
        name: 'sales_manager',
        displayName: 'Sales Manager',
        description: 'Manages sales operations and team',
        department: 'sales',
        level: 7,
        permissions: {
          orders: { create: true, read: true, update: true, delete: false },
          products: { create: false, read: true, update: false, delete: false },
          analytics: { create: false, read: true, update: false, delete: false },
          users: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'marketing_manager',
        displayName: 'Marketing Manager',
        description: 'Manages marketing campaigns and content',
        department: 'marketing',
        level: 7,
        permissions: {
          products: { create: true, read: true, update: true, delete: false },
          content: { create: true, read: true, update: true, delete: true },
          analytics: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'account_manager',
        displayName: 'Account Manager',
        description: 'Manages financial operations and accounts',
        department: 'accounting',
        level: 6,
        permissions: {
          orders: { create: false, read: true, update: true, delete: false },
          analytics: { create: false, read: true, update: false, delete: false },
          reports: { create: true, read: true, update: true, delete: false }
        },
        isActive: true
      },
      {
        name: 'support_manager',
        displayName: 'Support Manager',
        description: 'Manages customer support operations',
        department: 'support',
        level: 6,
        permissions: {
          users: { create: false, read: true, update: true, delete: false },
          orders: { create: false, read: true, update: true, delete: false },
          support: { create: true, read: true, update: true, delete: false }
        },
        isActive: true
      },
      {
        name: 'content_manager',
        displayName: 'Content Manager',
        description: 'Manages content creation and moderation',
        department: 'content',
        level: 6,
        permissions: {
          content: { create: true, read: true, update: true, delete: true },
          products: { create: false, read: true, update: true, delete: false }
        },
        isActive: true
      },
      {
        name: 'vendor_manager',
        displayName: 'Vendor Manager',
        description: 'Manages vendor relationships and partnerships',
        department: 'vendor_management',
        level: 6,
        permissions: {
          vendors: { create: true, read: true, update: true, delete: false },
          products: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'sales_executive',
        displayName: 'Sales Executive',
        description: 'Handles sales operations and customer relations',
        department: 'sales',
        level: 5,
        permissions: {
          orders: { create: true, read: true, update: true, delete: false },
          users: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'marketing_executive',
        displayName: 'Marketing Executive',
        description: 'Executes marketing campaigns and content creation',
        department: 'marketing',
        level: 5,
        permissions: {
          content: { create: true, read: true, update: true, delete: false },
          products: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'accountant',
        displayName: 'Accountant',
        description: 'Manages financial records and transactions',
        department: 'accounting',
        level: 4,
        permissions: {
          orders: { create: false, read: true, update: false, delete: false },
          reports: { create: true, read: true, update: true, delete: false }
        },
        isActive: true
      },
      {
        name: 'support_agent',
        displayName: 'Support Agent',
        description: 'Provides customer support and assistance',
        department: 'support',
        level: 3,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          orders: { create: false, read: true, update: false, delete: false },
          support: { create: true, read: true, update: true, delete: false }
        },
        isActive: true
      },
      {
        name: 'customer',
        displayName: 'Customer',
        description: 'End user with shopping and social features access',
        department: 'customer_service',
        level: 1,
        permissions: {},
        isActive: true
      }
    ]);

    console.log(`✅ Created ${roles.length} roles\n`);

    // 2. Create Users for Each Role
    console.log('👥 Creating comprehensive user base...');
    
    const names = generateIndianNames();
    const allUsers = [];

    // Create admin users (1-2 per role)
    const adminRoles = ['super_admin', 'admin', 'sales_manager', 'marketing_manager', 'account_manager', 'support_manager', 'content_manager', 'vendor_manager'];
    
    for (const role of adminRoles) {
      for (let i = 0; i < 2; i++) {
        allUsers.push(generateUserData(role, i, names));
      }
    }

    // Create executive/staff users (2-3 per role)
    const staffRoles = ['sales_executive', 'marketing_executive', 'accountant', 'support_agent'];
    
    for (const role of staffRoles) {
      for (let i = 0; i < 3; i++) {
        allUsers.push(generateUserData(role, i, names));
      }
    }

    // Create customer users (20 users)
    for (let i = 0; i < 20; i++) {
      allUsers.push(generateUserData('customer', i, names));
    }

    // Insert all users
    const createdUsers = await User.create(allUsers);
    console.log(`✅ Created ${createdUsers.length} users across all roles\n`);

    // Display summary
    console.log('📊 User Creation Summary:');
    const usersByRole = createdUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    Object.entries(usersByRole).forEach(([role, count]) => {
      console.log(`   ${role.replace('_', ' ').toUpperCase()}: ${count} users`);
    });

    console.log('\n🎉 Comprehensive database seeding completed successfully!');
    console.log('\n📋 Login Credentials Summary:');
    console.log('=' .repeat(60));
    
    // Display login credentials for admin users
    const adminUsers = createdUsers.filter(user => 
      ['super_admin', 'admin', 'sales_manager', 'marketing_manager', 'account_manager', 'support_manager'].includes(user.role)
    );

    adminUsers.forEach(user => {
      console.log(`${user.role.toUpperCase().replace('_', ' ')}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', '')}123!`);
      console.log(`   Full Name: ${user.fullName}`);
      console.log('');
    });

    console.log('CUSTOMER SAMPLE:');
    console.log(`   Email: ${createdUsers.find(u => u.role === 'customer').email}`);
    console.log(`   Password: Customer123!`);
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await seedComprehensiveData();
    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedComprehensiveData, connectDatabase };
