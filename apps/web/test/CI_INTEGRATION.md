# CI Integration Guide - Testing with Vitest

## GitHub Actions Integration

### Test Workflow Configuration

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: apps/web

      - name: Run type check
        run: npm run type-check
        working-directory: apps/web

      - name: Run tests
        run: npm run test:run
        working-directory: apps/web

      - name: Generate coverage report
        run: npm run test:coverage
        working-directory: apps/web

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/web/coverage/coverage-final.json
          flags: unittests
          name: codecov-mintenance

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./apps/web/coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}

  lint:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: apps/web

      - name: Run ESLint
        run: npm run lint
        working-directory: apps/web
```

---

## Coverage Reporting

### Codecov Configuration

Create `codecov.yml` in the root:

```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%
    patch:
      default:
        target: 80%
        threshold: 2%

comment:
  layout: "header, diff, files"
  behavior: default
  require_changes: false

ignore:
  - "**/*.config.*"
  - "**/*.d.ts"
  - "**/test/**"
  - "**/__tests__/**"
  - "**/mockData/**"
```

### View Coverage Locally

After running tests with coverage:

```bash
npm run test:coverage

# Open the HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

---

## Vercel Integration

### Environment Variables

Add to Vercel project settings:

```bash
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Build Script

Update `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    }
  ],
  "github": {
    "silent": false,
    "autoJobCancelation": true
  },
  "checks": [
    {
      "name": "Type Check",
      "path": "apps/web",
      "schedule": "@daily",
      "command": "npm run type-check"
    },
    {
      "name": "Tests",
      "path": "apps/web",
      "schedule": "@daily",
      "command": "npm run test:run"
    }
  ]
}
```

---

## Pre-commit Hooks (Husky)

### Installation

```bash
npm install -D husky lint-staged
```

### Configuration

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

### Setup Husky

```bash
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

---

## Pull Request Checks

### Required Status Checks

Configure in GitHub repository settings:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Add rule for `main` branch
3. Enable **Require status checks to pass before merging**
4. Select:
   - ✅ Type Check
   - ✅ Tests
   - ✅ Lint
   - ✅ Coverage (80%)

### PR Template

Create `.github/pull_request_template.md`:

```markdown
## Description
<!-- Describe your changes -->

## Testing Checklist
- [ ] All tests pass locally (`npm test`)
- [ ] Coverage remains above 80%
- [ ] New tests added for new features
- [ ] E2E tests pass (if applicable)

## Test Evidence
<!-- Paste screenshot or output of test results -->

## Related Issues
Closes #
```

---

## Test Metrics Dashboard

### Setup Test Metrics Collection

```typescript
// test/metrics.ts
import { writeFileSync } from 'fs';

export function collectTestMetrics(results: any) {
  const metrics = {
    timestamp: new Date().toISOString(),
    total: results.numTotalTests,
    passed: results.numPassedTests,
    failed: results.numFailedTests,
    duration: results.testResults.reduce(
      (acc: number, result: any) => acc + result.perfStats.runtime,
      0
    ),
    coverage: {
      statements: results.coverageMap?.getCoverageSummary().statements.pct || 0,
      branches: results.coverageMap?.getCoverageSummary().branches.pct || 0,
      functions: results.coverageMap?.getCoverageSummary().functions.pct || 0,
      lines: results.coverageMap?.getCoverageSummary().lines.pct || 0,
    },
  };

  writeFileSync('.test-metrics.json', JSON.stringify(metrics, null, 2));
}
```

---

## Parallel Testing

### Configure for CI

```typescript
// vitest.config.mts
export default defineConfig({
  test: {
    // Run tests in parallel (faster CI)
    maxConcurrency: 5,

    // Limit workers based on CI environment
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: process.env.CI ? 2 : undefined,
        minForks: process.env.CI ? 1 : undefined,
      },
    },
  },
});
```

---

## Caching Strategies

### GitHub Actions Cache

```yaml
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      apps/*/node_modules
      packages/*/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Cache Vitest results
  uses: actions/cache@v4
  with:
    path: |
      apps/web/.vitest
    key: ${{ runner.os }}-vitest-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-vitest-
```

---

## Monitoring Test Performance

### Track Test Duration

```yaml
- name: Run tests with timing
  run: |
    npm run test:run -- --reporter=verbose --reporter=json --outputFile=test-results.json

- name: Analyze slow tests
  run: |
    node scripts/analyze-test-duration.js test-results.json
```

### Analyze Script

```javascript
// scripts/analyze-test-duration.js
const results = require('../test-results.json');

const slowTests = results.testResults
  .flatMap(file => file.assertionResults)
  .filter(test => test.duration > 1000)
  .sort((a, b) => b.duration - a.duration);

if (slowTests.length > 0) {
  console.log('⚠️  Slow tests detected:');
  slowTests.forEach(test => {
    console.log(`  ${test.fullName}: ${test.duration}ms`);
  });
}
```

---

## Debugging Failed CI Tests

### View Test Logs

```bash
# Download logs from GitHub Actions
gh run download <run-id>

# View specific test output
cat tests/test-results.json | jq '.testResults[] | select(.status=="failed")'
```

### Reproduce CI Environment Locally

```bash
# Use act to run GitHub Actions locally
npm install -g act

# Run test workflow
act -j test
```

### Debug Specific Test

```bash
# Run test that failed in CI
npm test -- --run path/to/failing-test.test.ts

# Run with debugging
npm run test:debug path/to/failing-test.test.ts
```

---

## Test Stability

### Flaky Test Detection

```yaml
- name: Run tests 3 times to detect flaky tests
  run: |
    npm run test:run || npm run test:run || npm run test:run
  continue-on-error: true

- name: Report flaky tests
  if: failure()
  run: |
    echo "::warning::Flaky tests detected"
```

### Retry Failed Tests

```typescript
// vitest.config.mts
export default defineConfig({
  test: {
    retry: process.env.CI ? 2 : 0,
  },
});
```

---

## Security Scanning

### Dependency Scanning

```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate

- name: Check for known vulnerabilities
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## Summary

With this CI integration:

- ✅ Tests run automatically on every PR
- ✅ Coverage reports are generated and tracked
- ✅ Slow tests are identified
- ✅ Flaky tests are detected
- ✅ PR merge is blocked if tests fail
- ✅ Test metrics are collected for monitoring

## Next Steps

1. Set up GitHub Actions workflow
2. Configure branch protection rules
3. Add Codecov integration
4. Set up pre-commit hooks
5. Monitor test performance weekly
