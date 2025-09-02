# EAS (Expo Application Services) Setup Guide

## Overview

This guide will help you complete the EAS configuration for your Mintenance app. Since you're already logged in as `djodjonkouka`, we just need to finish the project setup.

## Prerequisites ✅

- [x] EAS CLI installed (16.17.4)
- [x] Logged in as djodjonkouka
- [x] expo-dev-client installed
- [x] Build profiles configured
- [x] Environment variables set up

## Manual Setup Steps

### 1. Create EAS Project

Run this command and answer "Y" when prompted:

```bash
npx eas project:init
```

This will:
- Create a new EAS project under your account
- Generate a unique project ID
- Update your app.config.js with the project ID

### 2. Configure Build Profiles

```bash
npx eas build:configure
```

This will validate your existing eas.json configuration.

### 3. Verify Setup

```bash
npx eas project:info
```

Should display your project information including:
- Project ID
- Project slug: @djodjonkouka/mintenance
- Owner: djodjonkouka

## Available Build Profiles

### Development Build
```bash
npx eas build --platform android --profile development
```
- Creates APK for testing
- Includes Expo dev client
- Internal distribution

### Staging Build
```bash
npx eas build --platform android --profile staging
```
- Production-like build for testing
- APK format
- Internal distribution

### Preview Build
```bash
npx eas build --platform android --profile preview
```
- Production build for preview
- APK format
- Internal distribution

### Production Build
```bash
npx eas build --platform android --profile production
```
- App Bundle for Play Store
- Production optimized
- Ready for store submission

### Store Distribution Build
```bash
npx eas build --platform android --profile production-store
```
- App Bundle with store distribution
- Automated Play Store upload (when configured)

## Environment Configuration

### Current Environment Files:
- `.env.example` - Template
- `.env.staging` - Staging configuration
- `.env.production` - Production configuration

### Environment Variables by Profile:
- **development**: Uses your local .env
- **staging**: Uses staging environment
- **preview**: Uses production environment
- **production**: Uses production environment
- **production-store**: Uses production environment

## App Store Configuration

### Android (Google Play Store)

Update the submit configuration in `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./credentials/play-store-service-account.json",
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

### iOS (App Store Connect)

Update the submit configuration:

```json
"ios": {
  "appleId": "your-apple-id@example.com",
  "ascAppId": "your-app-store-connect-app-id",
  "appleTeamId": "your-apple-team-id"
}
```

## Quick Commands

### Build for Testing
```bash
# Development build (with dev client)
npm run build:android:dev

# Preview build (production-like)
npm run build:android:preview
```

### Build for Production
```bash
# Production build
npm run build:android:prod

# Store submission build
npm run build:android:store
```

### Submit to Store
```bash
# Submit to Google Play Store
npx eas submit --platform android --latest
```

## Automated Setup (Alternative)

If you prefer automated setup, run:

**Windows:**
```cmd
scripts\setup-eas.bat
```

**macOS/Linux:**
```bash
chmod +x scripts/setup-eas.sh
./scripts/setup-eas.sh
```

## Package.json Scripts

Add these to your package.json for convenience:

```json
{
  "scripts": {
    "build:android:dev": "eas build --platform android --profile development",
    "build:android:staging": "eas build --platform android --profile staging", 
    "build:android:preview": "eas build --platform android --profile preview",
    "build:android:prod": "eas build --platform android --profile production",
    "build:android:store": "eas build --platform android --profile production-store",
    "build:ios:dev": "eas build --platform ios --profile development",
    "build:ios:prod": "eas build --platform ios --profile production",
    "submit:android": "eas submit --platform android --latest",
    "submit:ios": "eas submit --platform ios --latest"
  }
}
```

## Troubleshooting

### Project Not Found Error
If you get "Experience with id does not exist":
1. Remove the projectId from app.config.js
2. Run `npx eas project:init` to create new project

### Build Errors
- Check environment variables are set
- Verify Supabase credentials
- Ensure all dependencies are installed

### Submission Issues
- Verify app signing certificates
- Check store metadata is complete
- Ensure privacy policy and terms are set

## Next Steps After Setup

1. **Configure Supabase**: Update .env files with your Supabase credentials
2. **Set up Stripe**: Add your Stripe keys for payment processing
3. **Run Database Migration**: Execute the contractor-location-migration.sql
4. **Test Build**: Create a development build to verify everything works
5. **Configure App Store**: Set up your Play Store/App Store accounts

## Support

- **Expo Documentation**: https://docs.expo.dev/build/setup/
- **EAS CLI Reference**: https://docs.expo.dev/build-reference/
- **Build Troubleshooting**: https://docs.expo.dev/build-reference/troubleshooting/