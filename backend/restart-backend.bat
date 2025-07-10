@echo off
title DFashion Backend - Restart with Fixes
color 0A

echo ========================================
echo    🔄 Restarting DFashion Backend
echo    With API Endpoint Fixes
echo ========================================
echo.

echo 🛑 Stopping any existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1

echo ✅ Processes stopped
echo.

echo 🚀 Starting DFashion Backend with fixes...
echo    - Fixed rate limiting for OPTIONS requests
echo    - Added missing endpoint redirects
echo    - Improved CORS handling
echo.

echo 📋 Backend will be available at:
echo    🔧 API: http://localhost:3001
echo    🏥 Health Check: http://localhost:3001/api/health
echo    🔐 Auth: http://localhost:3001/api/auth
echo.

echo ⏳ Starting server...
npm run dev
