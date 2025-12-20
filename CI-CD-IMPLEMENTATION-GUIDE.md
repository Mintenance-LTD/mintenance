# CI/CD Implementation Guide - Mintenance Monorepo

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Pipeline Details](#pipeline-details)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Process](#deployment-process)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring & Alerts](#monitoring--alerts)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This comprehensive CI/CD implementation provides:

- **Automated Testing**: Unit, integration, E2E, and performance tests
- **Code Quality**: Linting, type checking, security scanning
- **Parallel Execution**: Multiple jobs run simultaneously for faster feedback
- **Multi-Environment**: Development, staging, and production deployments
- **Mobile Builds**: EAS-powered iOS and Android builds
- **Database Safety**: Migration validation and testing
- **Rollback Support**: Automatic rollback on failure
- **Security**: SAST, DAST, dependency scanning, and secrets detection

### Pipeline Execution Time
- **Fast Track** (code quality + unit tests): ~10-15 minutes
- **Full Pipeline** (including E2E): ~25-35 minutes
- **Mobile Builds**: ~30-45 minutes (via EAS)

---

## Architecture

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Code Push / PR                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Pre-Commit Hooks                           │
│  • Type Check    • Lint    • Unit Tests    • Security      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Enhanced CI Pipeline (Parallel)                │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Code Quality │  Unit Tests  │   E2E Tests  │   Security    │
│              │   (Web)      │  (Sharded)   │   Scanning    │
│              │   (Mobile)   │              │               │
└──────────────┴──────────────┴──────────────┴───────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Performance Checks                         │
│  • Bundle Size   • Performance Tests   • Database Tests    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Quality Gate                             │
│         (All checks must pass to proceed)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Build & Deploy                             │
├──────────────────────┬──────────────────────────────────────┤
│   Web (Vercel)       │     Mobile (EAS)                     │
│   • Dev              │     • Android                        │
│   • Staging          │     • iOS                            │
│   • Production       │                                      │
└──────────────────────┴──────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Post-Deployment Verification                   │
│  • Health Checks   • Smoke Tests   • Monitoring            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                 ┌────┴────┐
                 │ Success │
                 └─────────┘
```

---

## Prerequisites

### Required Secrets

Add these secrets to your GitHub repository:

#### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Vercel
```bash
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

#### Expo/EAS
```bash
EXPO_TOKEN=your-expo-token
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

#### Testing & Security
```bash
CODECOV_TOKEN=your-codecov-token
SNYK_TOKEN=your-snyk-token
```

### Local Development Setup

1. **Install Husky** (for pre-commit hooks):
```bash
npm install --save-dev husky lint-staged
npx husky install
chmod +x .husky/pre-commit
```

2. **Install Playwright** (for E2E tests):
```bash
npx playwright install --with-deps
```

3. **Install Supabase CLI**:
```bash
npm install -g supabase
```

4. **Install EAS CLI**:
```bash
npm install -g eas-cli
eas login
```

---

## Quick Start

### 1. Enable Workflows

All workflow files are located in `.github/workflows/`:

- `ci-enhanced.yml` - Main CI pipeline (runs on all PRs and pushes)
- `mobile-build.yml` - Mobile builds via EAS
- `deploy-enhanced.yml` - Deployment pipeline
- `database-tests.yml` - Database migration testing
- `security-scan.yml` - Security scanning (daily + on PR)
- `e2e-tests.yml` - E2E testing
- `performance-budget.yml` - Performance monitoring

### 2. Configure Branch Protection

Protect `main` and `develop` branches:

```yaml
Required status checks:
  - Code Quality Checks
  - Unit Tests (web)
  - Unit Tests (mobile)
  - E2E Tests (Playwright)
  - Security Scanning
  - Quality Gate

Require pull request reviews: 1
Require status checks to pass before merging: true
Require branches to be up to date before merging: true
```

### 3. First Run

```bash
# Create a feature branch
git checkout -b feat/your-feature

# Make changes and commit
git add .
git commit -m "feat: your changes"

# Push (triggers CI)
git push origin feat/your-feature

# Create PR (triggers full pipeline)
gh pr create --title "Your Feature" --body "Description"
```

---

## Pipeline Details

### Enhanced CI Pipeline (`ci-enhanced.yml`)

**Triggers:**
- Push to `main`, `master`, `develop`, or feature branches
- Pull requests to `main`, `master`, `develop`
- Manual workflow dispatch

**Jobs:**

#### 1. Code Quality (15 min)
```yaml
- TypeScript type checking (web + mobile)
- ESLint linting
- Prettier formatting check
- Code audits (use-client, any-types, console statements)
```

#### 2. Unit Tests (20 min)
```yaml
Matrix Strategy:
  - Web: Jest with 80% coverage threshold
  - Mobile: Jest with 70% coverage threshold

Outputs:
  - Coverage reports to Codecov
  - Test artifacts
```

#### 3. E2E Tests (30 min)
```yaml
Sharding: 4 parallel shards for faster execution
Browsers: Chromium (primary)
Features:
  - Screenshot on failure
  - Video recording on failure
  - Retry failed tests (2x on CI)
```

#### 4. Security Scan (15 min)
```yaml
- npm audit (moderate+ severity)
- Snyk vulnerability scanning
- TruffleHog secrets detection
- CodeQL analysis
```

#### 5. Performance Checks (20 min)
```yaml
- Web bundle size analysis (<500KB main bundle)
- Mobile bundle size check (<20MB)
- Performance test execution
```

#### 6. Database Tests (10 min)
```yaml
- SQL syntax validation
- Migration conflict detection
- RLS policy verification
- Dangerous operation detection
```

#### 7. Quality Gate
```yaml
Required for merge:
  ✅ All code quality checks pass
  ✅ Unit tests pass with coverage
  ✅ E2E tests pass
  ✅ Database tests pass
  ⚠️  Security scan (non-blocking)
  ⚠️  Performance checks (non-blocking)
```

### Mobile Build Pipeline (`mobile-build.yml`)

**Triggers:**
- Push to `main`, `develop` with mobile changes
- Pull requests with mobile changes
- Manual workflow dispatch

**Build Profiles:**

1. **Development**
   - APK build
   - Internal distribution
   - Dev credentials

2. **Staging**
   - APK/AAB build
   - Internal distribution
   - Staging credentials

3. **Production**
   - AAB build (Android)
   - IPA build (iOS)
   - Store-ready

**Build Process:**
```bash
# Android (Example)
eas build --platform android --profile production --non-interactive

# iOS (Example)
eas build --platform ios --profile production --non-interactive
```

### Deployment Pipeline (`deploy-enhanced.yml`)

**Environments:**

| Branch    | Environment | Auto-Deploy | Approval Required |
|-----------|-------------|-------------|-------------------|
| develop   | development | ✅          | ❌                |
| staging   | staging     | ✅          | ❌                |
| main      | production  | ✅          | ✅ (recommended)  |

**Deployment Flow:**

1. **Pre-Deployment Checks**
   - Type check
   - Lint
   - Tests (unless skipped)

2. **Build**
   - Build packages
   - Build web app
   - Generate metadata

3. **Database Migrations**
   - Validate migrations
   - Apply to target environment
   - Verify schema

4. **Deploy to Vercel**
   - Pull environment config
   - Deploy to appropriate environment
   - Generate preview URL

5. **Post-Deployment**
   - Health check
   - Smoke tests
   - Create deployment record

6. **Rollback on Failure**
   - Automatic for production
   - Restore previous deployment
   - Create incident issue

---

## Testing Strategy

### Test Coverage Goals

| Component | Unit | Integration | E2E | Goal |
|-----------|------|-------------|-----|------|
| Auth System | 95% | ✅ | ✅ | Critical |
| API Routes | 85% | ✅ | ✅ | Critical |
| UI Components | 80% | ⚠️ | ✅ | High |
| Services | 85% | ✅ | ⚠️ | High |
| Utils | 80% | ⚠️ | ❌ | Medium |

### Unit Testing

**Location:** `apps/*/src/**/__tests__/*.test.{ts,tsx}`

**Configuration:**
- Web: `apps/web/jest.config.js`
- Mobile: `apps/mobile/jest.config.js`

**Run locally:**
```bash
# Web tests
npm run test:web

# Mobile tests
npm run test:mobile

# With coverage
npm run test:web -- --coverage

# Watch mode
npm run test:web -- --watch
```

**Writing Tests:**
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const { user } = render(<MyComponent />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### E2E Testing

**Location:** `apps/web/e2e/**/*.spec.ts`

**Configuration:** `playwright.config.js`

**Run locally:**
```bash
# Run all E2E tests
npm run e2e

# Run in headed mode
npm run e2e:headed

# Run with UI
npm run e2e:ui

# Run specific test
npx playwright test user-authentication
```

**Critical Flows:**
- ✅ User Authentication (login, register, logout)
- ✅ Job Creation (with file uploads)
- ✅ Contractor Bidding (bid submission)
- ✅ Payment Flow (Stripe integration)
- ✅ Escrow Approval (homeowner approval)

**Writing E2E Tests:**
```typescript
import { test, expect } from '@playwright/test';

test('should complete job creation flow', async ({ page }) => {
  await page.goto('/jobs/create');

  // Fill form
  await page.fill('input[name="title"]', 'Test Job');
  await page.fill('textarea[name="description"]', 'Description');

  // Upload photo
  await page.setInputFiles('input[type="file"]', 'path/to/test-image.jpg');

  // Submit
  await page.click('button[type="submit"]');

  // Verify success
  await expect(page).toHaveURL(/\/jobs\/\d+/);
});
```

### Performance Testing

**Load Testing** (k6):
```bash
# Run load tests
npm run test:load

# API endpoint tests
npm run test:load:api
```

**Performance Budgets:**
```javascript
{
  mainBundle: '500KB',
  mobileBundle: '20MB',
  firstContentfulPaint: '1.8s',
  timeToInteractive: '3.5s',
  totalBlockingTime: '300ms'
}
```

---

## Deployment Process

### Manual Deployment

```bash
# Deploy to staging
gh workflow run deploy-enhanced.yml \
  -f environment=staging \
  -f skip-tests=false

# Deploy to production (with approval)
gh workflow run deploy-enhanced.yml \
  -f environment=production \
  -f skip-tests=false

# Emergency deploy (skip tests - use with caution!)
gh workflow run deploy-enhanced.yml \
  -f environment=production \
  -f skip-tests=true
```

### Mobile Builds

```bash
# Build Android (staging)
gh workflow run mobile-build.yml \
  -f platform=android \
  -f profile=staging

# Build both platforms (production)
gh workflow run mobile-build.yml \
  -f platform=all \
  -f profile=production

# Check build status
eas build:list --platform all --limit 5
```

### Database Migrations

**Before deployment:**
```bash
# Create new migration
supabase migration new your_migration_name

# Test locally
supabase db reset
supabase db push

# Generate diff
supabase db diff --local > migration.sql
```

**Deployment:**
```bash
# Migrations run automatically during deployment

# Manual migration (if needed)
supabase db push --db-url $DATABASE_URL
```

---

## Rollback Procedures

### Automatic Rollback

Production deployments automatically rollback if:
- Health check fails
- Smoke tests fail
- Post-deployment verification fails

**Process:**
1. Previous deployment is identified
2. Vercel rollback is executed
3. Incident issue is created
4. Team is notified

### Manual Rollback

**Vercel Web App:**
```bash
# List recent deployments
vercel list

# Rollback to specific deployment
vercel rollback <deployment-id>

# Or use Vercel dashboard:
# 1. Go to deployments
# 2. Find working deployment
# 3. Click "Promote to Production"
```

**Mobile App:**
```bash
# Cannot rollback mobile builds
# Users need to update from app stores

# For critical issues:
# 1. Disable feature flags
# 2. Push hotfix
# 3. Submit new build to stores
```

**Database:**
```bash
# Restore from backup
supabase db restore <backup-timestamp>

# Or apply reverse migration
supabase migration new rollback_<original_migration>
```

---

## Monitoring & Alerts

### Built-in Monitoring

**GitHub Actions:**
- Job execution time
- Failure notifications
- Artifact storage

**Codecov:**
- Coverage trends
- Coverage drops
- PR coverage impact

**Vercel:**
- Deployment status
- Build logs
- Runtime logs

### Recommended Additions

1. **Sentry** - Error tracking
```bash
# Add to apps
npm install @sentry/nextjs
npm install @sentry/react-native
```

2. **DataDog / New Relic** - APM
```bash
# Monitor application performance
# Track API response times
# Database query performance
```

3. **Slack Notifications**

Uncomment in workflows:
```yaml
# In ci-enhanced.yml, deploy-enhanced.yml
- name: Notify team
  uses: 8398a7/action-slack@v3
  with:
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Troubleshooting

### Common Issues

#### 1. Pre-commit Hook Fails

**Issue:** Pre-commit checks fail locally

**Solution:**
```bash
# Ensure hooks are executable
chmod +x .husky/pre-commit

# Reinstall hooks
npx husky install

# Skip hooks (emergency only)
git commit --no-verify
```

#### 2. E2E Tests Timeout

**Issue:** Playwright tests timeout

**Solution:**
```bash
# Increase timeout in test
test.setTimeout(60000);

# Or in playwright.config.js
timeout: 60000
```

#### 3. Mobile Build Fails

**Issue:** EAS build fails

**Solution:**
```bash
# Check build logs
eas build:view <build-id>

# Validate credentials
eas credentials

# Clear cache and retry
eas build --clear-cache
```

#### 4. Coverage Threshold Not Met

**Issue:** Coverage below threshold

**Solution:**
```bash
# Check coverage report
npm run test -- --coverage

# Identify uncovered files
npm run test -- --coverage --verbose

# Add tests for critical paths
# Or adjust thresholds (temporarily)
```

#### 5. Deployment Health Check Fails

**Issue:** Post-deployment health check fails

**Solution:**
```bash
# Check application logs
vercel logs <deployment-url>

# Test health endpoint
curl https://your-app.vercel.app/api/health

# Check environment variables
vercel env ls
```

### Debug Mode

**Enable verbose logging:**

In workflow files:
```yaml
- name: Debug step
  run: |
    set -x  # Enable debug output
    npm run test -- --verbose
```

**Local debugging:**
```bash
# Debug tests
DEBUG=* npm test

# Debug Playwright
DEBUG=pw:* npm run e2e

# Debug builds
VERBOSE=1 npm run build
```

---

## Best Practices

### 1. Commit Messages

Follow conventional commits:
```
feat: add new feature
fix: resolve bug
chore: update dependencies
docs: update documentation
test: add tests
refactor: refactor code
perf: improve performance
ci: update CI configuration
```

### 2. Branch Strategy

```
main (production)
  └─ develop (staging)
      ├─ feat/feature-name
      ├─ fix/bug-name
      └─ chore/task-name
```

### 3. PR Guidelines

- Keep PRs small (<500 lines)
- Write descriptive titles
- Fill out PR template
- Request reviews
- Wait for CI to pass
- Squash merge to keep history clean

### 4. Testing Guidelines

- Write tests before pushing
- Maintain >80% coverage
- Test critical paths thoroughly
- Mock external dependencies
- Use factories for test data

### 5. Security Guidelines

- Never commit secrets
- Use environment variables
- Review dependency updates
- Monitor security alerts
- Keep dependencies updated

---

## Performance Optimization

### 1. CI Speed

- Use caching aggressively
- Run jobs in parallel
- Shard E2E tests
- Skip unnecessary steps

### 2. Build Speed

```bash
# Use Vercel build cache
# Optimize dependencies
# Use next.config.js optimizations
# Consider incremental builds
```

### 3. Test Speed

```bash
# Run only affected tests
npm test -- --findRelatedTests

# Use test sharding
npm test -- --shard=1/4

# Parallel test execution
npm test -- --maxWorkers=4
```

---

## Maintenance

### Weekly Tasks

- [ ] Review failed builds
- [ ] Check coverage trends
- [ ] Review security alerts
- [ ] Update dependencies

### Monthly Tasks

- [ ] Review and optimize workflows
- [ ] Clean up old artifacts
- [ ] Update documentation
- [ ] Review and rotate secrets

### Quarterly Tasks

- [ ] Audit CI/CD costs
- [ ] Review and update thresholds
- [ ] Plan infrastructure improvements
- [ ] Team retrospective on CI/CD

---

## Support & Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Playwright Docs](https://playwright.dev/)
- [Vercel Docs](https://vercel.com/docs)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)

### Internal Resources
- CI/CD Dashboard: `.github/workflows/`
- Test Coverage: Codecov
- Security Reports: Snyk, GitHub Security

### Getting Help
- Create issue in repository
- Contact DevOps team
- Check troubleshooting section
- Review GitHub Actions logs

---

## Changelog

### v1.0.0 (2025-01-02)
- Initial CI/CD implementation
- Enhanced CI pipeline with parallel execution
- Mobile build pipeline with EAS
- Deployment pipeline with rollback
- Database migration testing
- Comprehensive pre-commit hooks
- E2E testing with Playwright sharding
- Security scanning integration

---

**Last Updated:** 2025-01-02
**Maintained By:** DevOps Team
**Review Frequency:** Quarterly
