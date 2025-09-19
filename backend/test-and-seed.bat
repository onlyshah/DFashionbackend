@echo off
echo ========================================
echo DFashion Backend - Test and Seed Script
echo ========================================
echo.

echo 🔍 Testing backend server connection...
curl -s http://localhost:9000/api/test
echo.
echo.

echo 🌱 Seeding database with sample data...
curl -X POST -s http://localhost:9000/api/seed
echo.
echo.

echo 🧪 Testing API endpoints...
echo.

echo 📂 Testing categories endpoint:
curl -s http://localhost:9000/api/v1/categories
echo.
echo.

echo 👕 Testing products endpoint:
curl -s "http://localhost:9000/api/v1/products?limit=3"
echo.
echo.

echo 📊 Testing analytics endpoint:
curl -s http://localhost:9000/api/v1/analytics/overview
echo.
echo.

echo 🎯 Testing recommendations endpoint:
curl -s "http://localhost:9000/api/v1/recommendations/trending?limit=3"
echo.
echo.

echo ========================================
echo ✅ Backend testing completed!
echo ========================================
pause
