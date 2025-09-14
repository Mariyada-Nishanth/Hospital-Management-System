@echo off
REM Build verification script for Netlify deployment (Windows)
REM This script checks if the build will succeed

echo 🏥 Hospital Management System - Build Verification
echo ==================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed
    exit /b 1
)

echo ✅ npm version: 
npm --version

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ package.json not found
    exit /b 1
)

echo ✅ package.json found

REM Check if netlify.toml exists
if not exist "netlify.toml" (
    echo ❌ netlify.toml not found
    exit /b 1
)

echo ✅ netlify.toml found

REM Check if _redirects exists
if not exist "public\_redirects" (
    echo ❌ public\_redirects not found
    exit /b 1
)

echo ✅ public\_redirects found

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Run linting
echo 🔍 Running linter...
npm run lint
if %errorlevel% neq 0 (
    echo ⚠️  Linting failed, but continuing with build
)

REM Test build
echo 🏗️  Testing build...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

echo ✅ Build successful

REM Check if dist directory exists
if exist "dist" (
    echo ✅ Build artifacts created successfully
    echo 📁 Build output directory: dist\
) else (
    echo ❌ Build artifacts not found
    exit /b 1
)

echo.
echo 🎉 Build verification completed successfully!
echo 🚀 Your project is ready for Netlify deployment!
echo.
echo Next steps:
echo 1. Push your code to GitHub
echo 2. Connect your repository to Netlify
echo 3. Set up environment variables in Netlify dashboard
echo 4. Deploy!
pause
