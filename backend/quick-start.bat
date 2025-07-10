@echo off
echo ========================================
echo    DFashion Backend Quick Start
echo ========================================
echo.

echo 🔍 Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found!
echo.

echo 🔍 Checking MongoDB connection...
mongo --eval "db.adminCommand('ismaster')" --quiet
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB not running. Please start MongoDB first.
    echo    You can start it with: net start MongoDB
    echo    Or run: mongod --dbpath "C:\data\db"
    pause
)

echo.
echo 📦 Installing dependencies...
npm install

echo.
echo 🌱 Setting up database...
echo Creating admin users...
node scripts/createAdminUsers.js

echo.
echo 🚀 Starting DFashion Backend Server...
echo.
echo ========================================
echo    Server will start on port 3000
echo    Admin Panel: http://localhost:4200/admin
echo ========================================
echo.
echo 📋 LOGIN CREDENTIALS:
echo.
echo 🔴 SUPER ADMIN:
echo    Email: superadmin@dfashion.com
echo    Password: SuperAdmin123!
echo.
echo 🟡 ADMIN:
echo    Email: admin@dfashion.com
echo    Password: Admin123!
echo.
echo 🟢 CUSTOMER (No Admin Access):
echo    Email: customer@dfashion.com
echo    Password: Customer123!
echo.
echo ========================================
echo.

npm run dev
