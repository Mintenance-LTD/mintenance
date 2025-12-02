#!/bin/bash

# Install Onboarding System Dependencies
# This script installs the required dependencies for the onboarding system

set -e

echo "Installing onboarding system dependencies..."

# Web dependencies
echo ""
echo "📦 Installing web dependencies..."
cd apps/web
npm install react-confetti
echo "✅ Web dependencies installed"

# Mobile dependencies
echo ""
echo "📱 Installing mobile dependencies..."
cd ../mobile
npm install react-native-swiper react-native-svg
echo "✅ Mobile dependencies installed"

# Return to root
cd ../..

echo ""
echo "🎉 All onboarding dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Add data-onboarding attributes to your components"
echo "2. Wrap your app with OnboardingWrapper"
echo "3. Add ProfileCompletionCard to your dashboard"
echo "4. Replace empty states with FirstUseEmptyState"
echo ""
echo "See ONBOARDING_SYSTEM_IMPLEMENTATION.md for detailed instructions"
