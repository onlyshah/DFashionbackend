@echo off
title DFashion Database Setup
color 0A

echo ========================================
echo    🗄️  DFashion Database Setup
echo    Complete Data Seeding Process
echo ========================================
echo.

echo 🔍 Checking MongoDB connection...
mongo --eval "db.adminCommand('ismaster')" --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB not running!
    echo    Please start MongoDB first:
    echo    - Option 1: net start MongoDB
    echo    - Option 2: mongod --dbpath "C:\data\db"
    echo    - Option 3: Start MongoDB Compass
    echo.
    pause
    exit /b 1
)

echo ✅ MongoDB is running!
echo.

echo 🚀 Starting comprehensive database seeding...
echo    This will create:
echo    - All user roles (13 roles)
echo    - Admin and staff users (16 users)
echo    - Customer users (20 users)
echo    - Product categories (4 categories)
echo    - Fashion products (10 products)
echo    - Customer orders (40-100 orders)
echo    - Shopping carts and wishlists
echo.

echo ⏳ Please wait while we set up your database...
echo.

node scripts/masterSeed.js

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Database setup completed successfully!
    echo.
    echo 📋 What's been created:
    echo    ✅ Complete role-based user system
    echo    ✅ Admin users for all departments
    echo    ✅ Customer users with realistic data
    echo    ✅ Fashion product catalog
    echo    ✅ Order history and commerce data
    echo    ✅ Shopping carts and wishlists
    echo.
    echo 🔑 Admin login credentials have been displayed above.
    echo 🌐 You can now start the application servers.
    echo.
) else (
    echo.
    echo ❌ Database setup failed!
    echo    Please check the error messages above.
    echo.
)

echo Press any key to exit...
pause >nul
