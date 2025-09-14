#!/bin/bash

# Build verification script for Netlify deployment
# This script checks if the build will succeed

echo "🏥 Hospital Management System - Build Verification"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi

echo "✅ package.json found"

# Check if netlify.toml exists
if [ ! -f "netlify.toml" ]; then
    echo "❌ netlify.toml not found"
    exit 1
fi

echo "✅ netlify.toml found"

# Check if _redirects exists
if [ ! -f "public/_redirects" ]; then
    echo "❌ public/_redirects not found"
    exit 1
fi

echo "✅ public/_redirects found"

# Install dependencies
echo "📦 Installing dependencies..."
if npm install; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Run linting
echo "🔍 Running linter..."
if npm run lint; then
    echo "✅ Linting passed"
else
    echo "⚠️  Linting failed, but continuing with build"
fi

# Test build
echo "🏗️  Testing build..."
if npm run build; then
    echo "✅ Build successful"
    echo "📁 Build output directory: dist/"
    
    # Check if dist directory exists and has content
    if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
        echo "✅ Build artifacts created successfully"
        echo "📊 Build size: $(du -sh dist | cut -f1)"
    else
        echo "❌ Build artifacts not found"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Build verification completed successfully!"
echo "🚀 Your project is ready for Netlify deployment!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Netlify"
echo "3. Set up environment variables in Netlify dashboard"
echo "4. Deploy!"
