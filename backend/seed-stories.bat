@echo off
title DFashion Stories Database Seeder
color 0A

echo ========================================
echo    📚 DFashion Stories Database Seeder
echo    Creating Fashion Stories Content
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

echo 🔍 Checking if users exist...
mongo dfashion --eval "db.users.countDocuments()" --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  No users found in database.
    echo    Please run user seeding first:
    echo    node scripts/createAdminUsers.js
    echo.
    echo    Press any key to continue anyway...
    pause >nul
)

echo.
echo 📚 Starting Stories Database Seeding...
echo    This will create:
echo    - 8-10 fashion-themed stories
echo    - Stories for different users
echo    - Product tags in stories
echo    - Realistic engagement data
echo.

echo ⏳ Please wait while we create stories...
echo.

node scripts/seedStories.js

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Stories seeding completed successfully!
    echo.
    echo 📋 What's been created:
    echo    ✅ Fashion-themed story content
    echo    ✅ Stories for multiple users
    echo    ✅ Product integration in stories
    echo    ✅ Realistic engagement metrics
    echo    ✅ 24-hour expiry system
    echo.
    echo 🔄 Now restart your frontend to see stories:
    echo    1. Stop frontend (Ctrl+C)
    echo    2. Start frontend (ng serve)
    echo    3. Refresh browser
    echo.
    echo 🎯 Expected result:
    echo    Stories Debug Info should show "Stories Count: 8+" 
    echo.
) else (
    echo.
    echo ❌ Stories seeding failed!
    echo    Please check the error messages above.
    echo.
    echo 🔧 Common issues:
    echo    1. MongoDB not running
    echo    2. No users in database
    echo    3. Database connection issues
    echo.
    echo 💡 Try running:
    echo    node scripts/createAdminUsers.js
    echo    Then run this script again.
    echo.
)

echo Press any key to exit...
pause >nul
