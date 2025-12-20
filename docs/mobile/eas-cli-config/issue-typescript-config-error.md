# TypeScript Config Error - Root Cause Analysis

**Date:** 2025-01-24  
**Status:** Known Issue - Use EAS Web Dashboard as Workaround

## The Error
```
Unknown file extension ".ts" for C:\Users\...\node_modules\expo-modules-core\src\index.ts
Error: build command failed.
```

## Root Cause

**Why This Happens:**
1. `npx expo config` tries to read `app.config.js` locally
2. `app.config.js` uses ES modules (`export default`)
3. When Expo CLI loads dependencies, it encounters TypeScript files in `node_modules/expo-modules-core`
4. Node.js cannot execute `.ts` files directly - they need to be transpiled first
5. The CLI fails before it can even upload to EAS servers

**Why It Keeps Happening:**
- This is a **known limitation** of Expo CLI when using TypeScript in a monorepo
- The CLI tries to validate config locally before uploading
- Local Node.js environment doesn't have TypeScript transpilation set up for `node_modules`
- Even though EAS has a fallback, the CLI exits before reaching that point

## Solutions

### ✅ Solution 1: Use EAS Web Dashboard (Recommended)
**Why:** Bypasses all local CLI issues
**How:** 
1. Go to https://expo.dev/accounts/mintanance-ltd/projects/mintenance/builds
2. Click "Create a build"
3. Select platform and profile
4. Build runs on EAS servers where everything is configured correctly

**Status:** ✅ Working - Environment variables already set in dashboard

### ⚠️ Solution 2: Use app.json Instead of app.config.js
**Why:** Static JSON doesn't require TypeScript evaluation
**Status:** Created `app.json` but CLI still fails (needs investigation)

### ⚠️ Solution 3: Fix Local TypeScript Setup
**Why:** Would allow CLI to work locally
**What's Needed:**
- Configure Node.js to handle TypeScript in node_modules
- Use `ts-node` or similar transpiler
- Update EAS CLI to handle this scenario

**Status:** Not implemented - complex and may break other things

## Current Working Configuration

**Last Known Working:** Use EAS Web Dashboard
- Environment variables: Set in EAS Dashboard ✅
- Build profiles: Configured in `eas.json` ✅
- App config: `app.config.js` (works on EAS servers) ✅

## Files Involved
- `apps/mobile/app.config.js` - Main config (ES modules)
- `apps/mobile/app.json` - Fallback static config
- `apps/mobile/eas.json` - Build profiles
- `apps/mobile/tsconfig.json` - TypeScript config
- `apps/mobile/babel.config.js` - Babel config

## Notes
- The error is **harmless on EAS servers** - they have proper TypeScript setup
- The CLI error happens **locally** before upload
- Environment variables are correctly set in EAS Dashboard
- Builds work fine when triggered from web dashboard

