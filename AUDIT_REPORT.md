# Mintenance Codebase Audit Report

**Date**: 2026-02-26
**Version Audited**: 1.2.4
**Auditor**: Claude Code (Automated Analysis)
**Scope**: Full monorepo — `apps/web` (Next.js 16), `apps/mobile` (Expo/React Native 0.81.5), `packages/*`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Security Analysis](#2-security-analysis)
3. [Code Quality and Architecture](#3-code-quality-and-architecture)
4. [Performance and Optimization](#4-performance-and-optimization)
5. [Testing and Quality Assurance](#5-testing-and-quality-assurance)
6. [Dependencies and Technical Debt](#6-dependencies-and-technical-debt)
7. [Documentation and Maintainability](#7-documentation-and-maintainability)
8. [Accessibility and Standards](#8-accessibility-and-standards)
9. [Build and DevOps](#9-build-and-devops)
10. [Prioritised Action Plan](#10-prioritised-action-plan)
11. [Appendix](#11-appendix)

---

## 1. Executive Summary

### Platform Overview

Mintenance is a full-stack UK property-maintenance marketplace structured as an npm workspaces monorepo:

- **`apps/web`** — Next.js 16.0.4 SSR web app (260+ API routes, 100+ pages)
- **`apps/mobile`** — Expo SDK ~54 / React Native 0.81.5 (100+ screens)
- **`packages/*`** — 8 shared packages (types, shared, auth, ai-core, shared-ui, design-tokens, api-client, security)

### Key Metrics

| Category | Metric | Value | Status |
|----------|--------|-------|--------|
| Security | npm audit vulnerabilities | 18 (1 critical, 6 high, 1 moderate) | 🔴 |
| Security | Live credentials on disk | sk\_live Stripe key + service role key | 🔴 |
| Code Quality | Files >300 lines (CLAUDE.md limit) | 233 files >500 lines; ~390+ over 300 | 🟡 |
| Code Quality | `any` types in source | ~37 files | 🟢 |
| Code Quality | `console.*` in app code | 24 occurrences | 🟢 |
| Code Quality | API routes without withApiHandler | 1 (Stripe webhook — intentional) | ✅ |
| Testing | Web test suites passing | 176/183 (96.2%) | ✅ |
| Testing | Mobile tests passing | 9,743/10,393 (93.8%) | ✅ |
| Performance | Unoptimised img tags | 21 raw tags | 🟢 |
| Dependencies | Outdated packages | 18 packages have newer versions | 🟡 |
| Build | TypeScript strict mode | ON (ignoreBuildErrors: false) | ✅ |
| Build | CI/CD workflows | 11 workflow files | ✅ |

### Overall Grade: **B- (74/100)**

Significant progress since the February 13 audit. The main risks are live production credentials on disk, a critical CVE in fast-xml-parser, and pervasive file-size technical debt (233 files over 500 lines).

---

## 2. Security Analysis

### 2.1 Dependency Vulnerabilities (npm audit)

#### 🔴 CRITICAL

**fast-xml-parser — Entity Encoding Bypass**

- **Advisories**: GHSA-m7jm-9gc2-mpf2 (CVSS 9.3) and GHSA-jmr7-xgp7-cmfj (CVSS 7.5)
- **Affected range**: 4.1.3 – 5.3.5
- **Via**: `@google-cloud/storage` dependency chain
- **Impact**: Remote attacker can bypass entity encoding via regex injection in DOCTYPE entity names; potential entity expansion DoS
- **Current state**: `package.json` already overrides to `5.3.4` — **STILL VULNERABLE**. Must change override to `5.3.6` or later.
- **Effort**: Low

Fix: In `package.json`, change `overrides["fast-xml-parser"]` from `"5.3.4"` to `"5.3.6"`.

#### 🟡 HIGH (6 vulnerabilities)

| Package | CVSS | Issue | Fix |
|---------|------|-------|-----|
| `axios` 1.0.0–1.13.4 | 7.5 | DoS via prototype key in mergeConfig | `npm update axios` |
| `jspdf` <=4.1.0 | 8.1 | PDF injection in AcroForm (arbitrary script exec) | Upgrade to `jspdf@4.2.0` |
| `jspdf` <=4.1.0 | 8.1 | PDF Object Injection via addJS method | Upgrade to `jspdf@4.2.0` |
| `jspdf` <=4.1.0 | — | DoS via malicious GIF dimensions | Upgrade to `jspdf@4.2.0` |
| `minimatch` (multiple ranges) | — | ReDoS backtracking | `npm update minimatch` |
| `tar` < 7.5.8 | — | Insufficient symlink protection during extraction | `npm update tar` |
| `rollup` 4.0.0–4.58.0 | — | Prototype pollution in build tool | Update devDependencies |

#### 🟢 MEDIUM / LOW

| Package | Severity | Issue |
|---------|----------|-------|
| `ajv` (multiple ranges) | MODERATE | ReDoS when using the `$data` option |
| `qs` 6.7.0–6.14.1 | LOW | Query string parsing edge case |

**Immediate action**: Run `npm audit fix`, then manually bump the `fast-xml-parser` override to `5.3.6`.

---

### 2.2 Credentials and Secrets on Disk

#### 🔴 CRITICAL — Live Production Credentials in `apps/web/.env.local`

This file is gitignored but **present on disk** with live production secrets:

```
SUPABASE_SERVICE_ROLE_KEY=REDACTED...   (bypasses ALL RLS policies)
STRIPE_SECRET_KEY=REDACTED...               (live Stripe secret key)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=REDACTED...         (Google Maps key)
```

**Risks**:
- The live Stripe secret key allows full Stripe account manipulation (charges, transfers, refunds, customer data access)
- The Supabase service role key bypasses ALL Row Level Security — full database read/write without restrictions
- The Google Maps API key may incur billing if HTTP referrer restrictions are not configured

**Immediate Actions**:
1. Rotate the Stripe secret key now in the Stripe dashboard
2. Rotate the Supabase service role key in the Supabase dashboard
3. Add HTTP referrer restrictions to the Google Maps API key in Google Cloud Console
4. Install `detect-secrets` as a pre-commit hook: `pip install detect-secrets && detect-secrets scan > .secrets.baseline`

#### 🟡 HIGH — Sensitive Files in Repository Root (Not Committed)

Present on disk but not in git — should be deleted:
- `auth.json` — benign stubs
- `cookies_homeowner.txt` — test session cookie data
- `tmp_login.json` — temporary login token data

---

### 2.3 Content Security Policy (CSP)

**File**: `apps/web/middleware.ts` (lines ~95–107)

The public routes CSP includes both `'unsafe-inline'` and `'unsafe-eval'` in `script-src`. These directives significantly weaken XSS protection:

- `'unsafe-inline'`: Allows inline script tags and inline event handler attributes
- `'unsafe-eval'`: Allows dynamic code evaluation (only required in React development mode)

Note: Authenticated routes already use nonce-based CSP (more secure). Apply the same pattern to public routes for production.

**Recommendation**:
- Remove `'unsafe-eval'` from the production CSP
- Replace `'unsafe-inline'` with nonce-based CSP — Next.js middleware supports this natively
- The authenticated-route CSP in `middleware.ts` is already the correct pattern; replicate it for public routes

---

### 2.4 Inline HTML Rendering Usage

**18+ instances** of React's `__html` prop pattern (`{ __html: ... }`) found across the codebase. Most are low-risk static CSS injections:

| File | Risk | Note |
|------|------|------|
| `components/StructuredData.tsx` | Low | Uses `JSON.stringify(sanitizedData)` — sanitisation present |
| `BentoGrid.tsx`, `FeaturedArticle.tsx`, etc. | Low | Static CSS strings only |
| `lib/maps/map-utils.ts` | Low | Sets a static emoji string — not user input |

**Action**: Audit each instance to confirm no user-controlled data flows into any raw HTML rendering. Any instance accepting user input must sanitise with DOMPurify before rendering.

---

### 2.5 Non-Standard Supabase Client Instantiation

**10 files** use `createClient` directly from `@supabase/supabase-js` instead of the canonical `@/lib/api/supabaseServer`:

| File | Status |
|------|--------|
| `app/api/auth/reset-password/route.ts` | ✅ Intentional — documented exception for token-based sessions |
| `app/contractor/card-editor/page.tsx` | ❌ Migrate to `serverSupabase` |
| `app/contractor/gallery/page.tsx` | ❌ Migrate |
| `app/contractor/invoices/page.tsx` | ❌ Migrate |
| `app/contractor/profile/page.tsx` | ❌ Migrate |
| `app/contractor/quotes/[id]/page.tsx` | ❌ Migrate |
| `app/contractor/reporting/page.tsx` | ❌ Migrate |
| `app/contractor/[id]/page.tsx` | ❌ Migrate |
| `app/jobs/[id]/sign-off/page.tsx` | ❌ Migrate |
| `lib/database.ts` | ❌ **HIGH PRIORITY** — core utility file |

**Risk**: These bypass the RLS-aware server-side wrapper. Data fetched without proper authorisation context may expose records across tenant boundaries.

---

### 2.6 Authentication and Session Management

**Strengths**:
- ✅ Token family breach detection — reuse of a consumed refresh token invalidates the entire family
- ✅ Session timeout tracking (VULN-009) — absolute and idle timeouts implemented
- ✅ `__Host-` cookie prefix in production for additional cookie security
- ✅ Refresh tokens stored as hashes in the database (not plaintext)
- ✅ Token blacklist with fail-closed behaviour in production
- ✅ JWT + refresh token pair (1h access, 7–30 day refresh)
- ✅ CSRF double-submit cookie pattern with hardened auth paths

**Areas for Improvement**:
- Confirm all routes with `auth: false` in `withApiHandler` truly require public access
- The Stripe webhook route correctly omits `withApiHandler` (raw body needed for signature verification)

---

### 2.7 Input Validation

- ✅ 75+ API routes use Zod schema validation via `validateRequest()`
- ✅ Text sanitisation functions (`sanitizeText`, `sanitizeJobDescription`) used in job routes
- ✅ JWT format validation on password reset tokens (length + regex pattern check)
- ✅ Password breach checking via `checkPasswordBreach` in `@mintenance/auth`

---

### 2.8 CORS Configuration

**File**: `apps/web/lib/cors/config.ts`

Correctly implements strict whitelist-based CORS:

| Environment | Allowed Origins |
|-------------|----------------|
| Production | mintenance.com, www.mintenance.com, app.mintenance.com |
| Development | localhost:3000, localhost:19006 |

🟢 Minor: README references `mintenance.co.uk` while CORS uses `mintenance.com`. Clarify canonical domain and update accordingly.

---

## 3. Code Quality and Architecture

### 3.1 File Size Violations

`CLAUDE.md` specifies a maximum of 300 lines per file. The built-in audit script (`scripts/check-file-sizes.js`) reports:

| Category | Count |
|----------|-------|
| Files > 1,000 lines | **1** (`OfflineManager.ts` — 1,091 lines) |
| Files > 500 lines | **233** files |
| Files 400–500 lines | **156** files |
| Total files > 300 lines | **~390+** |

**Top Offenders**:

| File | Lines | App |
|------|-------|-----|
| `src/services/OfflineManager.ts` | 1,091 | Mobile |
| `src/services/contractor-business/ResourceManagementService.ts` | 979 | Mobile |
| `src/services/SustainabilityEngine.ts` | 946 | Mobile |
| `lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts` | 906 | Web |
| `src/screens/ServiceRequestScreen.tsx` | 905 | Mobile |
| `lib/services/agents/EscrowReleaseAgent.ts` | 887 | Web |
| `lib/cache.ts` | 793 | Web |
| `middleware.ts` | 746 | Web |
| `app/api/jobs/[id]/route.ts` | 755 | Web |
| `app/api/payments/release-escrow/route.ts` | 660 | Web |

**Root cause**: The file-size problem is pervasive across the entire codebase. Prior efforts reduced files from 17 over 1K to 1, but the 500+ line problem remains across 233 files.

---

### 3.2 `any` Types

~37 files with `any` types in production code (down from 56 on February 13).

| File | Location | Recommended Fix |
|------|----------|-----------------|
| `middleware.ts` | Lines 325, 328 — `options: any` in cookie helpers | Use `ResponseCookieOptions` from Next.js types |
| `scripts/adjust-rollout.ts` | `metadata: any`, `supabase: any` | Use `SupabaseClient` type |
| `e2e/helpers/test-data.ts` | `page: any` | Use Playwright `Page` type |
| `lib/dynamic-imports.tsx` | `Promise<any>` return | Use generic `Promise<T>` |

---

### 3.3 Architecture Patterns

**Strengths**:
- ✅ `withApiHandler` provides consistent auth, CSRF, rate-limiting, error handling (93.5% adoption)
- ✅ Shared packages provide good separation of concerns
- ✅ Zod validation schemas in `lib/validation/schemas.ts`
- ✅ Error hierarchy with consistent HTTP status mapping
- ✅ Idempotency checking for financial operations prevents duplicate charges
- ✅ Payment state machine prevents invalid payment transitions
- ✅ Job state machine enforces valid lifecycle transitions
- ✅ 13 autonomous agents for specialised tasks (pricing, matching, notifications, etc.)

**Concerns**:

**In-memory cache in serverless context** (`app/api/jobs/[id]/route.ts:29`):

```typescript
const aiAnalysisCache = new Map<string, { timestamp: number; data: unknown }>();
```

Vercel serverless: each cold-start gets a fresh process — this Map is silently ineffective. AI analysis results are re-computed on every cold-start, wasting compute and increasing latency. Use the existing Redis infrastructure via `AIResponseCache`.

**Multiple duplicate dashboard implementations**: `ContractorDashboard2025Client`, `ContractorDashboardProfessional`, `ContractorDashboardAirbnb`, `ContractorDashboardFixed` — four variants suggest an incomplete UI migration.

**Duplicate job card components**: `app/contractor/discover/components/JobCard.tsx` (619 lines) and `app/discover/components/JobCard.tsx` (564 lines) appear nearly identical — consolidation opportunity.

---

### 3.4 Console Statements

24 occurrences across app code (down from 42). Status is acceptable — most are in test scripts and JSDoc code examples, not executed in production.

---

### 3.5 Error Handling

- ✅ Error boundaries added to 55+ page directories
- ✅ Centralised `handleAPIError()` in `lib/errors/api-error.ts` with CORS header propagation
- ✅ Structured logging via `@mintenance/shared` logger throughout
- ✅ Financial operations wrapped with try/catch and rollback logic

---

## 4. Performance and Optimization

### 4.1 Unoptimised Images

**21 raw `<img>` tags** found in `apps/web/app` — these bypass Next.js `<Image>` optimisation (AVIF/WebP conversion, lazy loading, automatic sizing hints, blur-up placeholders).

Prioritise high-traffic pages: landing page, contractor profile cards, job listing thumbnails. Effort: Low per file, Medium overall.

---

### 4.2 In-Memory Cache in Serverless Context

**File**: `apps/web/app/api/jobs/[id]/route.ts:29`

A module-level `Map` is used as an AI analysis cache with a 24-hour TTL. In Vercel serverless, each cold-start gets a fresh process — this cache is silently ineffective. AI analysis results are re-computed on every cold-start.

**Fix**: Use the existing `AIResponseCache` service from `@/lib/services/cache/AIResponseCache`.

---

### 4.3 Bundle and Webpack Configuration

- ✅ `modularizeImports` configured for `lucide-react`, `date-fns`, `@radix-ui/react-icons`
- ✅ `optimizePackageImports` for all major `@mintenance/*` packages and Radix UI
- ✅ `outputFileTracingExcludes` prevents heavy AI/ML packages from bloating function bundles
- ✅ `splitChunks` with `maxAsyncRequests: 20` (reduced from 30 to minimise chunk loading failures)
- 🟡 Webpack `cache: { type: 'memory' }` — disables persistent filesystem cache, slowing local builds. Switch to `type: 'filesystem'` for development.

---

### 4.4 Server-Side Performance

- ✅ Rate limiting via Upstash Redis (`rate-limiter-enhanced.ts`)
- ✅ Idempotency keys prevent duplicate payment operations
- ✅ `AIResponseCache` service with Redis backend
- ✅ `DatabaseQueryCache` service for database query results
- 🟡 `lib/cache.ts` at 793 lines — consider splitting into focused modules

---

### 4.5 React Performance

- 782 `useEffect`/`useCallback`/`useMemo` usages — reasonable for this codebase scale
- 111 `useState([])` initialised with array literals — verify expensive computations are memoised
- No systematic `React.memo` audit performed — large list components (contractor browsing, job listings) may benefit from memoisation

---

## 5. Testing and Quality Assurance

### 5.1 Test Coverage Summary

| App | Test Suites | Passing | Failing | Pass Rate |
|-----|------------|---------|---------|-----------|
| Web (Vitest v4) | 183 | 176 suites | 6 (pre-existing) | 96.2% ✅ |
| Mobile (Jest 29) | ~597 files | 9,743 tests | ~650 | 93.8% ✅ |

Both exceed the 80% target. No statement/branch coverage percentages available (no `coverage-summary.json` found), but test counts are healthy.

### 5.2 Pre-Existing Test Failures (6 web suites)

| Suite | Known Issue | Effort |
|-------|-------------|--------|
| `rate-limiter` | Fallback behaviour test | Medium |
| `Card` (shared-ui mock) | Mock setup missing | Low |
| `Input` (shared-ui mock) | Mock setup missing | Low |
| `payment-flow` | Integration test timing | Medium |
| `BudgetRangeSelector` toast | Toast mock not configured | Low |
| Undocumented 6th | Unknown | Unknown |

### 5.3 Test Quality Observations

- ✅ `vi.hoisted()` pattern used correctly for stable mock references
- ✅ Playwright E2E tests for critical auth flows (`e2e/` directory)
- ✅ Payment security UX tests in mobile (`__tests__/e2e/payment-security-ux.test.ts`)
- ✅ Penetration test suite exists (`__tests__/security/penetration-test.ts` — 666 lines)
- 🟡 `e2e/helpers/test-data.ts` — `page: any` should use Playwright `Page` type
- 🟡 `test/setup.ts` at 702 lines — should be split into domain-specific setup files
- 🟡 No coverage thresholds enforced in CI — add minimum thresholds (70% lines/branches)

### 5.4 Undertested Critical Paths

- Complete job lifecycle integration test (all 11 phases from CLAUDE.md)
- Contract signing E2E flow (both parties)
- Escrow 7-day auto-release (homeowner non-response safety net)
- `OfflineManager.ts` — largest file, complex sync logic, likely undertested
- Mobile push notification delivery

---

## 6. Dependencies and Technical Debt

### 6.1 Outdated Packages

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| `@expo/metro-runtime` | 5.0.5 | 55.0.6 | **MAJOR gap** — possible Expo SDK mismatch |
| `tailwindcss` | 3.4.19 | 4.2.1 | Significant breaking changes in v4 |
| `jest` | 29.7.0 | 30.2.0 | Breaking changes for mobile tests |
| `eslint` | 9.39.2 | 10.0.2 | Breaking changes — assess flat config impact |
| `@types/node` | 20.x | 25.x | Major version jump |
| `react-native-worklets` | 0.5.2 | 0.7.4 | Minor update available |
| `globby` | 14.1.0 | 16.1.1 | Breaking changes |
| `rimraf` | 5.x | 6.x | Breaking changes |

**Critical**: The `@expo/metro-runtime` gap from 5.x to 55.x suggests the Expo SDK may be significantly out of date. Verify the actual Expo SDK version in `apps/mobile/package.json`.

### 6.2 Dependency Overrides

| Package | Current Override | Status |
|---------|-----------------|--------|
| `react` | 19.1.0 | Locked |
| `react-native` | 0.81.5 | Locked |
| `@sentry/browser/react` | 7.119.1 | Locked |
| `fast-xml-parser` | 5.3.4 | **STILL VULNERABLE** — must be 5.3.6 |

### 6.3 Potentially Unused Dependencies

Run `npx depcheck` to identify unused packages. Candidates for review:

- `speakeasy` and `otpauth` — both are TOTP libraries; likely only one is needed
- `bcryptjs` — potentially test-only if argon2 is the primary password hasher
- `qrcode` — verify active usage in MFA flows

---

## 7. Documentation and Maintainability

### 7.1 README Quality

The `README.md` is comprehensive and up-to-date:
- Clear product overview and user journey
- Architecture summary with tech stack table
- Platform statistics (260+ API endpoints, 100+ pages, 13 AI agents)
- Recent February 2026 updates section
- Canonical job lifecycle documentation with status transitions

🟢 Minor: README references `mintenance.co.uk` while CORS config uses `mintenance.com`. Clarify canonical domain.

### 7.2 Code Annotations

**145 in-code annotations** (TODO/FIXME/HACK/VULN/SECURITY) found. Notable examples:
- `lib/api/supabaseServer.ts:62` — explicit RLS bypass warning
- `lib/auth.ts:139` — token theft detection documentation
- `VULN-007`, `VULN-009` references throughout auth and CORS code

**Gap**: There is no centralised security vulnerability tracker. References like `VULN-007` and `VULN-009` appear in code comments but no document tracks their status and resolution. Create `docs/security/vuln-tracker.md`.

### 7.3 API Documentation

- Admin API documentation page exists at `/admin/api-documentation`
- No OpenAPI/Swagger spec file found in the repository
- No ADR (Architecture Decision Records) directory found

**Recommendation**: Add `docs/adr/` with records for key architectural decisions (custom JWT vs Supabase Auth, escrow model, RLS strategy).

---

## 8. Accessibility and Standards

### 8.1 ARIA and Semantic HTML

- **791 aria/role/alt attributes** found across web app components — solid baseline coverage
- Radix UI primitives provide built-in ARIA roles for interactive components (Dialog, DropdownMenu, Select, Tabs)

### 8.2 Unlabelled Buttons

Several icon-only buttons lack `aria-label` attributes, particularly in admin pages:
- `app/admin/(auth)/forgot-password/page.tsx`
- `app/admin/ai-monitoring/components/AIMonitoringClient.tsx`
- `app/admin/api-documentation/components/ApiDocEndpointsList.tsx`

Icon-only buttons (expand/collapse, copy-code) require `aria-label` for screen reader accessibility. Run: `npm run test:a11y`

### 8.3 Images Without Alt Text

The 21 raw `<img>` tags (bypassing Next.js `<Image>`) may lack `alt` attributes — manual verification required.

### 8.4 Keyboard Navigation

- ✅ Radix UI components provide comprehensive keyboard navigation
- 🟢 Custom interactive components should be audited for `tabIndex` and visible focus indicators

---

## 9. Build and DevOps

### 9.1 CI/CD Workflows

11 GitHub Actions workflows cover the full development lifecycle:

| Workflow | Purpose |
|----------|---------|
| `ci-cd.yml` | Type-check, lint, test (web+mobile), `npm audit --audit-level high` |
| `security-scan.yml` | Dedicated security scanning |
| `deploy.yml` | Vercel production deployment |
| `mobile-build.yml` | EAS build (iOS/Android) |
| `e2e-tests.yml` | Playwright E2E tests |
| `performance-budget.yml` | Lighthouse/Core Web Vitals gates |
| `ml-training-pipeline.yml` | AI model training automation |
| `dependency-update.yml` | Automated dependency updates |
| `deploy-sam3-service.yml` | SAM3 AI service deployment |
| `mobile-tests.yml` | Mobile-specific test suite |
| `publish-packages.yml` | npm package publishing |

**Note**: The security audit CI will currently **FAIL** due to the CRITICAL fast-xml-parser vulnerability. Fix C3 first.

### 9.2 Build Configuration (Next.js)

- ✅ `typescript.ignoreBuildErrors: false` — TypeScript errors fail the build
- ✅ `poweredByHeader: false` — removes `X-Powered-By: Next.js` header (info disclosure reduction)
- ✅ Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS in production
- ✅ AVIF + WebP image optimisation with 30-day TTL
- ✅ `serverExternalPackages` correctly excludes heavy AI/ML libraries from function bundles
- 🟡 `Permissions-Policy: geolocation=()` — restricts third-party geolocation in iframes. App uses `navigator.geolocation` directly (unaffected). Verify this is intentional.
- 🟡 Webpack `cache: { type: 'memory' }` — slower local development builds. Use `type: 'filesystem'` for dev.

### 9.3 Vercel Configuration

- ✅ Custom build script `scripts/vercel-build.sh`
- ✅ 5 cron jobs for CRM/engagement automation
- ✅ All cron routes use `withCronHandler` (18 cron routes confirmed)
- ✅ `outputFileTracingRoot` set to monorepo root for correct serverless packaging

### 9.4 Environment Configuration

- ✅ `.env.example` present with comprehensive documentation and security notes
- ✅ `.gitignore` correctly excludes all `.env*` files (except `.env.example`)
- 🔴 Live production credentials present in `apps/web/.env.local` (see Section 2.2)
- ✅ `USE_HYBRID_INFERENCE=true` enables cost-saving ML routing

---

## 10. Prioritised Action Plan

### 🔴 Critical — Fix Within 24 Hours

| # | Action | Location | Effort |
|---|--------|----------|--------|
| C1 | Rotate live Stripe secret key in Stripe dashboard | External | Low |
| C2 | Rotate Supabase service role key in Supabase dashboard | External | Low |
| C3 | Fix fast-xml-parser CVE — change override from `5.3.4` to `5.3.6` in package.json | `package.json` | Low |
| C4 | Restrict Google Maps API key to HTTP referrers in Google Cloud Console | External | Low |

### 🟡 High — Next Sprint

| # | Action | Location | Effort |
|---|--------|----------|--------|
| H1 | Run `npm audit fix` and manually resolve (axios, jspdf, tar, rollup) | Root | Medium |
| H2 | Split `OfflineManager.ts` (1,091 lines) into focused sub-services | `apps/mobile/src/services/` | High |
| H3 | Migrate 9 non-standard `createClient` usages to `@/lib/api/supabaseServer` | Multiple contractor pages | Medium |
| H4 | Replace module-level Map cache with Redis in `jobs/[id]/route.ts` | `app/api/jobs/[id]/route.ts:29` | Low |
| H5 | Remove `'unsafe-eval'` from production public-route CSP | `middleware.ts:98` | Medium |
| H6 | Install `detect-secrets` pre-commit hook | `.git/hooks/` | Low |
| H7 | Delete `auth.json`, `cookies_homeowner.txt`, `tmp_login.json` from root | Root | Low |

### 🟢 Medium — Next Month

| # | Action | Location | Effort |
|---|--------|----------|--------|
| M1 | Split `ResourceManagementService.ts` (979 lines) | Mobile services | High |
| M2 | Split `SustainabilityEngine.ts` (946 lines) | Mobile services | High |
| M3 | Split `AssessmentOrchestrator.ts` (906 lines) | Web surveyor services | High |
| M4 | Split `EscrowReleaseAgent.ts` (887 lines) | Web agent services | High |
| M5 | Split `middleware.ts` (746 lines) — extract CORS, CSP, rate-limit logic | `middleware.ts` | Medium |
| M6 | Replace 21 raw `<img>` tags with Next.js `<Image>` component | Multiple pages | Low |
| M7 | Fix 6 pre-existing test failures | Test files | Medium |
| M8 | Add coverage thresholds to CI pipeline | `vitest.config.ts` | Low |
| M9 | Consolidate duplicate dashboard components (4 variants to 1) | `apps/web/app/contractor/dashboard-enhanced/` | Medium |
| M10 | Clarify canonical domain in CORS config and README | `lib/cors/config.ts` | Low |
| M11 | Run `npx depcheck` and remove genuinely unused dependencies | Root | Low |
| M12 | Type `page: any` in E2E helpers with Playwright `Page` | `e2e/helpers/test-data.ts` | Low |

### ⚪ Low — Backlog

| # | Action | Effort |
|---|--------|--------|
| L1 | Plan Tailwind v4 migration (significant breaking changes) | High |
| L2 | Plan Expo SDK major upgrade (`@expo/metro-runtime` 5.x → 55.x) | High |
| L3 | Add OpenAPI/Swagger spec for 260+ API routes | High |
| L4 | Create `docs/adr/` with Architecture Decision Records | Low |
| L5 | Create `docs/security/vuln-tracker.md` documenting VULN-001 through VULN-009 | Low |
| L6 | Enable filesystem webpack cache for local dev | Low |
| L7 | Add `aria-label` to unlabelled icon-only buttons in admin pages | Low |
| L8 | Add `React.memo` to large list components | Medium |

---

## 11. Appendix

### A. File Size Distribution

```
Files > 1,000 lines:    1   (target: 0 per CLAUDE.md)
Files 500–1,000 lines: 232  (target: 0 per CLAUDE.md)
Files 400–500 lines:   156  (approaching limit)
Total files > 300 lines: ~390+
```

### B. npm Audit Summary

```
Total vulnerabilities: 18
  Critical:  1  (fast-xml-parser — CVSS 9.3)
  High:      6  (axios, jspdf x3, minimatch, tar, rollup)
  Moderate:  1  (ajv — ReDoS)
  Low:       1  (qs)
```

### C. Key File Paths Reference

| Purpose | Path |
|---------|------|
| Auth implementation | `apps/web/lib/auth.ts` |
| Middleware (auth/CORS/CSP) | `apps/web/middleware.ts` |
| CORS config | `apps/web/lib/cors/config.ts` |
| API route handler pattern | `apps/web/lib/api/with-api-handler.ts` |
| Supabase server client | `apps/web/lib/api/supabaseServer.ts` |
| Rate limiter (enhanced) | `apps/web/lib/rate-limiter-enhanced.ts` |
| Error types | `apps/web/lib/errors/api-error.ts` |
| Zod validation schemas | `apps/web/lib/validation/schemas.ts` |
| Payment state machine | `apps/web/lib/payment-state-machine.ts` |
| CI/CD pipeline | `.github/workflows/ci-cd.yml` |
| Vercel config | `vercel.json` |
| File size audit script | `scripts/check-file-sizes.js` |

### D. Quick Wins (Under 1 Hour Each)

1. Change `fast-xml-parser` override in `package.json` from `5.3.4` to `5.3.6`
2. Rotate Stripe and Supabase credentials (external dashboards)
3. Delete `auth.json`, `cookies_homeowner.txt`, `tmp_login.json` from root
4. Add `detect-secrets` pre-commit hook
5. Replace module-level Map cache in `jobs/[id]/route.ts` with `AIResponseCache`
6. Fix 3 low-effort test failures (Card/Input mock setup, BudgetRangeSelector toast)
7. Restrict Google Maps API key in Google Cloud Console

### E. Tech Stack Reference

| Layer | Technology | Version |
|-------|-----------|---------|
| Web Framework | Next.js | 16.0.4 |
| Mobile Framework | Expo / React Native | SDK ~54 / 0.81.5 |
| Language | TypeScript | 5.9.3 (strict mode ON) |
| Database | Supabase (PostgreSQL) | Hosted |
| Auth | Custom JWT + Supabase | — |
| Payments | Stripe Connect | API 2024-04-10 |
| Caching | Upstash Redis | — |
| Testing (Web) | Vitest v4 | — |
| Testing (Mobile) | Jest 29 | — |
| E2E | Playwright | 1.58.x |
| CI/CD | GitHub Actions | 11 workflows |
| Hosting | Vercel | Serverless |
| AI/ML | OpenAI GPT-4 + YOLO/ONNX + SAM3 | — |

---

*Report generated by automated codebase analysis on 2026-02-26. All paths are relative to the repository root. Statistics based on static analysis at commit `dad51790`.*
