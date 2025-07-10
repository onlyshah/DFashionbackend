@echo off
title DFashion Backend - Emergency Start
color 0C

echo ========================================
echo    🚨 DFashion Backend Emergency Start
echo    Fixing Connection Issues
echo ========================================
echo.

echo 🛑 Step 1: Stopping all Node.js processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im nodemon.exe >nul 2>&1
echo ✅ Processes stopped

echo.
echo 🔍 Step 2: Checking MongoDB...
mongo --eval "db.adminCommand('ismaster')" --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB not running! Starting MongoDB...
    echo.
    echo 🔧 Trying to start MongoDB service...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️  MongoDB service failed. Trying manual start...
        echo    Please run in another terminal: mongod --dbpath "C:\data\db"
        echo    Press any key when MongoDB is running...
        pause >nul
    ) else (
        echo ✅ MongoDB service started
    )
) else (
    echo ✅ MongoDB is running
)

echo.
echo 📦 Step 3: Installing essential dependencies...
npm install express cors helmet express-rate-limit mongoose bcryptjs jsonwebtoken dotenv compression multer socket.io

echo.
echo 🗄️  Step 4: Creating admin users...
node scripts/createAdminUsers.js

echo.
echo 🚀 Step 5: Starting DFashion Backend...
echo.
echo ========================================
echo    📱 Application URLs:
echo ========================================
echo    🔧 Backend API:  http://localhost:3001
echo    🏥 Health Check: http://localhost:3001/api/health
echo    🔐 Auth Login:   http://localhost:3001/api/auth/login
echo    🌐 Frontend:     http://localhost:4200
echo    🔐 Admin Panel:  http://localhost:4200/admin
echo.
echo ========================================
echo    🔑 Test Credentials:
echo ========================================
echo    Super Admin: superadmin@dfashion.com / SuperAdmin123!
echo    Admin:       admin@dfashion.com / Admin123!
echo    Customer:    customer@dfashion.com / Customer123!
echo.
echo ⏳ Starting server... (Keep this window open)
echo.

npm run dev

echo.
echo ❌ Backend server stopped or failed to start!
echo    Check the error messages above.
echo.
pause
