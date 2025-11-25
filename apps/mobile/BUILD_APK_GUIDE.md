# Building Android APK for Mintenance Mobile App

## Prerequisites

1. **EAS CLI installed and logged in:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Environment Variables Setup**

   You have two options:

   ### Option A: Set EAS Environment Variables (Recommended for EAS Builds)

   Set the following environment variables in EAS:

   ```bash
   # Set Supabase URL
   eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --scope project
   
   # Set Supabase Anon Key
   eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key-here" --scope project
   
   # Set Stripe Publishable Key (if needed)
   eas env:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "your-stripe-key" --scope project
   ```

   Or set them via the EAS Dashboard:
   - Go to https://expo.dev
   - Navigate to your project
   - Go to Settings > Environment Variables
   - Add the variables

   ### Option B: Create Local .env File (For Local Development)

   Create `apps/web/.env.local` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-key
   ```

   The mobile app will automatically read and map these variables.

## Building the APK

### Quick Build (Preview APK)
```bash
cd apps/mobile
npm run build:android:apk
```

### Other Build Options

```bash
# Development build (with dev client)
npm run build:android:dev

# Staging build
npm run build:android:staging

# Interactive build (choose profile)
npm run build:android
```

## Build Profiles

- **preview**: Release APK for testing (recommended)
- **development**: Debug APK with dev client
- **staging**: Release APK for staging environment
- **production**: App Bundle (AAB) for Play Store

## Troubleshooting

### TypeScript Config Error

If you see "Unknown file extension .ts" error:
- This is a known issue with `npx expo config`
- EAS will fall back to its bundled config
- The build should still work if environment variables are set in EAS

### Missing Environment Variables

If build fails due to missing environment variables:
1. Set them as EAS secrets (Option A above) - **Recommended for EAS builds**
2. Or create `apps/web/.env.local` with the variables (Option B above)

### Build Fails with Generic Error

1. Check EAS dashboard for detailed build logs
2. Ensure you're logged in: `eas whoami`
3. Verify environment variables are set: `eas env:list`
4. Try building with verbose output: `eas build --platform android --profile preview --verbose`

## After Build Completes

1. EAS will provide a download link for the APK
2. Download the APK to your computer
3. Transfer to Android device and install
4. Enable "Install from Unknown Sources" if prompted

## Notes

- Builds run on EAS servers (cloud build)
- First build may take 10-15 minutes
- Subsequent builds are faster due to caching
- APK files are typically 20-50 MB in size

