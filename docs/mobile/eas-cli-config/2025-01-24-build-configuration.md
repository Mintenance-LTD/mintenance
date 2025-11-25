# EAS Build Configuration - January 24, 2025

## What Was Changed
- Updated app version to 1.2.4
- Incremented build numbers (iOS: 16, Android: 16)
- Added build scripts for APK generation
- Created `app.json` as fallback config
- Updated `babel.config.js` with TypeScript extensions

## Current Configuration Files

### app.config.js
- Version: 1.2.4
- Build Number (iOS): 16
- Version Code (Android): 16
- Project ID: 671d1323-6979-465f-91db-e61471746ab3

### eas.json
- Build profiles: development, stable, staging, preview, production
- Preview profile: Generates APK (not AAB)
- Environment variables: Referenced from EAS secrets

### Environment Variables (Set in EAS Dashboard)
- `EXPO_PUBLIC_SUPABASE_URL` = https://ukrjudtlvapiajkjbcrd.supabase.co
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` = [Set in dashboard]
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` = [Set in dashboard]

## Build Commands
```bash
# Preview APK (recommended for testing)
npm run build:android:apk

# Development build
npm run build:android:dev

# Staging build
npm run build:android:staging
```

## Known Issues
- CLI fails locally with TypeScript error (see `issue-typescript-config-error.md`)
- **Workaround:** Use EAS Web Dashboard to trigger builds

## What Works
✅ EAS Web Dashboard builds
✅ Environment variables in dashboard
✅ Build profiles configured
✅ App config valid on EAS servers

## What Doesn't Work
❌ Local CLI builds (`eas build` command)
❌ `npx expo config` command locally

## Next Steps
1. Continue using web dashboard for builds
2. Document any CLI fixes if found
3. Update this file when configuration changes

