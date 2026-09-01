# Mintenance Beta Stabilisation — Phase 2 Report

Date: 2026-09-01  
Status: **PARTIAL — release gates are not all green**

## Scope

This report follows the Phase 2 specification. Work was limited to install, workspace, validation,
build, test-runner, CI, environment documentation, mobile export, and unauthenticated E2E smoke
infrastructure. No product features, UI redesign, Stripe business logic, or live Supabase migration
was introduced.

## A. Package and workspace integrity

- Root package manager: npm workspaces (`apps/*`, `packages/*`).
- `npm ci --ignore-scripts=false --cache .npm-cache` passes after replacing the POSIX-only `true` in
  the Windows-incompatible `prepare` script.
- The existing `package-lock.json` remains unchanged.
- The local npm shim on this workstation is broken, but the Node-bundled npm executable works;
  setup-node CI environments are unaffected.
- The install reports 76 audit findings (2 low, 31 moderate, 43 high). These were not mass-upgraded
  because that is outside Phase 2 scope.

## B. Type checking and lint

- Web TypeScript: pass.
- Mobile TypeScript: pass.
- Web ESLint: 0 errors, 939 warnings.
- Mobile ESLint: 0 errors, 1,749 warnings.
- Mobile `import/no-unresolved` is disabled because the managed Windows runner attempts to traverse
  an inaccessible profile directory; TypeScript remains the module-resolution gate.

## C. Web build

`npm run build:web` passes with an 8 GB Node heap. The previous failure was a V8 heap exhaustion
during the webpack build. The successful build generated all 500 static pages and the application
route output.

Non-blocking warnings remain for middleware deprecation, Sentry configuration, Browserslist
freshness, and `metadataBase`.

## D. Tests

- Mobile Jest full-suite execution completes successfully after mocking the password-breach API call
  in the legacy AuthService unit test.
- The targeted AuthService suite: 34 passed, 5 intentionally skipped.
- The test runner still emits asynchronous post-teardown/open-handle warnings in parts of the mobile
  suite; these are Phase 3 cleanup candidates.
- Web Vitest cannot start in this managed environment: esbuild receives `Access is denied` while
  resolving a parent directory, before test discovery. The same failure reproduces with a minimal
  config and an explicit `--dir .`, so it is recorded as a host restriction rather than hidden as a
  passing test.

## E. E2E smoke

Added an unauthenticated Playwright smoke test for `/login`. The standalone Playwright Chromium
process is blocked by host-level `spawn EPERM`. The same flow was verified successfully in the Codex
in-app browser: login page, title, welcome text, email/password fields, and sign-in control all
rendered.

## F. Mobile production-like validation

Android Expo export passes and produces `apps/mobile/.expo/phase2-export`. The export bundles
successfully, but Firebase configuration files are absent in this local environment, so push
notifications are not included.

## G. Environment and CI

Safe placeholders were added to `.env.example`; no credentials or secrets were added. The
storage-integrity workflow now uses Node 20.19.4. The reusable `validate:phase2` script runs type
checks, lint, unit tests, web build, mobile Android export, and smoke-test infrastructure using
workspace-local binaries.

## H. Supabase live read-only audit

The Supabase MCP was used without writes. Live migration history ends at `20260805194939`, while
local migrations extend through `20260831`; this is material migration drift and must be reconciled
separately with authorization.

The required `npx supabase db diff --local` check was attempted through the bundled npm executable
with a workspace-local cache and telemetry disabled. The CLI reached shadow-database creation, then
stopped because Docker Desktop is unavailable/permission-blocked (`docker_engine` and the protected
Docker config cannot be opened). This local-database diff therefore could not be authoritatively
completed in the managed workstation.

Observed live counts: 10 profiles, 18 jobs, 17 properties, 12 bids, 12 contracts, 63 messages, 0
escrow payments, and 0 subscriptions. Live roles include `admin`, `contractor`, and `homeowner`.

Advisors also reported a duplicate service-area index, unused indexes, and security-definer helper
functions/RLS areas requiring review. No live data or schema was changed.

## I. Files changed for Phase 2

- `.env.example`
- `.github/workflows/storage-integrity.yml`
- `apps/mobile/eslint.config.mjs`
- `apps/mobile/package.json`
- `apps/mobile/src/services/__tests__/AuthService.test.ts`
- `docs/CI_QUALITY_GATES.md`
- `docs/PHASE2_STABILISATION_REPORT.md`
- `package.json`
- `playwright.smoke.config.ts`
- `apps/web/e2e/smoke.spec.ts`
- `scripts/rebuild-native.mjs`
- `scripts/validate-phase2.mjs`

The worktree also contains unrelated pre-existing user changes and additions; they were preserved
and are not attributed to this audit:

- `apps/mobile/src/__tests__/services/AIAnalysisService.test.ts` (deleted)
- `apps/mobile/src/screens/job-details/JobDetailsScreen.tsx`
- `apps/mobile/src/screens/job-details/components/AIAnalysisCard.tsx`
- `apps/mobile/src/screens/job-details/viewmodels/JobDetailsViewModel.ts`
- `apps/mobile/src/screens/job-details/viewmodels/__tests__/JobDetailsViewModel.test.ts`
- `apps/mobile/src/services/AIAnalysisService.ts`
- `apps/mobile/src/services/__tests__/AIAnalysisService.test.ts`
- `apps/web/__tests__/integration-real/payment-flow.integration.test.ts`
- `apps/web/app/api/ai/analyze/route.ts`
- `packages/api-contracts/src/index.ts`
- `apps/web/__tests__/integration-real/cross-user-isolation.integration.test.ts`
- `apps/web/lib/database.types.ts`
- `packages/api-contracts/src/ai.ts`
- `supabase/migrations/20260831224315_fix_jobs_select_rls_isolation.sql`
- `supabase/migrations/20260831231341_harden_payments_write_rls.sql`
- `.npm-cache/` (local generated npm cache)

## J. Root causes and product bugs exposed

1. Windows `prepare` used POSIX shell syntax and failed during lifecycle installation.
2. Web webpack build exceeded the default Node heap.
3. The AuthService test did not mock its newly introduced breach-check API dependency, causing
   real-network fallback and three false-negative tests.
4. The managed runner blocks esbuild directory access and standalone browser process creation.
5. Mobile test teardown leaves asynchronous handles in some suites.

## K. Phase 3 inputs and release decision

Phase 2 remains **PARTIAL** until web Vitest and standalone Chromium can run in an unrestricted
CI/desktop environment, the mobile teardown warnings are cleaned up, and local/live Supabase
migration drift is reviewed and safely reconciled. The live helper-function/RLS findings, dependency
audit findings, missing Firebase configuration, and any genuine integration-test failures should be
triaged as Phase 3 work.

`git diff --check` reports no whitespace errors. No package-lock changes were made.
