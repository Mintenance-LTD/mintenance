#!/bin/bash

# Mintenance App Setup Script
# Run this script to set up your development environment

echo "🚀 Setting up Mintenance app..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual Supabase credentials!"
else
    echo "✅ .env file already exists"
fi

# Install EAS CLI globally if not installed
if ! command -v eas &> /dev/null; then
    echo "🔧 Installing EAS CLI globally..."
    npm install -g @expo/cli eas-cli
else
    echo "✅ EAS CLI already installed"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your Supabase credentials"
echo "2. Run the database setup script in Supabase SQL editor"
echo "3. Run 'npm start' to start development server"
echo "4. Run 'eas login' to authenticate with Expo"
echo "5. Run 'eas build:configure' to set up builds"
echo ""