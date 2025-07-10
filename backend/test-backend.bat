@echo off
title Test DFashion Backend
color 0A

echo ========================================
echo    🧪 Testing DFashion Backend
echo ========================================
echo.

echo 🔍 Testing backend connection...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is responding!
    echo.
    echo 📋 Health Check Response:
    curl -s http://localhost:3001/api/health
    echo.
    echo.
    echo 🔐 Testing CORS for login endpoint...
    curl -s -X OPTIONS http://localhost:3001/api/auth/login -H "Origin: http://localhost:4200" -I
    echo.
    echo ✅ Backend is ready for frontend connections!
) else (
    echo ❌ Backend is not responding!
    echo.
    echo 🔧 Troubleshooting steps:
    echo    1. Make sure backend is running: npm run dev
    echo    2. Check if port 3001 is available
    echo    3. Verify MongoDB is running
    echo    4. Check for error messages in backend console
)

echo.
pause
