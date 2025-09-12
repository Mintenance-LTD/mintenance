# Environment Configuration Guide

## Required Environment Variables

Copy these variables to your `.env` file:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe Configuration  
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key

# Google Maps API
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Environment
NODE_ENV=development

# App Configuration
APP_VERSION=1.1.0
APP_NAME=Mintenance

# Feature Flags
EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH=true
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

## Setup Instructions

1. Copy this template to `.env` in your project root
2. Replace placeholder values with your actual API keys
3. Never commit `.env` files to version control
4. Use different values for development, staging, and production
