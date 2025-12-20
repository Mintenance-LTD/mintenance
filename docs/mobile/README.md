# Mobile App Documentation

This directory contains all mobile app configuration and dependency documentation.

## Structure

### `eas-cli-config/`
**Purpose:** Track all EAS CLI configuration changes, issues, and solutions.

**Key Files:**
- `issue-typescript-config-error.md` - **READ THIS FIRST** - Explains why the TypeScript error keeps happening
- `2025-01-24-build-configuration.md` - Current working configuration
- `README.md` - How to use this folder

**When to Update:**
- Every time you change `eas.json`
- Every time you modify `app.config.js`
- Every time you encounter a build issue
- Every time you fix a configuration problem

### `web-dependencies/`
**Purpose:** Track all dependency updates, package changes, and tech stack improvements.

**Key Files:**
- `tech-stack-improvement-template.md` - Template for documenting changes
- `2025-01-24-mobile-build-setup.md` - Initial setup documentation
- `README.md` - How to use this folder

**When to Update:**
- Every time you add a new package
- Every time you update a package version
- Every time you change build tools
- Every time you modify configuration files

## Quick Reference

### Current Build Status
- ✅ **EAS Web Dashboard:** Working - Use this for builds
- ❌ **EAS CLI:** Failing - TypeScript config error (see `eas-cli-config/issue-typescript-config-error.md`)

### Current Configuration
- App Version: 1.2.4
- Build Numbers: iOS 16, Android 16
- Environment Variables: Set in EAS Dashboard ✅

### How to Build APK
1. Go to: https://expo.dev/accounts/mintanance-ltd/projects/mintenance/builds
2. Click "Create a build"
3. Select Android + Preview profile
4. Wait for build to complete
5. Download APK

## Why Documentation Matters

We've been fixing the same TypeScript error multiple times because:
1. We didn't document the root cause
2. We didn't document what works vs what doesn't
3. We kept trying the same solutions that don't work

**Now:** Every configuration change is documented with:
- What changed
- Why it changed  
- What works
- What doesn't work
- How to revert if needed

## Contributing

When making changes:
1. Create a dated file in the appropriate folder
2. Document what you changed
3. Document why you changed it
4. Document if it broke anything
5. Update the relevant README if needed

