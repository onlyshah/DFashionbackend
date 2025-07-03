@echo off
REM =====================================================
REM DFashion PostgreSQL Database Setup Script (Windows)
REM =====================================================
REM This script sets up the complete DFashion database with all data
REM 
REM Prerequisites:
REM - PostgreSQL installed and running
REM - psql command available in PATH
REM - Database user with CREATE privileges
REM
REM Usage: setup_database.bat

echo.
echo 🚀 Setting up DFashion PostgreSQL Database...
echo ==============================================

REM Configuration
set DB_NAME=dfashion
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432

echo [INFO] Checking PostgreSQL connection...
pg_isready -h %DB_HOST% -p %DB_PORT% -U %DB_USER% >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Cannot connect to PostgreSQL. Please ensure PostgreSQL is running.
    echo [ERROR] Host: %DB_HOST%, Port: %DB_PORT%, User: %DB_USER%
    pause
    exit /b 1
)
echo [SUCCESS] PostgreSQL is running and accessible

echo [INFO] Checking if database '%DB_NAME%' exists...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -lqt | findstr /C:"%DB_NAME%" >nul
if not errorlevel 1 (
    echo [WARNING] Database '%DB_NAME%' already exists
    set /p "choice=Do you want to drop and recreate it? (y/N): "
    if /i "%choice%"=="y" (
        echo [INFO] Dropping existing database...
        dropdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
        echo [SUCCESS] Database dropped
    ) else (
        echo [WARNING] Using existing database. Data may be duplicated.
    )
)

REM Create database if it doesn't exist
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -lqt | findstr /C:"%DB_NAME%" >nul
if errorlevel 1 (
    echo [INFO] Creating database '%DB_NAME%'...
    createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
    echo [SUCCESS] Database '%DB_NAME%' created
)

REM Run the setup script
echo [INFO] Running database setup script...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f postgres_setup_with_data.sql
if errorlevel 1 (
    echo [ERROR] Database setup failed. Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo [SUCCESS] 🎉 DFashion Database Setup Complete! 🎉
echo ==============================================
echo.
echo [INFO] Database Details:
echo   📍 Host: %DB_HOST%
echo   🔌 Port: %DB_PORT%
echo   🗄️  Database: %DB_NAME%
echo   👤 User: %DB_USER%
echo.
echo [INFO] 🔑 Login Credentials for Testing:
echo   👤 User Account:
echo      📧 Email: rajesh@example.com
echo      🔒 Password: password123
echo.
echo   🏪 Vendor Account:
echo      📧 Email: maya@example.com
echo      🔒 Password: password123
echo.
echo [INFO] 📊 Database contains:
echo   • 5 Users (including vendors and customers)
echo   • 8 Product Categories
echo   • 10 Products with images
echo   • 5 Stories with product tags
echo   • 5 Posts with product tags
echo   • Wishlists, Carts, and Orders
echo   • Complete relational data structure
echo.
echo [SUCCESS] Your DFashion database is ready to use!
echo You can now update your application's database connection string.
echo.
pause
