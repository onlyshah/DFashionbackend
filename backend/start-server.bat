@echo off
echo Starting DFashion Backend Server...
echo.
echo Current directory: %CD%
echo.

REM Check if Node.js is installed
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js is available
echo.

REM Check if package.json exists
if not exist package.json (
    echo ERROR: package.json not found
    echo Please make sure you're in the backend directory
    pause
    exit /b 1
)

echo package.json found
echo.

REM Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Dependencies are ready
echo.

REM Start the server
echo Starting server on port 5000...
echo.
echo Server will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

node index.js

pause
