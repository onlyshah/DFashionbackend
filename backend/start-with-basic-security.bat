@echo off
title DFashion Backend - Basic Security Mode
color 0A

echo ========================================
echo    🚀 DFashion Backend Server
echo    Starting with Basic Security
echo ========================================
echo.

echo 🔍 Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found!
echo.

echo 🔍 Checking MongoDB connection...
mongo --eval "db.adminCommand('ismaster')" --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB not running or not accessible.
    echo    Please start MongoDB first:
    echo    - Option 1: net start MongoDB
    echo    - Option 2: mongod --dbpath "C:\data\db"
    echo    - Option 3: Start MongoDB Compass
    echo.
    echo    Press any key to continue anyway...
    pause >nul
)

echo.
echo 📦 Installing basic dependencies...
npm install express cors helmet express-rate-limit mongoose bcryptjs jsonwebtoken dotenv

echo.
echo 🗄️  Setting up database...
echo    Creating basic admin users...
node scripts/createAdminUsers.js

echo.
echo 🚀 Starting DFashion Backend Server...
echo    Backend will run on: http://localhost:3001
echo    Basic security features enabled
echo.
echo ========================================
echo    📱 Application URLs:
echo ========================================
echo    🌐 Frontend:     http://localhost:4200
echo    🔐 Admin Panel:  http://localhost:4200/admin
echo    🔧 Backend API:  http://localhost:3001
echo.
echo ========================================
echo    🔑 Login Credentials:
echo ========================================
echo.
echo 🔴 SUPER ADMIN:
echo    Email:    superadmin@dfashion.com
echo    Password: SuperAdmin123!
echo.
echo 🟡 ADMIN:
echo    Email:    admin@dfashion.com
echo    Password: Admin123!
echo.
echo 🟢 CUSTOMER:
echo    Email:    customer@dfashion.com
echo    Password: Customer123!
echo.
echo ========================================
echo.

npm run dev
