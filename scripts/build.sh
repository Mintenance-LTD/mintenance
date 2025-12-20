#!/bin/bash

# Mintenance App Build Script
# Usage: ./scripts/build.sh [profile] [platform]
# Example: ./scripts/build.sh production android

PROFILE=${1:-preview}
PLATFORM=${2:-android}

echo "🏗️  Building Mintenance app..."
echo "Profile: $PROFILE"
echo "Platform: $PLATFORM"

# Validate profile
case $PROFILE in
    development|staging|preview|production|production-store)
        echo "✅ Valid build profile: $PROFILE"
        ;;
    *)
        echo "❌ Invalid profile. Use: development, staging, preview, production, or production-store"
        exit 1
        ;;
esac

# Validate platform
case $PLATFORM in
    android|ios|all)
        echo "✅ Valid platform: $PLATFORM"
        ;;
    *)
        echo "❌ Invalid platform. Use: android, ios, or all"
        exit 1
        ;;
esac

# Check if logged into EAS
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged into EAS. Please run 'eas login' first."
    exit 1
fi

# Set environment based on profile
case $PROFILE in
    production|production-store)
        ENV_FILE=".env.production"
        ;;
    staging)
        ENV_FILE=".env.staging"
        ;;
    *)
        ENV_FILE=".env"
        ;;
esac

echo "📝 Using environment file: $ENV_FILE"

# Copy appropriate env file if it exists
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" .env
    echo "✅ Environment configured"
else
    echo "⚠️  Environment file $ENV_FILE not found, using current .env"
fi

# Pre-build checks
echo "🔍 Running pre-build checks..."

# Check if required env vars are set
if [ -f ".env" ]; then
    if grep -q "your-project-id" .env || grep -q "your-anon-key" .env; then
        echo "⚠️  Warning: .env contains placeholder values. Update with real credentials."
    fi
fi

# Start build
echo "🚀 Starting EAS build..."

if [ "$PLATFORM" = "all" ]; then
    eas build --profile "$PROFILE" --platform all --non-interactive
else
    eas build --profile "$PROFILE" --platform "$PLATFORM" --non-interactive
fi

echo "✅ Build command completed!"
echo ""
echo "📱 Check build status: https://expo.dev/accounts/[your-account]/projects/mintenance/builds"
echo ""