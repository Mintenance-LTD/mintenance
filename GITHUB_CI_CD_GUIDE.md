# GitHub CI/CD Configuration Guide

Complete guide to the CI/CD pipelines configured for the Mintenance project.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Workflows](#workflows)
3. [Setup Instructions](#setup-instructions)
4. [Workflow Details](#workflow-details)
5. [Secrets Configuration](#secrets-configuration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Mintenance project uses **GitHub Actions** for continuous integration and deployment. Our CI/CD pipeline includes:

- ✅ Automated testing on every PR
- ✅ Code quality checks (TypeScript, ESLint)
- ✅ Test coverage reporting
- ✅ Performance budget validation
- ✅ Security scanning
- ✅ Automated deployments

---

## 🔄 Workflows

### Active Workflows

| Workflow | File | Purpose | Trigger |
|----------|------|---------|---------|
| **Mobile Tests** | `mobile-tests.yml` | Run all mobile app tests | Push/PR to main/develop |
| **Week 1 Fixes** | `week1-fixes-validation.yml` | Validate critical fixes | PR to main/develop |
| **PR Validation** | `pr-validation.yml` | Quick PR checks | PR to main |
| **Performance** | `performance-budget.yml` | Check bundle sizes | PR affecting mobile/web |
| **Security** | `security-scan.yml` | Vulnerability scanning | Push to main |
| **Deploy** | `deploy.yml` | Deploy to production | Push to main |

---

## 🚀 Setup Instructions

### 1. Enable GitHub Actions

GitHub Actions are **already enabled** by default when you have `.github/workflows/` directory.

### 2. Configure Repository Secrets

Go to your repository: **Settings > Secrets and variables > Actions**

#### Required Secrets:

```bash
# Codecov (for test coverage)
CODECOV_TOKEN=<your-codecov-token>

# Sentry (for error tracking)
EXPO_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
SENTRY_ORG=<your-sentry-org>
SENTRY_PROJECT=<your-sentry-project>

# Supabase (for database)
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Deployment (optional)
VERCEL_TOKEN=<your-vercel-token>
EXPO_TOKEN=<your-expo-token>
```

### 3. Enable Branch Protection (Recommended)

Settings > Branches > Add branch protection rule

**For `main` branch**:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass:
  - `Mobile Unit Tests`
  - `PR Validation`
  - `Quality Gate`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

---

## 📖 Workflow Details

### 1. Mobile Tests (`mobile-tests.yml`)

**Triggers**: Push or PR to `main`/`develop` affecting mobile code

**Jobs**:
1. **Unit Tests** - Runs all unit tests with coverage
2. **Integration Tests** - Tests component integration
3. **Service Tests** - Validates service layer (requires 75% coverage)
4. **Test Summary** - Aggregates results
5. **Quality Gate** - Blocks PR if tests fail

**Example Output**:
```
✅ Unit Tests: 119 tests passed
✅ Coverage: 78% (Services: 82%)
✅ Integration Tests: 15 tests passed
```

**View Results**: Check the "Actions" tab after pushing

---

### 2. Week 1 Fixes Validation (`week1-fixes-validation.yml`)

**Purpose**: Validates all Week 1 critical fixes

**Triggers**: PR to `main`/`develop`

**Checks**:
- ✅ Navigation types compile successfully
- ✅ All 7 ParamLists exported
- ✅ Jest configuration working (lists 100+ tests)
- ✅ New test suites pass (StatusPill, BiometricLoginButton, BookingCard, RootNavigator)
- ✅ Sentry integration complete
- ✅ No JSX syntax errors

**Auto-comments on PR** with detailed validation results!

---

### 3. PR Validation (`pr-validation.yml`)

**Purpose**: Quick validation before detailed checks

**Triggers**: Any PR to `main`

**Checks**:
1. TypeScript type checking
2. Quick test run
3. Build configuration

**Time**: ~2-3 minutes

---

### 4. Performance Budget (`performance-budget.yml`)

**Purpose**: Enforce bundle size limits

**Triggers**: PR affecting `apps/mobile/` or `apps/web/`

**Validates**:
- Mobile bundle < 20MB
- Web bundles per page < 500KB
- Lighthouse scores > 90

---

### 5. Security Scan (`security-scan.yml`)

**Purpose**: Detect vulnerabilities

**Triggers**: Push to `main`, scheduled daily

**Scans**:
- npm audit for dependencies
- SAST (Static Application Security Testing)
- Secret scanning

---

## 🔐 Secrets Configuration

### How to Add Secrets

1. Go to: https://github.com/Mintenance-LTD/mintenance/settings/secrets/actions
2. Click "New repository secret"
3. Add name and value
4. Click "Add secret"

### Required for Week 1 Branch

```bash
# Minimal required secrets:
CODECOV_TOKEN       # Get from codecov.io after linking repo
EXPO_PUBLIC_SENTRY_DSN  # Get from sentry.io project settings
```

### Optional but Recommended

```bash
# For full CI/CD:
SENTRY_AUTH_TOKEN   # For source map uploads
VERCEL_TOKEN        # For web deployments
EXPO_TOKEN          # For mobile builds
```

---

## ✅ Best Practices

### When Creating a PR

1. **Ensure tests pass locally**:
   ```bash
   cd apps/mobile
   npm test
   ```

2. **Run type check**:
   ```bash
   npm run type-check
   ```

3. **Wait for CI checks** before requesting review

4. **Review the auto-comment** on your PR for detailed results

### When Merging

- ✅ All CI checks must be green
- ✅ At least one approval (if team has 2+ members)
- ✅ No merge conflicts
- ✅ Branch is up to date with base

### Commit Messages

Use conventional commits for auto-changelog:

```bash
feat: add new feature
fix: fix bug
test: add tests
docs: update documentation
chore: maintenance tasks
```

---

## 🐛 Troubleshooting

### Tests Fail in CI but Pass Locally

**Cause**: Environment differences

**Solution**:
```bash
# Run tests in CI mode locally:
CI=true npm test -- --watchAll=false
```

### "Jest configuration broken" Error

**Check**:
1. `jest.config.js` uses `babel-preset-expo`
2. No problematic mocks in `jest-setup.js`
3. Run: `npx jest --listTests`

### Coverage Below Threshold

**Service coverage requires 75%+**

**Fix**:
```bash
# Check current coverage:
npm test -- --coverage --watchAll=false

# Focus on service files:
npm test -- --testPathPattern=services --coverage
```

### Workflow Not Triggering

**Check**:
1. File is in `.github/workflows/`
2. YAML syntax is valid (use yamllint)
3. Trigger paths match changed files
4. Branch protection rules don't block workflows

**Validate YAML**:
```bash
# Use GitHub's workflow validator:
# Actions tab > Select workflow > "..." > Edit workflow
```

---

## 📊 Monitoring CI/CD

### View Workflow Runs

1. Go to: https://github.com/Mintenance-LTD/mintenance/actions
2. Select a workflow from the left sidebar
3. Click on a run to see details

### Check Test Coverage

1. View in PR comments (auto-posted)
2. Check Codecov dashboard: https://codecov.io/gh/Mintenance-LTD/mintenance
3. Download coverage artifacts from workflow run

### Performance Metrics

- View in "Performance Budget" workflow runs
- Check Lighthouse reports in artifacts
- Monitor bundle sizes over time

---

## 🎓 Advanced Configuration

### Add New Test Job

Edit `.github/workflows/mobile-tests.yml`:

```yaml
new-test-job:
  name: My New Test Job
  runs-on: ubuntu-latest

  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v6
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test -- --testPathPattern=my-tests
```

### Skip CI for Minor Changes

Add to commit message:
```bash
git commit -m "docs: update README [skip ci]"
```

### Debug Workflow

Add debug step:
```yaml
- name: Debug
  run: |
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
    ls -la
    env
```

---

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/)
- [Codecov Documentation](https://docs.codecov.com/)
- [Sentry Documentation](https://docs.sentry.io/)

---

## 🆘 Getting Help

**CI/CD Issues**:
1. Check workflow logs in Actions tab
2. Review this guide
3. Ask in team Slack/Discord

**Test Failures**:
1. Run tests locally first
2. Check error messages
3. Review test file for issues

**Coverage Issues**:
1. Run `npm test -- --coverage`
2. Check `coverage/` directory
3. Add missing tests

---

## ✨ Your Current Setup

For the `feat/week1-critical-fixes-and-tests` branch:

✅ **Week 1 Fixes Validation** will run automatically
✅ **Mobile Tests** will validate all 119+ tests
✅ **PR Validation** will check types and build
✅ **Auto-comment** will post results on PR

**To trigger**: Just create the PR on GitHub!

---

**Last Updated**: 2024-10-27
**Maintained By**: Development Team
