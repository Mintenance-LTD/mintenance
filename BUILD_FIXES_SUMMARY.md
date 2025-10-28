# Build Fixes Summary - Vercel & EAS Failures

## Issues Found and Fixed

### 1. Vercel Build Failures

#### **Issue 1.1: Incorrect Build Paths**
**Problem:**
- `vercel.json` contained commands: `cd ../.. && npm ci` and `cd ../.. && npm run build:web`
- Since `vercel.json` is in the root directory, `cd ../..` would navigate outside the project
- This caused npm to fail finding `package-lock.json`

**Error Message:**
```
npm error The `npm ci` command can only install with an existing package-lock.json or
npm error npm-shrinkwrap.json with lockfileVersion >= 1
```

**Fix Applied:**
```diff
- "buildCommand": "cd ../.. && npm run build:web",
- "installCommand": "cd ../.. && npm ci",
+ "buildCommand": "npm run build:packages && npm run build:web",
+ "installCommand": "npm ci",
+ "outputDirectory": "apps/web/.next",
```

**Files Modified:**
- `vercel.json`

#### **Issue 1.2: Missing Package Build Step**
**Problem:**
- Vercel was trying to build the web app without first building the shared packages
- The web app depends on `@mintenance/types`, `@mintenance/shared`, and `@mintenance/auth`
- These packages must be compiled first before building the web app

**Fix Applied:**
- Added `npm run build:packages &&` before `npm run build:web` in vercel.json
- This ensures packages are built in correct order: types → shared → auth → web

---

### 2. EAS (Mobile) Build Failures

#### **Issue 2.1: Node.js Version Incompatibility**
**Problem:**
- `apps/mobile/package.json` specified: `"node": "20.x"` (exact version)
- Root `package.json` specifies: `"node": "18.x || 20.x || 22.x"` (flexible)
- EAS build environments may use different Node versions
- Strict version requirement would cause builds to fail on different Node versions

**Error (would occur):**
```
npm error engine Not compatible with your version of node/npm
npm error notsup Required: {"node":"20.x"}
```

**Fix Applied:**
```diff
  "engines": {
-   "node": "20.x"
+   "node": "18.x || 20.x || 22.x",
+   "npm": ">=9.0.0"
  }
```

**Files Modified:**
- `apps/mobile/package.json`

#### **Issue 2.2: TypeScript Configuration Errors**
**Problem:**
- `moduleResolution: "bundler"` requires `module` to be set to `preserve` or `es2015`+
- Explicit `types: ["react-native", "jest"]` causes errors when type definitions not found
- Missing `module`, `target`, and `lib` settings

**Errors:**
```
error TS2688: Cannot find type definition file for 'jest'
error TS2688: Cannot find type definition file for 'react-native'
error TS5095: Option 'bundler' can only be used when 'module' is set to 'preserve' or to 'es2015' or later
```

**Fix Applied:**
```diff
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
+   "module": "esnext",
    "moduleResolution": "bundler",
+   "target": "esnext",
+   "lib": ["esnext"],
-   "types": [
-     "react-native",
-     "jest"
-   ]
  }
```

**Files Modified:**
- `apps/mobile/tsconfig.json`

---

## Additional Considerations

### Environment Variables for EAS Builds
The mobile app requires these environment variables to be configured in EAS Secrets:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

These are validated by `scripts/validate-credentials.js` during build time.

**Action Required:**
Configure these secrets in your EAS project:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"
```

### Package Build Order
The monorepo has dependencies that must be built in order:
1. `@mintenance/types` (no dependencies)
2. `@mintenance/shared` (depends on types)
3. `@mintenance/auth` (depends on types)
4. `@mintenance/web` (depends on all packages)
5. `@mintenance/mobile` (depends on shared packages)

This is now correctly configured in:
- `package.json` root: `build:packages` script
- `vercel.json`: `buildCommand` includes package build step

---

## Files Modified Summary

1. **vercel.json**
   - Fixed build and install commands
   - Added package build step
   - Added output directory

2. **apps/mobile/package.json**
   - Fixed Node.js version compatibility

3. **apps/mobile/tsconfig.json**
   - Fixed TypeScript module configuration
   - Removed problematic type definitions

---

## Testing Recommendations

### Vercel Build
1. Push changes to trigger Vercel build
2. Verify build logs show:
   - Successful `npm ci`
   - Packages building in order
   - Web app building successfully
   - Build completes without errors

### EAS Build
1. Ensure environment variables are configured in EAS
2. Trigger build: `eas build --platform android --profile preview`
3. Verify build logs show:
   - Node version compatibility
   - TypeScript compilation success
   - APK generation success

---

## Root Cause Analysis

### Vercel Failures
**Root Cause:** Configuration assumed `vercel.json` was in `apps/web/` subdirectory, but it's actually in the root directory. The `cd ../..` commands were navigating outside the project.

**Impact:** Complete build failure - npm couldn't find package-lock.json

### EAS Failures
**Root Cause:** Multiple TypeScript configuration issues and strict Node version requirement made builds fragile across different environments.

**Impact:** Build failures due to:
- Node version mismatches
- TypeScript compilation errors
- Missing type definitions

---

## Status

✅ **Vercel Issues:** Fixed and ready to test
✅ **EAS Issues:** Fixed and ready to test (pending environment variables configuration)

All fixes are backward compatible and follow monorepo best practices.
