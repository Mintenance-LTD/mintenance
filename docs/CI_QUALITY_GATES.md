# CI Quality Gates

This document defines the enforcement model for the Mintenance CI pipeline. It is the source of truth for what **must** pass before code merges to `main` / `master` / `develop`.

## Required Status Checks (Branch Protection)

The following GitHub branch protection rules **must be configured** on `main`, `master`, and `develop`:

### Required Status Checks — All Three Branches

| Status Check | Workflow | Purpose |
|---|---|---|
| `Code Quality & Testing` | `ci-cd.yml` → `quality-checks` | Lint, type-check, unit/integration tests, coverage ≥70% |
| `PR Quality Gate` | `ci-cd.yml` → `pr-quality-gate` | Aggregate gate that explicitly fails if any upstream job fails |
| `E2E Tests` | `e2e-tests.yml` → `e2e-tests` | Playwright end-to-end tests |
| `Performance & Security Monitoring` | `ci-cd.yml` → `performance-monitoring` | Bundle size, dependency audit, license check |

### Conditional (Not Required) Checks

| Status Check | When It Runs | Purpose |
|---|---|---|
| `Integration Tests (Real DB)` | PRs touching `integration-real/**`, `test/integration/**`, or `supabase/migrations/**` | Real Supabase RLS/constraint verification. **Do not add to required checks** — path-filtered workflows are skipped on unrelated PRs, which would block them forever if required. Enforcement is via reviewer discipline: any PR that modifies migrations or integration tests must show this job passed. |

### Additional Branch Protection Settings

- **Require branches to be up to date before merging**: ✅ enabled
- **Require linear history**: ✅ enabled
- **Require signed commits**: ⚠️ recommended
- **Do not allow bypassing the above settings**: ✅ enabled (applies to admins)
- **Allow force pushes**: ❌ disabled
- **Allow deletions**: ❌ disabled

### How to Configure

GitHub → Settings → Branches → Branch protection rules → Add rule.

Apply identical rules to `main`, `master`, and `develop`.

---

## Enforcement Model

### Coverage Thresholds (Auto-Enforced)

Both test runners fail the build if coverage drops below:

| Metric | Threshold | Config File |
|---|---|---|
| Statements | 70% | [apps/web/vitest.config.ts:60](../apps/web/vitest.config.ts#L60), [apps/mobile/jest.config.js:80](../apps/mobile/jest.config.js#L80) |
| Branches | 65% | same |
| Functions | 70% | same |
| Lines | 70% | same |

**These thresholds are enforced by the test runners themselves** — no CI flag required. If coverage regresses, `npm run test:web` / `npm run test:mobile` exit with code 1, which fails the `quality-checks` job.

### Test Failure → Merge Block Chain

```
Tests fail (vitest/jest exit 1)
  ↓
quality-checks job fails
  ↓
pr-quality-gate job fails (explicit exit 1)
  ↓
Required status check fails
  ↓
PR cannot be merged (enforced by branch protection)
```

All downstream jobs (`build-staging`, `build-production`, `performance-monitoring`, `pr-quality-gate`) declare `needs: quality-checks`, so they are skipped — not passed — if tests fail.

---

## What Is NOT a Merge Gate

The following checks run in CI but **do not block merges** by design:

| Check | Reason |
|---|---|
| `Upload coverage to Codecov` | Codecov is a reporting service; outages should not block merges (`continue-on-error: true` on the upload step only) |
| `Mobile E2E Testing` (Detox) | macOS runners are expensive; runs only on push to `main`/`master`. Failures create follow-up issues but don't block the merge. |
| `Slack Notification` | Notification-only |
| `Lighthouse`, `Load Test`, `Performance Budget` | Informational workflows that report trends, not gates |

---

## Adding New Skipped Tests

New `.skip()`, `xit()`, `xdescribe()` tests must include a tracking issue reference, enforced by [scripts/ci/check-no-skip.js](../scripts/ci/check-no-skip.js).

**Required format:**
```ts
// SKIP: Tracked in #123 — flaky after Supabase v3 upgrade
it.skip('should handle payment retry', () => { ... });
```

PRs that add `.skip` without a `SKIP: Tracked in #NNN` comment on the line above will fail the `no-skip-check` job.

---

## Verifying Branch Protection Is Active

Run this from any branch to list required status checks on `main`:

```bash
gh api repos/:owner/:repo/branches/main/protection/required_status_checks --jq '.checks[].context'
```

Expected output:
```
Code Quality & Testing
PR Quality Gate
E2E Tests
Performance & Security Monitoring
```

If any are missing, update branch protection settings immediately.
