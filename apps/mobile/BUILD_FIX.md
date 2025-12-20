# Permanent Build Fix

## The Real Problem
The TypeScript config error happens because Node.js tries to load `.ts` files directly. This is a known issue with Expo CLI.

## Solution: Use EAS Web Dashboard (No CLI Issues)

**Trigger builds directly from the web - no CLI needed:**

1. Go to: https://expo.dev/accounts/mintanance-ltd/projects/mintenance/builds
2. Click "Create a build"
3. Select:
   - Platform: Android
   - Profile: preview
   - Click "Create build"

That's it. No CLI, no TypeScript errors, no local config issues.

## Alternative: Fix CLI (If You Must Use It)

The CLI issue is that `npx expo config` fails. You can work around it by:

1. **Using app.json instead of app.config.js** (already created)
2. **Or** ensuring Node.js 20+ is used (check with `node --version`)

But honestly, **just use the web dashboard** - it's faster and more reliable.

