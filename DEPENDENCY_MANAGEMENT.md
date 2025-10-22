# Dependency Management Strategy

This document outlines the automated dependency management strategy for the Mintenance monorepo.

## Overview

We use a multi-layered approach to dependency management:

1. **Dependabot** - Automated PRs for individual dependency updates
2. **Security Workflow** - Weekly batch updates with security fixes
3. **Manual Reviews** - Periodic major version upgrades

## Dependabot Configuration

Located at `.github/dependabot.yml`, this configuration manages:

### Update Schedule
- **Frequency**: Weekly on Mondays at 9:00 AM UTC
- **PR Limit**: 5-10 per workspace to avoid overwhelming the team

### Workspaces Monitored
- Root monorepo dependencies
- `/apps/web` - Next.js web application
- `/apps/mobile` - React Native mobile app
- `/packages/shared` - Shared utilities
- `/packages/auth` - Authentication package
- `/packages/types` - TypeScript types
- `/packages/shared-ui` - Shared UI components
- GitHub Actions workflows

### Grouped Updates

Dependencies are grouped by ecosystem to reduce PR noise:

#### Development Dependencies
- TypeScript & type definitions
- ESLint & plugins
- Prettier

#### Testing Dependencies
- Jest & plugins
- Testing Library
- Playwright

#### Framework-Specific Groups
- **Next.js**: `next`, `next-*`, `eslint-config-next`
- **React**: `react`, `react-*`, `@types/react*`
- **React Native**: `react-native`, `react-native-*`, `@react-native/*`
- **Expo**: `expo`, `expo-*`, `@expo/*`
- **Supabase**: `@supabase/*`
- **TanStack**: `@tanstack/*`

### Labels
All Dependabot PRs are automatically labeled:
- `dependencies` - All dependency updates
- `automated` - Automated updates
- Workspace-specific labels: `web`, `mobile`, `packages`
- `github-actions` - For workflow updates
- `ci/cd` - For CI/CD updates

## Security Update Workflow

Located at `.github/workflows/dependency-update.yml`:

### Schedule
- **Frequency**: Weekly on Sundays at 1:00 AM UTC
- Can be manually triggered via `workflow_dispatch`

### Process
1. Checks for outdated packages
2. Runs security audit
3. Updates dependencies with `npm update`
4. Applies security fixes with `npm audit fix`
5. Runs test suite
6. Creates PR if updates were applied

### Features
- Batch updates reduce PR overhead
- Automatic security fix application
- Test validation before PR creation
- Unique branch naming per run

## Dependency Update Best Practices

### Reviewing Dependabot PRs

1. **Check Breaking Changes**: Review changelog for major updates
2. **Review Tests**: Ensure CI passes
3. **Test Locally**: For critical dependencies, test locally
4. **Merge Promptly**: Security updates should be merged quickly

### Handling Failed Updates

If a Dependabot PR fails CI:
1. Check the error logs
2. Fix compatibility issues in a separate PR
3. Rebase the Dependabot PR or close and let it recreate

### Major Version Updates

For major version updates (e.g., React 18→19, Next.js 14→15):
1. Review migration guides
2. Create a dedicated branch
3. Update dependencies incrementally
4. Thorough testing across all apps
5. Update documentation

## Current Deprecation Warnings

As of the last `npm install`:

### High Priority
- **ESLint 8** → ESLint 9 (deprecated, see ESLINT_V9_MIGRATION.md)
- **glob 7.x** → glob 9+ (multiple instances)
- **rimraf 3.x** → rimraf 4+

### Medium Priority
- **@humanwhocodes/config-array** → **@eslint/config-array**
- **@humanwhocodes/object-schema** → **@eslint/object-schema**

### Low Priority (Platform Native Alternatives)
- **inflight** (memory leak) → use lru-cache
- **domexception** → use native DOMException
- **abab** → use native atob()/btoa()

## Security Audit

Run security audits manually:

```bash
# Audit all workspaces
npm audit --workspaces

# Audit specific workspace
npm audit -w @mintenance/web

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

Current status: **0 vulnerabilities** ✅

## Useful Commands

```bash
# Check for outdated packages
npm outdated --workspaces

# Update all dependencies
npm update --workspaces

# Install dependencies
npm install

# Clean and reinstall
npm run reset

# Check package versions
npm list <package-name> --workspaces
```

## Monitoring

- Review Dependabot PRs weekly
- Check security workflow runs
- Monitor deprecation warnings in CI logs
- Review npm audit results monthly

## Questions?

For questions about dependency management, contact the infrastructure team or open an issue.
