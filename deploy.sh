#!/bin/bash

# Mintenance Vercel Deployment Script
# Run this from the project root directory

echo "🚀 Starting Vercel deployment for Mintenance..."

# Check if we're in the right directory
if [ ! -f "apps/web/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Check if user is logged in
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please run:"
    echo "vercel login"
    echo ""
    echo "This will open a browser window for authentication."
    echo "After authentication, run this script again."
    exit 1
fi

echo "✅ Vercel authentication confirmed"

# Navigate to web app directory
cd apps/web

# Check if build works locally first
echo "🔨 Testing local build..."
if npm run build; then
    echo "✅ Local build successful"
else
    echo "❌ Local build failed. Please fix build errors before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if vercel --prod; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Check your deployment URL in the output above"
    echo "2. Add environment variables in Vercel dashboard"
    echo "3. Test your application"
    echo ""
    echo "📖 See MANUAL_VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
