@echo off
title DFashion Complete Database Setup
color 0A

echo ========================================
echo    🚀 DFashion Complete Database Setup
echo    Roles, Users, Products, Stories & More
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

echo 📋 What will be created:
echo    ✅ 14 Roles (super_admin, admin, customer, vendor, etc.)
echo    ✅ 25+ Users with proper role assignments
echo    ✅ 50+ Products with categories and variants
echo    ✅ 30+ Orders with realistic data
echo    ✅ 12+ Stories with fashion content
echo    ✅ 15+ Carts and wishlists
echo    ✅ 100+ Notifications and analytics
echo    ✅ Complete e-commerce database
echo.

echo ⚠️  WARNING: This will clear existing data!
echo    All current users, products, orders will be deleted.
echo.
set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo ❌ Setup cancelled by user.
    pause
    exit /b 0
)

echo.
echo ⏳ Starting complete database seeding...
echo    This may take 2-3 minutes...
echo.

node scripts/seedComplete.js

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Complete database setup successful!
    echo.
    echo 📋 What's been created:
    echo    ✅ Complete role hierarchy with permissions
    echo    ✅ Admin and customer users ready for testing
    echo    ✅ Full product catalog with categories
    echo    ✅ Realistic orders and commerce data
    echo    ✅ Social features (stories, posts, etc.)
    echo    ✅ Shopping features (carts, wishlists)
    echo.
    echo 🔑 Test Login Credentials:
    echo    Super Admin: rajesh@example.com / password123
    echo    Customer: priya@example.com / password123
    echo    Vendor: maya@example.com / password123
    echo.
    echo 🚀 Next Steps:
    echo    1. Start backend: npm run dev
    echo    2. Start frontend: ng serve
    echo    3. Access app: http://localhost:4200
    echo    4. Admin panel: http://localhost:4200/admin
    echo.
) else (
    echo.
    echo ❌ Database setup failed!
    echo    Please check the error messages above.
    echo.
    echo 🔧 Common issues:
    echo    1. MongoDB not running properly
    echo    2. Database connection issues
    echo    3. Missing dependencies
    echo.
    echo 💡 Try:
    echo    1. Restart MongoDB service
    echo    2. Check MongoDB logs
    echo    3. Run: npm install
    echo.
)

echo Press any key to exit...
pause >nul
