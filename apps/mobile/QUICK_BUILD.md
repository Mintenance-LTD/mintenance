# Quick APK Build - Direct Solution

## The Problem
The TypeScript config error is just a warning - EAS falls back to its bundled config. The real blocker is missing environment variables in EAS.

## Solution: Set Variables in EAS Dashboard (2 minutes)

1. **Go to EAS Dashboard:**
   - Visit: https://expo.dev/accounts/djodjonkouka/projects/mintenance/credentials
   - Or: https://expo.dev → Your Project → Settings → Environment Variables

2. **Add these 3 variables:**
   ```
   EXPO_PUBLIC_SUPABASE_URL = https://ukrjudtlvapiajkjbcrd.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY = [your full anon key from .env.local]
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = [your stripe key if you have it]
   ```

3. **Then build:**
   ```bash
   cd apps/mobile
   npm run build:android:apk
   ```

The TypeScript warning can be ignored - EAS will use its fallback config and the build will proceed.

## Alternative: Build Despite Warnings

The build might actually work despite the warnings. Try:

```bash
cd apps/mobile
eas build --platform android --profile preview --non-interactive
```

If it fails, check the EAS dashboard build logs for the actual error (not the local config warning).

