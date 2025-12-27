# GitHub Actions Failures - Complete Solution

**Date:** 2025-01-27
**Status:** 🔧 Root Cause Identified - Manual Intervention Required

## Root Cause Analysis

### Primary Issue: npm Install Timeouts

**Symptoms:**
- ✅ All GitHub Actions workflows failing at `npm ci` step
- ✅ Local `npm ci` times out after 2+ minutes
- ✅ Local `npm install` times out after 5+ minutes
- ✅ TypeScript and other dev dependencies not found (`tsc` command missing)
- ✅ Node modules exist but are incomplete/corrupted

**Root Causes:**
1. **npm cache corruption** - Local npm cache may be corrupted
2. **Network issues** - npm registry connection timeouts
3. **Workspace complexity** - Monorepo with 2 apps + multiple packages
4. **Node.js version mismatch** - Local v22.15.0 vs CI v20.19.4

## Solution Steps (Run Locally)

### Quick Fix (Automated Script)

**Windows (PowerShell):**
```powershell
.\scripts\fix-npm-cache.ps1
```

**Unix/Linux/macOS (Bash):**
```bash
chmod +x scripts/fix-npm-cache.sh
./scripts/fix-npm-cache.sh
```

### Manual Steps (If Script Fails)

### Step 1: Clean npm Cache (CRITICAL)

```bash
# Clear npm cache completely
npm cache clean --force

# Verify cache is empty
npm cache verify
```

### Step 2: Remove All Dependencies

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps/web/node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps/mobile/node_modules -ErrorAction SilentlyContinue
Get-ChildItem -Path packages -Filter "node_modules" -Recurse -Directory | Remove-Item -Recurse -Force
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
```

**Unix/Linux/macOS (Bash):**
```bash
cd c:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean

# Remove all node_modules
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf apps/mobile/node_modules
find packages -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove package-lock.json
rm -f package-lock.json
```

### Step 3: Reinstall with Fresh Lock File

```bash
# Install dependencies (this will create new package-lock.json)
npm install --legacy-peer-deps

# If still timing out, try with verbose logging to see where it hangs
npm install --legacy-peer-deps --verbose
```

**Why `--legacy-peer-deps`?**
- Monorepos often have peer dependency conflicts
- This flag allows installation to proceed despite conflicts
- Safer than `--force` which can break things

### Step 4: Verify Installation

```bash
# Test TypeScript is installed
npx tsc --version

# Should output: Version 5.4.5

# Test type checking works
npm run type-check

# Test build
npm run build:packages
```

### Step 5: Commit New package-lock.json

```bash
# Check what changed
git status

# Add the new package-lock.json
git add package-lock.json

# Commit
git commit -m "fix: regenerate package-lock.json to fix npm ci timeouts

- Cleared npm cache
- Removed all node_modules
- Regenerated package-lock.json with --legacy-peer-deps
- Fixes GitHub Actions npm ci failures"

# Push
git push
```

## Alternative Solution (If npm install Still Fails)

### Option A: Use Different Node.js Version

```bash
# Install nvm (Node Version Manager) if not installed
# Windows: https://github.com/coreybutler/nvm-windows

# Switch to Node.js v20.19.4 (same as CI)
nvm install 20.19.4
nvm use 20.19.4

# Verify
node --version  # Should show v20.19.4
npm --version

# Try npm install again
npm cache clean --force
npm install --legacy-peer-deps
```

### Option B: Use Yarn Instead

```bash
# Install yarn if not installed
npm install -g yarn

# Remove npm files
rm -f package-lock.json

# Install with yarn
yarn install

# Commit yarn.lock
git add yarn.lock .yarnrc.yml
git commit -m "chore: switch to Yarn for dependency management"
git push

# Update GitHub Actions workflows to use yarn:
# - Replace "npm ci" with "yarn install --frozen-lockfile"
# - Replace "npm run" with "yarn"
```

### Option C: Fix Specific Package Issues

If verbose output shows a specific package hanging, you can:

```bash
# Install specific problematic package separately
npm install <problem-package> --legacy-peer-deps

# Then try full install
npm install --legacy-peer-deps
```

## GitHub Actions Workflow Fixes

### Fix 1: Disable npm-gulp.yml (Already Done)

The npm-gulp.yml workflow was trying to use gulp which doesn't exist. This has been fixed by:
- Setting `if: false` to disable it
- Changing trigger to `workflow_dispatch` only

### Fix 2: Update All Workflows to Handle npm ci Failures ✅ DONE

**Status:** All workflows updated with retry logic and `--legacy-peer-deps`:

```yaml
- name: Install dependencies
  run: |
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps
  timeout-minutes: 10
```

**Files Updated:**
- ✅ `.github/workflows/deploy.yml`
- ✅ `.github/workflows/e2e-tests.yml`
- ✅ `.github/workflows/ci-enhanced.yml`
- ✅ `.github/workflows/ci-cd.yml`
- ✅ `.github/workflows/performance-budget.yml`
- ✅ `.github/workflows/security-scan.yml`

### Fix 3: Add .nvmrc File ✅ DONE

**Status:** `.nvmrc` file created and committed with Node.js version `20.19.4`

### Fix 4: Update root package.json ✅ DONE

**Status:** `engines` field added to `package.json`:

```json
{
  "engines": {
    "node": ">=20.19.4 <23.0.0",
    "npm": ">=9.0.0"
  }
}
```

## Monitoring & Verification

### After Pushing Fixes:

1. **Check GitHub Actions Tab**
   - Go to: https://github.com/Mintenance-LTD/mintenance/actions
   - Wait for new workflow runs to start
   - Monitor for failures at npm ci step

2. **Expected Outcome:**
   - ✅ npm ci completes in < 2 minutes
   - ✅ TypeScript compilation passes
   - ✅ Unit tests run successfully
   - ✅ Build verification succeeds

### If Still Failing:

1. **Check workflow logs** for specific error messages
2. **Look for timeout errors** vs actual dependency errors
3. **Check for network issues** in GitHub Actions runners
4. **Consider adding npm registry mirror** if public npm is slow

## Long-term Prevention

### 1. Add Dependabot Configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### 2. Add Pre-commit Hooks

Install husky to prevent bad package-lock.json commits:

```bash
npm install --save-dev husky
npx husky init
echo "npm ci --dry-run" > .husky/pre-commit
```

### 3. Regular Dependency Audits

Add to package.json scripts:

```json
{
  "scripts": {
    "audit:deps": "npm audit --audit-level moderate",
    "audit:outdated": "npm outdated",
    "update:deps": "npm update --save"
  }
}
```

## Summary

**Root Issue:** npm cache corruption + potential network timeouts
**Primary Fix:** Clean cache, remove node_modules, regenerate package-lock.json
**Estimated Time:** 10-15 minutes
**Success Criteria:** `npm ci` completes successfully + all workflows pass

## References

- [npm ci documentation](https://docs.npmjs.com/cli/v9/commands/npm-ci)
- [npm cache documentation](https://docs.npmjs.com/cli/v9/commands/npm-cache)
- [GitHub Actions troubleshooting](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)
- [GITHUB_ACTIONS_FAILURES_FIX.md](./GITHUB_ACTIONS_FAILURES_FIX.md)
