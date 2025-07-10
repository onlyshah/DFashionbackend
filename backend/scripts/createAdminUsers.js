const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Role = require('../models/Role');

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Create admin users
const createAdminUsers = async () => {
  try {
    console.log('🔐 Creating admin users...');

    // Check if roles exist
    const roles = await Role.find({});
    console.log(`📋 Found ${roles.length} roles in database`);

    // Admin users to create
    const adminUsers = [
      {
        username: 'superadmin',
        email: 'superadmin@dfashion.com',
        password: 'SuperAdmin123!',
        fullName: 'Super Administrator',
        role: 'super_admin',
        isActive: true,
        isVerified: true,
        phone: '+1234567890',
        address: {
          street: '123 Admin Street',
          city: 'Admin City',
          state: 'Admin State',
          zipCode: '12345',
          country: 'USA'
        }
      },
      {
        username: 'admin',
        email: 'admin@dfashion.com',
        password: 'Admin123!',
        fullName: 'Administrator',
        role: 'admin',
        isActive: true,
        isVerified: true,
        phone: '+1234567891',
        address: {
          street: '124 Admin Street',
          city: 'Admin City',
          state: 'Admin State',
          zipCode: '12345',
          country: 'USA'
        }
      },
      {
        username: 'customer',
        email: 'customer@dfashion.com',
        password: 'Customer123!',
        fullName: 'Test Customer',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+1234567892',
        address: {
          street: '125 Customer Street',
          city: 'Customer City',
          state: 'Customer State',
          zipCode: '12345',
          country: 'USA'
        }
      },
      {
        username: 'salesmanager',
        email: 'salesmanager@dfashion.com',
        password: 'SalesManager123!',
        fullName: 'Sales Manager',
        role: 'sales_manager',
        isActive: true,
        isVerified: true,
        phone: '+1234567893',
        address: {
          street: '126 Sales Street',
          city: 'Sales City',
          state: 'Sales State',
          zipCode: '12345',
          country: 'USA'
        }
      }
    ];

    for (const userData of adminUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await user.save();
      console.log(`✅ Created user: ${userData.username} (${userData.role})`);
    }

    console.log('🎉 Admin users created successfully!');
    
    // Display login credentials
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('='.repeat(50));
    console.log('🔴 SUPER ADMIN:');
    console.log('   Email: superadmin@dfashion.com');
    console.log('   Password: SuperAdmin123!');
    console.log('   Role: super_admin (Full Access)');
    console.log('');
    console.log('🟡 ADMIN:');
    console.log('   Email: admin@dfashion.com');
    console.log('   Password: Admin123!');
    console.log('   Role: admin (Limited Access)');
    console.log('');
    console.log('🟢 CUSTOMER:');
    console.log('   Email: customer@dfashion.com');
    console.log('   Password: Customer123!');
    console.log('   Role: customer (No Admin Access)');
    console.log('');
    console.log('🔵 SALES MANAGER:');
    console.log('   Email: salesmanager@dfashion.com');
    console.log('   Password: SalesManager123!');
    console.log('   Role: sales_manager (Sales Access)');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error creating admin users:', error.message);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await createAdminUsers();
    
    console.log('\n🚀 Setup complete! You can now:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend server: ng serve');
    console.log('3. Access admin panel: http://localhost:4200/admin');
    console.log('4. Test different user roles with the credentials above');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

// Run the script
main();
