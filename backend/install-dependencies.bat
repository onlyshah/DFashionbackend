@echo off
title DFashion Backend Dependencies Installation
color 0A

echo ========================================
echo    📦 DFashion Backend Dependencies
echo    Installing Missing Security Modules
echo ========================================
echo.

echo 🔍 Checking Node.js and npm...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

npm --version
if %errorlevel% neq 0 (
    echo ❌ npm not found! Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm found!
echo.

echo 🧹 Cleaning npm cache...
npm cache clean --force

echo.
echo 📦 Installing all dependencies...
echo    This may take a few minutes...
echo.

npm install

if %errorlevel% equ 0 (
    echo.
    echo ✅ All dependencies installed successfully!
    echo.
    echo 📋 Security modules installed:
    echo    ✅ express-mongo-sanitize - NoSQL injection protection
    echo    ✅ express-slow-down - Rate limiting
    echo    ✅ helmet - Security headers
    echo    ✅ hpp - HTTP Parameter Pollution protection
    echo    ✅ uuid - Unique ID generation
    echo    ✅ validator - Input validation
    echo    ✅ winston - Logging
    echo    ✅ xss - XSS protection
    echo.
    echo 🚀 Backend is now ready to start!
    echo    Run: npm run dev
    echo.
) else (
    echo.
    echo ❌ Installation failed!
    echo    Please check the error messages above.
    echo.
    echo 🔧 Troubleshooting tips:
    echo    1. Make sure you have internet connection
    echo    2. Try running as administrator
    echo    3. Delete node_modules folder and try again
    echo    4. Check if npm registry is accessible
    echo.
)

echo Press any key to exit...
pause >nul
