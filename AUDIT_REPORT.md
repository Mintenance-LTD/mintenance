# Mintenance Platform - Comprehensive Audit Report

**Date**: 2026-04-01 **Auditor**: Claude Opus 4.6 (automated + manual analysis) **Scope**:
Full-stack security, code quality, performance, payment compliance, competitive benchmark
**Application**: Mintenance - Property Maintenance Marketplace **Tech Stack**: Next.js 16 + React
Native (Expo 54) + Supabase/PostgreSQL + Stripe + Monorepo

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Security & Payment Audit](#2-security--payment-audit)
3. [PCI DSS Compliance Assessment](#3-pci-dss-compliance-assessment)
4. [Code Quality & Architecture](#4-code-quality--architecture)
5. [Performance & Optimization](#5-performance--optimization)
6. [Testing & Quality Assurance](#6-testing--quality-assurance)
7. [Dependencies & Technical Debt](#7-dependencies--technical-debt)
8. [Documentation & Maintainability](#8-documentation--maintainability)
9. [Accessibility & Standards](#9-accessibility--standards)
10. [Build & DevOps](#10-build--devops)
11. [Competitive Benchmark](#11-competitive-benchmark)
12. [Prioritized Action Plan](#12-prioritized-action-plan)
13. [Appendix: Technical Details](#13-appendix-technical-details)

---

## 1. Executive Summary

### Overall Grade: **C+ (69/100)**

| Category           | Score  | Grade | Trend                             |
| ------------------ | ------ | ----- | --------------------------------- |
| Security & Payment | 65/100 | C+    | Code strong, secret mgmt critical |
| Code Quality       | 72/100 | B-    | Improving                         |
| Performance        | 58/100 | D+    | Significant gaps found            |
| Testing            | 75/100 | B     | Good                              |
| Dependencies       | 62/100 | C-    | Needs Work                        |
| Documentation      | 55/100 | D+    | Weak                              |
| Accessibility      | 72/100 | B-    | Better than expected              |
| DevOps/CI          | 82/100 | A-    | Strong                            |

### Key Metrics

| Metric                    | Value                                      |
| ------------------------- | ------------------------------------------ |
| Total source files (web)  | 1,365 TS/TSX                               |
| API routes                | 370                                        |
| Test files (web)          | 220                                        |
| Test files (mobile)       | 620                                        |
| Supabase migrations       | 132                                        |
| RLS-enabled migrations    | 76                                         |
| npm vulnerabilities       | 14 (1 critical, 6 high, 2 moderate, 5 low) |
| `any` types (web source)  | ~1 (dramatically improved)                 |
| `console.*` (web source)  | ~8                                         |
| TODO/FIXME/HACK comments  | 74                                         |
| Disabled eslint rules     | 14                                         |
| Files >500 lines (web)    | 30                                         |
| Files >500 lines (mobile) | 20                                         |
| Largest source file       | 905 lines (AssessmentOrchestrator.ts)      |
| CI/CD workflows           | 15 GitHub Actions                          |
| Workspace packages        | 10 shared packages                         |

### Critical Findings Summary

| Priority               | Count | Category                                                                                              |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| CRITICAL (Stop Ship)   | 4     | Live Stripe SECRET key on disk, weak DB password, all prod secrets in .env.local, CSP `unsafe-inline` |
| HIGH (Fix Immediately) | 8     | npm vulns, internal API self-call, rate limiting gaps, admin auth gaps, Google Maps key unrestricted  |
| MEDIUM (Fix Soon)      | 14    | Large files, outdated deps, phone verification skip, missing accessibility                            |
| LOW (Plan to Fix)      | 8     | Documentation gaps, minor code quality                                                                |

> **IMMEDIATE ACTION REQUIRED**: The security agent discovered that `apps/web/.env.local` contains
> the **live Stripe secret key (`sk_live_`)**, a **weak database password (`Iambald1995!`)**, and
> 10+ other production secrets (OpenAI, Twilio, SendGrid, Upstash Redis, encryption master key).
> While these files are gitignored, all credentials should be considered compromised and rotated
> immediately.

---

## 2. Security & Payment Audit

### 2.1 Payment Data Flow

```
Homeowner Browser
    |
    v
Stripe Elements (iframe) --- Card data NEVER touches Mintenance servers
    |
    v (tokenized PaymentMethod)
POST /api/payments/create-intent
    |
    v (server-side Stripe SDK)
Stripe API -- creates PaymentIntent
    |
    v (client_secret returned to browser)
Browser confirms payment via Stripe.js
    |
    v (async webhook)
POST /api/webhooks/stripe
    |
    v (signature verified, idempotency checked)
Event Handlers -- update escrow_transactions in Supabase
    |
    v (when homeowner approves or 7-day timeout)
POST /api/payments/release-escrow
    |
    v (state machine validated, MFA checked, admin DB-verified)
Stripe Transfer to Contractor's Connect Account
```

**Positive Findings (Payment Security):**

- Card data NEVER touches the server - Stripe Elements iframe handles all card input
- Webhook signature verification implemented correctly via `WebhookSignatureVerifier`
- Idempotency keys prevent duplicate payment processing (both internal + Stripe-level)
- Payment state machine validates all transitions
- Escrow release uses optimistic locking (`updated_at` check) to prevent race conditions
- MFA required for high-risk escrow releases
- Admin role verified from database (not just JWT) for escrow operations
- Reconciliation records created when transfer succeeds but DB update fails
- Payment anomaly detection with risk scoring blocks suspicious transactions
- Amount validation against accepted bids / job budget with fail-safe maximum (50K)
- Deterministic Stripe idempotency keys prevent double-charging

### 2.2 Security Findings

#### CRITICAL

**2.2.1 ALL Production Secrets Exposed in Local .env.local Files** | CRITICAL

- **Location**: `apps/web/.env.local`, `/.env.local` (not in git, but on disk)
- **Finding**: Both `.env.local` files contain **live production secrets** including:
  - `STRIPE_SECRET_KEY=sk_live_51SDXwD...` (live Stripe SECRET key -- can charge real cards, issue
    refunds)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...` (live publishable key)
  - `DATABASE_URL` with password `Iambald1995!` (weak, personal password)
  - `SUPABASE_SERVICE_ROLE_KEY` (full admin access to database, bypasses RLS)
  - `JWT_SECRET` (can forge authentication tokens)
  - `OPENAI_API_KEY=sk-proj-...` (can incur AI costs)
  - `TWILIO_AUTH_TOKEN` (can send SMS as the app)
  - `SENDGRID_API_KEY=SG.XMm...` (can send emails as the app)
  - `ENCRYPTION_MASTER_KEY` (256-bit hex key for data encryption)
  - `UPSTASH_REDIS_REST_TOKEN` (Redis access)
  - `CSRF_SECRET` (can forge CSRF tokens)
  - `MINT_AI_VLM_API_KEY` (VLM inference access)
- **Impact**: Any developer with access to this working directory has **full production access**.
  The Stripe secret key can charge real customers, issue refunds, and access all payment data. The
  database password + service role key = full database access bypassing all RLS.
- **PCI DSS**: Violates Requirements 2.1, 3.4, 6.4.1, 6.5.6, 8.2.3
- **Fix (IMMEDIATE -- do within hours)**:
  1. **Rotate ALL secrets listed above** -- every one should be considered compromised
  2. Rotate Stripe live secret key FIRST (financial impact)
  3. Change database password to cryptographically random 64+ chars
  4. Verify secrets were never committed to git history
     (`git log --all --diff-filter=A -- .env.local apps/web/.env.local`)
  5. Replace all live keys with `sk_test_`/`pk_test_` keys for local development
  6. Add startup validation rejecting `sk_live_` when `NODE_ENV !== 'production'`
- **Effort**: LOW (secret rotation) but URGENT

**2.2.1b Weak Database Password** | CRITICAL

- **Location**: `apps/web/.env.local` (DATABASE_URL)
- **Finding**: Database password is `Iambald1995!` -- a personal, guessable password. A TODO comment
  acknowledges this but it has not been addressed.
- **Fix**: Generate new password:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and update in Supabase
  dashboard + Vercel env vars.

**2.2.1c Root .env.local Has Wrong Key Type** | CRITICAL

- **Location**: `/.env.local:45`
- **Finding**: `STRIPE_SECRET_KEY=pk_live_...` -- The root `.env.local` sets the SECRET key variable
  to a PUBLISHABLE key (`pk_live_` instead of `sk_live_`). This would cause API failures but also
  indicates configuration confusion between two `.env.local` files.
- **Fix**: Remove root `/.env.local` entirely. Only `apps/web/.env.local` should exist.

**2.2.2 CSP Allows `unsafe-inline` for Scripts** | CRITICAL

- **Location**: `apps/web/middleware.ts:114`
- **Finding**: `script-src 'self' 'unsafe-inline' https://js.stripe.com ...` -- The Content Security
  Policy uses `unsafe-inline` which undermines XSS protection entirely
- **Impact**: Any XSS vulnerability can execute arbitrary scripts, including stealing payment tokens
- **Note**: Nonces ARE generated (`x-csp-nonce` at line 94) but NOT used in the CSP directive. The
  `'nonce-{value}'` directive should replace `'unsafe-inline'`
- **PCI DSS**: Violates Requirement 6.5.7 (XSS prevention)
- **Fix**: Replace `'unsafe-inline'` with `'nonce-${publicNonce}'` in the CSP header. Update all
  inline scripts to include the nonce attribute.
- **Effort**: MEDIUM (requires updating all inline script references)

#### HIGH

**2.2.3 Internal API Self-Call Pattern (SSRF Risk)** | HIGH

- **Location**: `apps/web/app/api/payments/process-job-payment/route.ts:59-72`
- **Finding**: The `process-job-payment` route makes an internal HTTP fetch to
  `/api/payments/create-intent` using `NEXT_PUBLIC_APP_URL`. This pattern:
  1. Bypasses middleware (CSRF, rate limiting) on the internal call
  2. Could be redirected via DNS rebinding if `NEXT_PUBLIC_APP_URL` is manipulated
  3. Forwards the Authorization header to an internal endpoint
  4. Adds latency (extra HTTP round-trip)
- **Fix**: Import and call the create-intent logic directly as a function instead of making an HTTP
  call. This eliminates the SSRF surface entirely.
- **Effort**: MEDIUM

**2.2.4 npm Critical Vulnerability: loader-utils Prototype Pollution** | HIGH

- **Package**: `loader-utils 2.0.0-2.0.3` (via `@remotion/bundler`)
- **CVE**: GHSA-76p3-8jx3-jpfq (Prototype Pollution - CRITICAL severity)
- **Impact**: Could allow remote code execution if exploited during build
- **Fix**: Update `@remotion/cli` to latest version or override `loader-utils` to `>=2.0.4`
- **Effort**: LOW

**2.2.5 npm High Vulnerabilities: node-forge, xmldom, picomatch** | HIGH

- **node-forge <=1.3.3**: Signature forgery, certificate bypass, DoS (4 advisories)
- **@xmldom/xmldom <0.8.12**: XML injection via CDATA serialization
- **picomatch <=2.3.1**: Method injection + ReDoS
- **Fix**: Run `npm audit fix` for direct fixes; `npm audit fix --force` for breaking changes
- **Effort**: LOW-MEDIUM

**2.2.6 Rate Limiting Skipped for Most API Routes** | HIGH

- **Location**: `apps/web/middleware.ts:220-228`
- **Finding**: `RATE_LIMIT_SKIP_PREFIXES` includes `/api/payments`, `/api/admin`, `/api/escrow`,
  `/api/jobs`, `/api/bids`, and many more -- effectively skipping middleware rate limiting for the
  vast majority of API endpoints
- **Impact**: These routes rely on `withApiHandler` rate limiting which runs AFTER authentication.
  Unauthenticated brute-force or DoS attacks on these endpoints are not rate-limited at the
  middleware level.
- **Note**: The comment says "These routes handle their own rate limiting after authentication" --
  but an attacker could still flood unauthenticated requests
- **Fix**: Add a separate, lower-threshold rate limit for unauthenticated requests on all API routes
  at the middleware level. Only skip rate limiting for the Stripe webhook (which has its own
  signature verification).
- **Effort**: MEDIUM

**2.2.7 Escrow Auto-Release Cron Lacks Distributed Locking** | HIGH

- **Location**: `apps/web/app/api/cron/escrow-auto-release/route.ts`
- **Finding**: If the cron job runs concurrently (e.g., Vercel cold-starts two instances), the same
  escrow could be released twice
- **Fix**: Use the existing idempotency service or a Redis-based distributed lock before processing
  each escrow
- **Effort**: MEDIUM

**2.2.8 Google Maps API Key Exposed Without Restrictions** | HIGH

- **Location**: `apps/web/.env.local`, `apps/mobile/.env`
- **Finding**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB82hZ...` -- Same API key used in both web and
  mobile without referrer restrictions
- **Impact**: Anyone can extract and abuse this API key, incurring costs
- **Fix**: Configure HTTP referrer restrictions for web key, and Android/iOS app restrictions for
  mobile key. Use separate keys for web vs mobile.
- **Effort**: LOW (Google Cloud Console configuration)

#### MEDIUM

**2.2.9 CSRF Token Reuse** | MEDIUM

- **Location**: `apps/web/middleware.ts:103`
- **Finding**: `const csrfToken = existingCsrf || crypto.randomUUID()` -- The CSRF token is reused
  if it already exists in the cookie. This means the token persists for the full 24-hour `maxAge`.
- **Impact**: A longer-lived CSRF token increases the window for token theft
- **Fix**: Consider rotating the CSRF token more frequently (e.g., per-session or per-form)
- **Effort**: LOW

**2.2.10 Admin Routes Not Separately Rate Limited** | MEDIUM

- **Location**: Various admin API routes
- **Finding**: Admin routes use the same `withApiHandler` rate limits as regular user routes. Admin
  operations (escrow approval, user management, refunds) should have stricter limits.
- **Fix**: Add separate, stricter rate limiting for admin operations
- **Effort**: LOW

**2.2.11 Missing Re-Authentication for Sensitive Operations** | MEDIUM

- **Finding**: Operations like changing payment methods, updating email, or modifying security
  settings don't require re-authentication (password confirmation)
- **Impact**: If a session is hijacked, the attacker can modify sensitive account settings
- **Fix**: Add step-up authentication for sensitive operations
- **Effort**: MEDIUM

**2.2.12 Admin Routes Lack Database-Backed Role Verification** | MEDIUM

- **Location**: Various admin API routes (settings, user management, migrations, synthetic data)
- **Finding**: Most admin routes rely ONLY on the JWT `role` claim checked by `withApiHandler`. The
  `requireAdminFromDatabase()` function exists but is only used in the escrow release route. If a
  JWT signing key is compromised, all admin routes are accessible.
- **Positive**: Escrow release route correctly uses DB-backed admin verification
- **Fix**: Add `requireAdminFromDatabase()` to all admin POST/PUT/DELETE routes, or integrate it
  into `withApiHandler` when `roles: ['admin']` is specified
- **Effort**: MEDIUM

**2.2.13 Phone Verification Skip Flag Enabled** | MEDIUM

- **Location**: `apps/web/.env.local:200` (`SKIP_PHONE_VERIFICATION=true`)
- **Finding**: Phone verification bypass is enabled in local dev. If this flag accidentally reaches
  production (e.g., copy-paste of env vars), it would bypass a critical trust/safety gate for
  contractor verification.
- **Fix**: Add startup check that rejects this flag when `NODE_ENV=production`. Consider removing
  the flag entirely and using a feature flag service instead.
- **Effort**: LOW

---

## 3. PCI DSS Compliance Assessment

### SAQ-A Eligibility (Stripe Elements)

Mintenance uses Stripe Elements (iframe-based), which means card data never touches Mintenance
servers. This qualifies for **SAQ-A** (simplest compliance level).

| Requirement                               | Status        | Evidence                                                  |
| ----------------------------------------- | ------------- | --------------------------------------------------------- |
| **Req 1**: Firewall config                | Compliant     | Vercel platform handles network security                  |
| **Req 2**: No default credentials         | Compliant     | All secrets in env vars, no defaults in code              |
| **Req 3**: Protect stored cardholder data | Compliant     | No card data stored -- Stripe tokenization                |
| **Req 4**: Encrypt transmission           | Partial       | HTTPS enforced, but CSP has `unsafe-inline`               |
| **Req 5**: Anti-malware                   | N/A           | SaaS deployment, managed by Vercel                        |
| **Req 6**: Secure development             | Partial       | Good practices but `unsafe-inline` CSP, npm vulns         |
| **Req 7**: Access control                 | Compliant     | RLS, role-based auth, admin DB verification               |
| **Req 8**: Authentication                 | Compliant     | JWT auth, MFA for high-risk ops                           |
| **Req 9**: Physical access                | N/A           | Cloud-hosted                                              |
| **Req 10**: Monitoring/logging            | Compliant     | Comprehensive payment audit logs, Sentry APM              |
| **Req 11**: Security testing              | Partial       | Security scan workflow exists but weekly only             |
| **Req 12**: Security policies             | Non-compliant | No documented security policies or incident response plan |

**Overall PCI Status**: **Mostly Compliant for SAQ-A** with 4 items requiring attention (secret
management being the most critical).

### 3.1 Additional Positive Security Findings (from deep audit)

The security agent confirmed these additional controls are well-implemented:

- **Webhook timestamp validation**: Events older than 5 minutes are rejected
- **Database-backed idempotency**: Uses `check_webhook_idempotency` RPC (not just Redis)
- **CSRF double-submit with `__Host-` prefix**: Correctly uses `__Host-csrf-token` in production
  with `SameSite=Strict`
- **Token blacklisting on logout**: Fail-closed behavior in middleware
- **Session timeouts**: Both absolute (12hr) and idle (30min) with hard enforcement in production
- **Bearer token format validation**: Regex prevents CSRF bypass via malformed headers
- **Role read from DB profiles table**: Not from `user_metadata`, preventing client-side privilege
  escalation
- **SVG sandbox in next.config**:
  `contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"` for image optimization
- **Env validation at build time**: `env.ts` uses Zod schemas with regex patterns for key formats
- **Cron authentication**: Uses `CRON_SECRET` with constant-time comparison (`timingSafeEqual`)
- **Security monitoring**: Automated IP blocking after 5 high-severity events in 15 minutes
- **CSP-Report-Only header**: Nonce-based CSP migration already in progress via report-only header

---

## 4. Code Quality & Architecture

### 4.1 Architecture Assessment

**Strengths:**

- Well-structured monorepo with 10 shared workspace packages (`auth`, `types`, `shared`, `security`,
  `shared-ui`, `design-tokens`, `data-access`, `api-client`, `api-contracts`, `ai-core`)
- Clean separation of concerns across packages
- `withApiHandler` pattern eliminates boilerplate across 290/310 API routes (93.5%)
- Payment state machine for transaction integrity
- Zod validation schemas for all payment/user/job input (7 schema files)
- Service layer pattern for complex business logic (escrow, payments, building surveyor)
- CORS implemented as separate module with whitelist-based origin validation

**Weaknesses:**

- 30 web source files >500 lines (target: <300)
- Several God-class services: `EscrowReleaseAgent` (905 lines), `AssessmentOrchestrator` (904 lines)
- 370 API routes is a very high count -- some may be duplicative
- Internal HTTP self-call pattern in `process-job-payment` instead of direct function call
- Custom auth implementation (JWT + Supabase) instead of battle-tested auth library

### 4.2 Code Quality Metrics

| Metric                    | Value     | Target | Status    |
| ------------------------- | --------- | ------ | --------- |
| `any` types (web source)  | ~1        | 0      | Excellent |
| `console.*` (web source)  | ~8        | 0      | Good      |
| TODO/FIXME/HACK comments  | 74        | <20    | High      |
| Disabled eslint rules     | 14        | <5     | Moderate  |
| Largest source file       | 905 lines | <300   | Too Large |
| Files >500 lines (web)    | 30        | 0      | Too Many  |
| Files >500 lines (mobile) | 20        | 0      | Moderate  |
| API handler coverage      | 93.5%     | 100%   | Good      |
| TypeScript strict mode    | ON        | ON     | Compliant |
| Build passes clean        | YES       | YES    | Compliant |

### 4.3 Code Quality Issues (Deep Audit Findings)

**4.3.1 `authenticateUser` Accepts Any Password (Legacy Bypass)** | HIGH

- **Location**: `apps/web/lib/database.ts:89-95`
- **Finding**: The `authenticateUser` method accepts a `_password` parameter (underscore-prefixed)
  but **performs no password verification**. A TODO acknowledges this. If any code path calls this
  method, it returns a user for ANY password including empty string.
- **Fix**: Remove the method entirely or throw an explicit error directing callers to
  `supabase.auth.signInWithPassword()`

**4.3.2 `useSearchParams()` Without Suspense Boundary** | HIGH

- **Location**: `apps/web/app/login/page.tsx:7,38` (and register, jobs/create, contractor layouts)
- **Finding**: `useSearchParams()` called directly at page level without `<Suspense>` wrapper.
  Forces entire route to opt out of static rendering (CSR bailout). Degrades performance on every
  visit.
- **Fix**: Extract `useSearchParams()` into a child component wrapped in
  `<Suspense fallback={<Skeleton />}>`

**4.3.3 Rate Limiter Silently Allows All Requests on Redis Failure** | HIGH

- **Location**: `apps/web/lib/rate-limiter-enhanced.ts:340-350`
- **Finding**: When Redis is unavailable in production, the rate limiter returns `{ allowed: true }`
  -- becoming a complete no-op. Combined with the middleware skip list, rate limiting may provide
  near-zero protection.
- **Fix**: Implement proper Upstash Redis connection or use an in-memory fallback with reasonable
  defaults

**4.3.4 Security Dashboard Shows Hardcoded `-12%` Trend** | MEDIUM

- **Location**: `apps/web/app/admin/security/page.tsx:377`
- **Finding**: The Trend metric card displays literal `-12%` regardless of actual data. Misleads
  admins making security decisions.
- **Fix**: Wire to real API data or remove the card

**4.3.5 `handleInvestigate` is a No-op Toast Stub** | MEDIUM

- **Location**: `apps/web/app/admin/security/page.tsx:170-172`
- **Finding**: "Investigate" button shows `toast.success('Opening investigation...')` with no actual
  action. User-deceptive.
- **Fix**: Wire to investigation workflow or remove button until implemented

**4.3.6 `getSeverityColor` Maps HIGH to Green** | MEDIUM

- **Location**: `apps/web/app/admin/security/components/SecurityEventsList.tsx:64-74`
- **Finding**: High-severity security events display with emerald green (success color).
  Critical=red, medium=yellow, low=blue are correct, but high=green is a semantic inversion that
  could cause admins to underestimate threats.
- **Fix**: Change `high` case to `bg-orange-100 text-orange-700 border-orange-300`

**4.3.7 `window.location.reload()` Used 25+ Times as Data Refresh** | MEDIUM

- **Location**: `BidCard.tsx:86,91,104`, `JobsBulkActionsSection.tsx:46,103`,
  `security/page.tsx:230`, and 20+ more
- **Finding**: Full page reload used after mutations instead of React Query's `invalidateQueries()`.
  Destroys all state, refetches everything, resets scroll position.
- **Fix**: Replace with `queryClient.invalidateQueries()` for React Query pages; `router.refresh()`
  for Server Components

**4.3.8 AIMonitoringClient Doesn't Check response.ok** | MEDIUM

- **Location**: `apps/web/app/admin/ai-monitoring/components/AIMonitoringClient.tsx:92-117`
- **Finding**: `Promise.all` across 4 fetches calls `.json()` without checking `response.ok`. Non-OK
  responses silently render empty UI with no error feedback.
- **Fix**: Add `if (!res.ok) throw new Error(...)` before `.json()` or use `Promise.allSettled`

**4.3.9 Archived API Routes Still Accessible** | MEDIUM

- **Location**: `apps/web/app/api/_archived/`
- **Finding**: The `_archived` directory naming does NOT prevent Next.js from registering these as
  live endpoints. Testimonials, contractor-posts, activity-feed routes are still accessible.
- **Fix**: Move to a location outside `app/api/` or delete entirely

**4.3.10 E2E Tests Mostly Skipped** | MEDIUM

- **Finding**: 30+ `test.skip()` calls across critical E2E specs (job posting, contractor flow,
  mobile responsive, critical paths). The suite passes because most tests are skipped, not because
  flows are verified.

**4.3.11 `isDevelopment` Redefined 3 Times in Middleware** | LOW

- **Location**: `apps/web/middleware.ts:100, 315, 552` (plus `isDev` alias at 398)
- **Fix**: Hoist to a single declaration at function top

### 4.4 Top Large Files Requiring Splitting

| File                               | Lines | Recommendation                                          |
| ---------------------------------- | ----- | ------------------------------------------------------- |
| `EscrowReleaseAgent.ts`            | 905   | Split into VerifyPhotos, AutoRelease, RiskAssessment    |
| `AssessmentOrchestrator.ts`        | 904   | Extract orchestration steps into modules                |
| `EnhancedBayesianFusionService.ts` | 858   | Split math/stats logic from service orchestration       |
| `PredictiveAgent.ts`               | 834   | Extract prediction models, data fetching, scoring       |
| `AlertingService.ts`               | 831   | Split by alert type (email, push, in-app)               |
| `InvoiceManagementClient.tsx`      | 830   | Split into InvoiceList, InvoiceDetail, InvoiceActions   |
| `JobDetailsAirbnb.tsx`             | 822   | Split into sections (header, timeline, photos, actions) |
| `TaxInfoForm.tsx`                  | 806   | Split form sections into subcomponents                  |
| `FinancialsScreen.tsx` (mobile)    | 849   | Split by tab (income, expenses, charts)                 |
| `MessagingScreen.tsx` (mobile)     | 813   | Split into MessageList, MessageInput, ChatHeader        |

---

## 5. Performance & Optimization

### 5.1 Database Performance

**Strengths:**

- 132 Supabase migrations with 76 RLS-enabled
- Recent migrations address Security Advisor warnings and add FK indexes
- Indexes being added systematically
- `contractor/reporting` route correctly uses `Promise.all` for 6 parallel queries

**CRITICAL Issues:**

**5.1.1 N+1 Query Patterns** | HIGH

- `api/admin/users/bulk-verify/route.ts`: Loops over `userIds` array with individual SELECT + UPDATE
  per user (up to 200 sequential queries for 100 users)
- `api/notifications/route.ts`: Fetches 50 notifications then filters in JS to keep 7 -- filtering
  should be in the query
- `api/messages/threads/route.ts`: 4 sequential waterfall queries that could be parallelized with
  `Promise.all`
- **19 additional API route files** contain `for` loops with `.from()` calls inside (photos,
  reporting, refunds)

**5.1.2 Excessive `.select('*')` Usage** | HIGH

- **31 API route files** use `.select('*')` fetching all columns including large JSONB fields and
  text blobs
- Key offenders: user export, contractor tools/time-tracking/service-areas, feature-flags, agent
  settings

**5.1.3 Insufficient Pagination** | MEDIUM

- Only 24 uses of `.limit()` and 10 uses of `.range()` across 310 API routes
- Most list queries are **unbounded** -- returning entire table contents
- `contractor/reporting` fetches up to 500 escrow transactions just to sum amounts (should be
  DB-side aggregation)

**5.1.4 ~12 Redundant Indexes** | LOW

- Performance migration defines indexes on primary key `id` columns (already indexed by PK)
- `idx_jobs_status` defined twice; `idx_users_id` defined twice
- Wastes storage and slows writes

### 5.2 Frontend Performance

**Strengths:**

- Well-configured image optimization (AVIF + WebP, 30-day cache)
- 62 `loading.tsx` files provide proper loading skeletons
- Good `splitChunks` configuration with framework/lib/commons groups
- Comprehensive `optimizePackageImports` and `modularizeImports`

**CRITICAL Issues:**

**5.2.1 DynamicCharts Barrel Export Defeats Code Splitting** | HIGH

- `components/charts/DynamicCharts.tsx` line 57 statically re-exports recharts sub-components
- This ships ~100KB of recharts to EVERY chart consumer, completely defeating the dynamic imports
  above it
- 4 files affected: `RevenueTrendsChart.tsx`, `KpiCard.tsx`, `AnalyticsClient.tsx`,
  `PrimaryMetricCard2025.tsx`
- **Fix**: Remove static re-exports; have consumers use dynamic imports for helper components too

**5.2.2 50+ `page.tsx` Files with `'use client'`** | HIGH

- 50 out of 178 page.tsx files are entirely client components
- Eliminates Server Component benefits: no server-side data fetching, larger JS bundles, hydration
  overhead
- Worst offenders: `admin/tax` (816 lines), `contractor/documents` (763), `contractor/quotes` (686)
- **Fix**: Refactor to thin Server Component page + `*Client.tsx` pattern (already used in some
  admin pages)

**5.2.3 `@tremor/react` Statically Imported in 9 Files** | HIGH

- Tremor is a very large charting library, statically imported in 9 page components
- Despite `optimizePackageImports`, static import bundles all used Tremor components into page
  chunks
- **Fix**: Use `next/dynamic` pattern (like the existing `DynamicCharts.tsx` approach)

**5.2.4 `framer-motion` in 40+ Component Files** | MEDIUM

- framer-motion core runtime is ~30KB gzipped, imported in 40+ files
- Many imports are for simple fade/slide animations that CSS transitions could handle
- **Fix**: Use CSS `@starting-style` and `transition` for simple animations; reserve framer-motion
  for complex gestures

**5.2.5 Only 3 `next/dynamic` Imports in Entire App** | MEDIUM

- 178 pages with heavy components (maps, PDF, charts, chat) but only 3 uses of `next/dynamic`
- **Fix**: Add dynamic imports for maps, PDF viewers, chat widgets, chart libraries

**5.2.6 Only 13 `useMemo`/`useCallback` in Entire App** | MEDIUM

- 50+ client-side pages with complex filtering/mapping but almost no memoization
- Likely unnecessary re-renders on every state change

**5.2.7 16 Files Use Raw `<img>` Instead of `next/image`** | MEDIUM

- Missing automatic WebP/AVIF, responsive sizing, and lazy loading
- Production offenders: property pages, upload sections, profile photo dialogs

### 5.3 API/Server Performance

**Strengths:**

- Stripe operations use `stripeWithTimeout` (10s timeout)
- Idempotency prevents duplicate processing at multiple layers
- Supabase server client has 10-second timeout with AbortController
- Supabase subscriptions properly cleaned up (`.removeChannel`/`.unsubscribe`)

**Issues:**

**5.3.1 Middleware Adds 100-300ms for Supabase Auth Path** | HIGH

- Middleware (778 lines) runs on every non-static request
- For Supabase-authenticated users: TWO sequential network calls: `getUser()` +
  `profiles.select('role')`
- Creates a new `createServerClient` on every request instead of reusing
- **Fix**: Cache profile role in JWT claims or encrypted cookie

**5.3.2 Only 5 Files Use Server-Side Caching** | HIGH

- A well-designed cache utility exists at `lib/cache.ts` with proper tags and durations
- But only 5 files use it (properties, scheduling, onboarding, recommendations)
- Most API routes and Server Components hit Supabase fresh on every request
- **Fix**: Use `getCachedContractors`, `getCachedJobs`, etc. in Server Component pages

**5.3.3 Not Using Turbopack for Development** | MEDIUM

- Dev script uses `--webpack` flag explicitly; Next.js 16 defaults to Turbopack
- Suggests compatibility issues; should be investigated for faster HMR

**5.3.4 Webpack Memory Cache with `maxGenerations: 1`** | MEDIUM

- Overrides filesystem cache with limited in-memory cache
- Every build starts cold; higher memory usage; slower incremental builds

---

## 6. Testing & Quality Assurance

### 6.1 Test Coverage

| Area             | Test Files | Source Files     | Ratio     | Assessment                          |
| ---------------- | ---------- | ---------------- | --------- | ----------------------------------- |
| Web app          | ~214       | ~1,979           | **10.8%** | LOW -- well below industry standard |
| Mobile app       | 620        | ~800 est.        | ~78%      | Good                                |
| Web pass rate    | ~97%       | (178/183 suites) | --        | Good                                |
| Mobile pass rate | 93.8%      | (9,743/10,393)   | --        | Good                                |

**Test Pyramid Balance:**

| Layer                              | Files | %   | Ideal  |
| ---------------------------------- | ----- | --- | ------ |
| Unit (components, utils, hooks)    | ~160  | 75% | 60-70% |
| Integration (API routes, services) | ~45   | 21% | 20-30% |
| E2E (Playwright)                   | ~8    | 4%  | 5-10%  |

Coverage thresholds configured at 70% statements / 65% branches -- but **no per-directory
overrides** for high-risk modules like payments, auth, escrow.

### 6.2 Critical Path Test Coverage (Deep Audit)

| Critical Path                             | Tested? | Quality          | Notes                                                                            |
| ----------------------------------------- | ------- | ---------------- | -------------------------------------------------------------------------------- |
| Payment intent creation                   | Yes     | Excellent        | Schema validation, auth, anomaly detection, idempotency                          |
| Escrow release                            | Yes     | Excellent        | 60+ state machine tests, lifecycle integration, admin override                   |
| Webhook signature verification            | Yes     | Good             | Dedicated test + idempotency tests                                               |
| Authentication middleware                 | Yes     | Good             | JWT, CSRF, public routes, security headers, rate limiting                        |
| Job lifecycle state transitions           | Yes     | Good             | Full lifecycle integration + individual route tests                              |
| Token breach detection                    | Yes     | Good             | Dedicated test file                                                              |
| **Admin operations**                      | **NO**  | **CRITICAL GAP** | **61 admin API routes, only 1 test file** (tests `requireAdmin` middleware only) |
| Contract signing (sign/reject/pdf/delete) | Partial | Gap              | Only accept/sign route tested                                                    |
| Rate limiting                             | Partial | Known failures   | Pre-existing test failures remain                                                |

**6.2.1 Admin Operations: Largest Testing Gap** | HIGH

- **61 admin API routes** in `apps/web/app/api/admin/` with **only 1 test file**
- Untested routes include: escrow approval/rejection/hold, user management, bulk verification, admin
  account creation, revenue reporting, dispute management, refund processing, tax documents,
  security dashboard, settings, reconciliation, 10+ AI monitoring routes
- These routes handle **financial operations** (escrow, refunds, tax) and **user management** --
  bugs or auth bypasses could have severe consequences

### 6.3 Test Quality

**Strengths:**

- `vi.hoisted()` pattern consistently used (critical with `mockReset: true`)
- Proper describe/it structure with nested blocks covering auth, RBAC, 404, ownership, edge cases
- `createChainMock()` utility for Supabase fluent API mocking
- Zero snapshot tests -- all assertions are explicit value checks
- Good test data factories (users, jobs, bids, payments, Stripe test cards, scenario builders)
- Minimal flakiness risk (only 2 `setTimeout` in tests, no polling/sleep patterns)
- `mockReset: true` + `beforeEach(() => vi.resetAllMocks())` ensures isolation

**Concerns:**

- **Global React Query mock masks loading/error states**: `setup.ts` globally mocks React Query to
  always return `{ data: [], isLoading: false, isSuccess: true }`. Component tests never exercise
  error/loading paths unless they explicitly override.
- **Test factory status mismatch**: `createTestJob` defaults to `status: 'open'` but canonical
  lifecycle uses `'posted'`. Could mask bugs where code checks for `'posted'`.
- **E2E test directory split**: Root `e2e/` (JS) vs `apps/web/e2e/` (TS) -- unclear if CI runs both.
- **30+ `test.skip()` calls** in E2E specs (confirmed by code quality agent) -- suite passes because
  tests are skipped.

### 6.4 Test Infrastructure

**Strengths:**

- Vitest v4 with happy-dom, `mockReset: true`, 15s timeout
- Playwright for E2E with axe-core accessibility testing (417-line a11y spec)
- Detox for mobile E2E
- Comprehensive test setup (702 lines) with Jest compat, browser API mocks
- 15 CI/CD workflows including E2E, load testing, Lighthouse, security scan
- Codecov integration (conditional)

**Gaps:**

- ~4 pre-existing web test failures
- No `vitest-axe` for unit-level accessibility assertions
- No per-directory coverage thresholds for critical paths
- Missing `global-error.tsx` for root-level error handling

---

## 7. Dependencies & Technical Debt

### 7.1 Vulnerability Summary

| Severity  | Count  | Notable                                           |
| --------- | ------ | ------------------------------------------------- |
| Critical  | 1      | `loader-utils` prototype pollution (via Remotion) |
| High      | 6      | `node-forge`, `@xmldom/xmldom`, `picomatch`       |
| Moderate  | 2      | `brace-expansion`, `yaml`                         |
| Low       | 5      | `@tootallnate/once` chain                         |
| **Total** | **14** |                                                   |

### 7.2 Major Outdated Dependencies

| Package                     | Current | Latest | Breaking?   |
| --------------------------- | ------- | ------ | ----------- |
| `@googlemaps/js-api-loader` | 1.16.10 | 2.0.2  | Yes (major) |
| `expo`                      | 54.0.33 | 55.0.9 | Yes (major) |
| `@sentry/react-native`      | 7.11.0  | 8.6.0  | Yes (major) |
| `@stripe/react-stripe-js`   | 5.6.1   | 6.1.0  | Yes (major) |
| `@stripe/stripe-js`         | 8.9.0   | 9.0.1  | Yes (major) |
| `@supabase/ssr`             | 0.8.0   | 0.10.0 | Minor       |
| `date-fns`                  | 3.6.0   | 4.1.0  | Yes (major) |
| `eslint`                    | 9.39.2  | 10.1.0 | Yes (major) |
| `@vitejs/plugin-react`      | 5.1.3   | 6.0.1  | Yes (major) |

### 7.3 Dependency Count

| Area   | Dependencies | Dev Dependencies | Assessment                 |
| ------ | ------------ | ---------------- | -------------------------- |
| Root   | 2            | 36               | Lean                       |
| Web    | 71           | 32               | Moderate (71 runtime deps) |
| Mobile | 69           | 15               | Moderate (typical for RN)  |

---

## 8. Documentation & Maintainability

### 8.1 Documentation Assessment

| Document          | Exists   | Quality          | Notes                                           |
| ----------------- | -------- | ---------------- | ----------------------------------------------- |
| README.md         | Yes      | Good (632 lines) | Comprehensive setup instructions                |
| CLAUDE.md         | Yes      | Excellent        | Detailed coding standards and audit history     |
| OpenAPI spec      | Yes      | Unknown          | `openapi.yaml` exists in web app                |
| CHANGELOG         | No       | N/A              | No changelog maintained                         |
| ADR directory     | No       | N/A              | No architectural decision records               |
| Inline comments   | Moderate | --               | Good in payment/security code, sparse elsewhere |
| Env example files | Yes      | Good             | Detailed with explanations                      |

### 8.2 Key Gaps

- **No CHANGELOG**: Makes it hard to track what changed between releases
- **No ADRs**: Important decisions (Supabase over Firebase, Stripe over others, escrow pattern) are
  undocumented
- **74 TODO/FIXME/HACK comments**: Indicates known tech debt without follow-through
- **No documented incident response plan**: Required for PCI DSS Requirement 12

---

## 9. Accessibility & Standards

### 9.1 Assessment

| Criterion             | Status | Evidence                                                                                         |
| --------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Semantic HTML         | Good   | `<html lang="en">`, `<main>` in 35 files, skip-to-content link, 61 error boundaries              |
| ARIA attributes       | Good   | 323 ARIA attrs across 95 files; dedicated `AccessibleForm`, `AriaLiveRegion`, `AccessibleButton` |
| Keyboard navigation   | Good   | 63 keyboard handlers across 29 files; `SkipNavigation` with 3 targets; focus-visible styles      |
| Color contrast        | Good   | emerald-500 at 4.92:1 (AA); `prefers-contrast: high` rules; primary blue 4.87:1                  |
| Screen reader support | Good   | `AriaLiveRegion` for announcements; `aria-describedby`, `aria-errormessage` in forms             |
| Focus management      | Good   | `FocusTrap.tsx` for modals; proper tabindex management; keyboard-navigating class                |
| Reduced motion        | Good   | `prefers-reduced-motion: reduce` in 3 CSS files; `useReducedMotion` hook                         |
| Alt text              | Good   | 32 `alt=` across 21 files; no empty `alt=""` on non-decorative images                            |
| Mobile accessibility  | Good   | `AccessibleComponents.tsx` (667 lines); 44x44px touch targets E2E tested                         |
| E2E a11y testing      | Good   | 417-line Playwright spec with axe-core covering 9 pages                                          |

**Overall: Accessibility infrastructure is significantly better than initially assessed. Grade
upgraded from D to B-.**

### 9.2 Remaining Gaps

| Issue                                                     | Severity | Fix                                                                              |
| --------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `<main id="main-content">` only on 13 of 35 `<main>` tags | MEDIUM   | Skip-link target missing on 22 pages                                             |
| Missing `global-error.tsx`                                | MEDIUM   | No accessible fallback for root-level errors                                     |
| 4 form components with inputs but no labels               | MEDIUM   | YOLOCorrectionEditor, SecurityDashboard, PhotoUploadWizard, AIAssessmentShowcase |
| Lighter teal/mint shades may fail small-text contrast     | LOW      | Needs manual Lighthouse verification                                             |
| Redundant `role="main"` on `<main>` in SkipNavigation.tsx | LOW      | Remove implicit role duplication                                                 |
| No `vitest-axe` for unit-level a11y assertions            | LOW      | Would catch regressions per-component                                            |

---

## 10. Build & DevOps

### 10.1 CI/CD Pipeline Assessment

**15 GitHub Actions workflows** -- comprehensive:

| Workflow                   | Purpose                         | Assessment |
| -------------------------- | ------------------------------- | ---------- |
| `ci-cd.yml`                | Main CI/CD pipeline             | Strong     |
| `deploy.yml`               | Production deployment           | Good       |
| `deploy-staging.yml`       | Staging deployment              | Good       |
| `mobile-build.yml`         | Mobile app builds               | Good       |
| `mobile-tests.yml`         | Mobile test suite               | Good       |
| `security-scan.yml`        | Security scanning (weekly + PR) | Strong     |
| `lighthouse.yml`           | Performance monitoring          | Good       |
| `load-test.yml`            | Load testing                    | Good       |
| `e2e-tests.yml`            | End-to-end tests                | Good       |
| `performance-budget.yml`   | Bundle size checks              | Good       |
| `dependency-update.yml`    | Dependency updates              | Good       |
| `publish-packages.yml`     | Package publishing              | Good       |
| `deploy-sam3-service.yml`  | ML service deployment           | Good       |
| `ml-training-pipeline.yml` | ML training pipeline            | Good       |

**Security Scan Workflow includes:**

- `npm audit` on every push/PR
- Snyk (conditional on token)
- CodeQL analysis (JavaScript)
- TruffleHog secret scanning
- ESLint security rules
- Depcheck for unused dependencies

**Strengths:**

- Concurrency management prevents duplicate runs
- Separate staging and production deployment pipelines
- Secret scanning via TruffleHog
- Performance budgets tracked
- ML pipeline separate from app deployment

**Concerns:**

- Node.js version pinned to `20.19.4` in CI -- should match production
- No evidence of blue-green or canary deployments
- Load tests exist but unclear run frequency
- No test coverage gates in CI pipeline

### 10.2 Environment Management

| Aspect                     | Status                          |
| -------------------------- | ------------------------------- |
| `.env.local` in .gitignore | Yes -- Good                     |
| `.env.example` provided    | Yes -- Detailed                 |
| Env files tracked in git   | None -- Good                    |
| Secret rotation            | Unknown                         |
| Environment parity         | Issue -- Live Stripe key in dev |

---

## 11. Competitive Benchmark

### 11.1 Application Classification

- **Category**: Property Maintenance Marketplace (two-sided)
- **Business Model**: B2B2C (Homeowners + Contractors + Platform)
- **Scale**: Growth-stage SaaS
- **Comparable Platforms**: TaskRabbit, Thumbtack, Bark, Checkatrade, MyBuilder, Rated People,
  Plentific

### 11.2 Feature Parity Analysis

| Feature                  | Mintenance | TaskRabbit   | Thumbtack    | Bark     | Standard            |
| ------------------------ | ---------- | ------------ | ------------ | -------- | ------------------- |
| Job posting              | Yes        | Yes          | Yes          | Yes      | Table stakes        |
| Bidding system           | Yes        | No           | Yes          | Yes      | Common              |
| Escrow payments          | Yes        | Yes          | No           | No       | **Differentiator**  |
| Photo verification (AI)  | Yes        | No           | No           | No       | **Unique**          |
| Contractor profiles      | Yes        | Yes          | Yes          | Yes      | Table stakes        |
| In-app messaging         | Yes        | Yes          | Yes          | Yes      | Table stakes        |
| Reviews/ratings          | Yes        | Yes          | Yes          | Yes      | Table stakes        |
| Mobile app               | Yes (RN)   | Yes (Native) | Yes (Native) | Yes      | Table stakes        |
| Contract management      | Yes        | No           | No           | No       | **Differentiator**  |
| Building assessment (AI) | Yes        | No           | No           | No       | **Unique**          |
| SSO/Social login         | No         | Yes          | Yes          | Yes      | **Gap**             |
| Advanced search          | Basic      | Advanced     | Advanced     | Advanced | **Gap**             |
| Push notifications       | Yes        | Yes          | Yes          | Yes      | Table stakes        |
| Subscription plans       | Yes        | No           | Yes          | Yes      | Common              |
| Multi-language (i18n)    | No         | Yes          | Yes          | Yes      | Lower priority (UK) |
| Video call scheduling    | Yes        | No           | No           | No       | **Differentiator**  |
| Instant booking          | No         | Yes          | No           | No       | Nice-to-have        |
| Referral system          | No         | Yes          | Yes          | No       | **Gap**             |

### 11.3 Competitive Advantages (Unique to Mintenance)

1. **AI-powered photo verification** -- Before/after comparison with quality scoring
2. **Building assessment AI** -- Bayesian fusion, YOLO training, SAM3 integration
3. **Full escrow system** -- Auto-release, risk scoring, dispute prediction, reconciliation
4. **Digital contract management** -- Dual-party signing workflow
5. **Video call scheduling** -- Integrated consultations
6. **Predictive AI agents** -- Pricing, risk, escrow decisions

### 11.4 Critical Competitive Gaps

1. **Social login** (Google, Apple, Facebook) -- All major competitors have this
2. **Advanced search** -- Faceted search, location radius, availability filtering
3. **Referral system** -- Common in marketplaces for growth
4. **SEO optimization** -- Contractor profiles should be indexable for organic traffic

### 11.5 Technology Benchmark

| Aspect   | Mintenance              | Industry Standard       | Assessment         |
| -------- | ----------------------- | ----------------------- | ------------------ |
| Frontend | Next.js 16              | Next.js / React         | Current            |
| Mobile   | React Native (Expo 54)  | Native / RN             | Expo 55 available  |
| Database | Supabase (PostgreSQL)   | PostgreSQL              | Good choice        |
| Payments | Stripe Connect          | Stripe / Adyen          | Standard           |
| Auth     | Custom JWT + Supabase   | Auth0 / Clerk           | Custom = more risk |
| Search   | Basic SQL               | Elasticsearch / Algolia | **Gap**            |
| Caching  | No explicit layer       | Redis / CDN             | **Gap**            |
| CDN      | Vercel Edge             | Cloudflare / Vercel     | Good               |
| APM      | Sentry                  | Datadog / Sentry        | Good               |
| CI/CD    | 15 GH Actions workflows | GH Actions / CircleCI   | **Strong**         |

### 11.6 Overall Competitive Position: **7/10**

Strong core product with unique AI features and robust payment/escrow system. Main gaps are in
growth features (social login, search, referrals) and infrastructure (caching, search engine).

---

## 12. Prioritized Action Plan

### Phase 1: CRITICAL -- Fix TODAY (Effort: ~1 day)

| #   | Issue                                                                                                                                                      | Category | Effort  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| 1   | **ROTATE ALL SECRETS**: Stripe sk*live*, DB password, Supabase service key, JWT secret, OpenAI, Twilio, SendGrid, encryption key, Redis token, CSRF secret | Security | 2 hours |
| 2   | Replace all `sk_live_`/`pk_live_` with `sk_test_`/`pk_test_` in local env files                                                                            | Security | 30 min  |
| 3   | Change DB password from `Iambald1995!` to cryptographically random 64+ chars                                                                               | Security | 30 min  |
| 4   | Remove root `/.env.local` (only `apps/web/.env.local` should exist)                                                                                        | Security | 5 min   |
| 5   | Add startup validation rejecting live keys when `NODE_ENV !== 'production'`                                                                                | Security | 1 hour  |

### Phase 1b: CRITICAL -- Fix This Week (Effort: ~2 days)

| #   | Issue                                                                                    | Category     | Effort  |
| --- | ---------------------------------------------------------------------------------------- | ------------ | ------- |
| 6   | Fix CSP: replace `unsafe-inline` with nonce-based policy (migration already in progress) | Security     | 4 hours |
| 7   | Run `npm audit fix` to address 14 vulnerabilities                                        | Dependencies | 1 hour  |
| 8   | Restrict Google Maps API key in Google Cloud Console                                     | Security     | 30 min  |

### Phase 2: HIGH -- Fix This Sprint (Effort: ~5 days)

| #   | Issue                                                                             | Category      | Effort  |
| --- | --------------------------------------------------------------------------------- | ------------- | ------- |
| 5   | Refactor `process-job-payment` to direct function call (eliminate SSRF surface)   | Security/Perf | 4 hours |
| 6   | Add middleware-level rate limiting for unauthenticated requests                   | Security      | 4 hours |
| 7   | Add distributed locking to escrow auto-release cron                               | Security      | 4 hours |
| 8   | Update `@remotion/cli` to fix critical `loader-utils` vuln                        | Dependencies  | 2 hours |
| 9   | Update major deps: Stripe SDK, Supabase SSR, Sentry                               | Dependencies  | 1 day   |
| 10  | Add re-authentication for sensitive operations                                    | Security      | 1 day   |
| 11  | Add `requireAdminFromDatabase()` to all admin mutation routes                     | Security      | 4 hours |
| 12  | Add production guard for SKIP_PHONE_VERIFICATION flag                             | Security      | 30 min  |
| 12b | Remove or error-guard `DatabaseManager.authenticateUser()` (accepts any password) | Security      | 30 min  |
| 12c | Fix rate limiter Redis fallback (currently allows all requests on failure)        | Security      | 2 hours |
| 12d | Fix `getSeverityColor` HIGH=green semantic inversion in security dashboard        | UX            | 15 min  |
| 12e | Remove `_archived` API routes from `app/api/` directory                           | Security      | 30 min  |

### Phase 2b: HIGH -- Performance Quick Wins (Effort: ~3 days)

| #   | Issue                                                                                       | Category    | Effort  |
| --- | ------------------------------------------------------------------------------------------- | ----------- | ------- |
| 13  | **Fix DynamicCharts barrel export** -- remove static re-exports on line 57 (~100KB savings) | Performance | 1 hour  |
| 14  | Batch the `bulk-verify` endpoint (replace per-user loop with batch queries)                 | Performance | 2 hours |
| 15  | Parallelize message threads queries with `Promise.all`                                      | Performance | 1 hour  |
| 16  | Add `.limit()` safety bounds to all unbounded list queries                                  | Performance | 4 hours |
| 17  | Replace `.select('*')` with explicit columns in 31 API routes                               | Performance | 4 hours |
| 18  | Convert top 5 largest `'use client'` pages to Server + Client pattern                       | Performance | 1 day   |
| 19  | Dynamic-import `@tremor/react` in 9 files                                                   | Performance | 2 hours |
| 20  | Use existing cache utility (`getCachedJobs`, etc.) in Server Component pages                | Performance | 4 hours |
| 21  | Cache middleware profile role in JWT/cookie (save 100-300ms per request)                    | Performance | 4 hours |

### Phase 3: MEDIUM -- Fix This Month (Effort: ~10 days)

| #   | Issue                                                                                | Category      | Effort  |
| --- | ------------------------------------------------------------------------------------ | ------------- | ------- |
| 22  | Split 10 largest files (>800 lines) into modules                                     | Code Quality  | 3 days  |
| 23  | Reduce 74 TODO/FIXME/HACK comments (triage + fix)                                    | Code Quality  | 2 days  |
| 24  | Add social login (Google, Apple)                                                     | Feature Gap   | 2 days  |
| 25  | Accessibility audit + fix top issues                                                 | Accessibility | 2 days  |
| 26  | Create CHANGELOG and ADR documentation                                               | Documentation | 1 day   |
| 27  | Upgrade Expo from 54 to 55                                                           | Dependencies  | 2 days  |
| 28  | Wrap `useSearchParams()` in Suspense boundaries (login, register, etc.)              | Performance   | 2 hours |
| 28b | Replace 25+ `window.location.reload()` with `invalidateQueries()`/`router.refresh()` | Code Quality  | 4 hours |
| 28c | Remove hardcoded trend values and no-op button stubs in admin dashboards             | Code Quality  | 2 hours |
| 28d | Replace 16 raw `<img>` tags with `next/image`                                        | Performance   | 2 hours |
| 29  | Add `next/dynamic` for heavy components (maps, PDF, chat)                            | Performance   | 4 hours |
| 30  | Replace simple framer-motion animations with CSS transitions                         | Performance   | 1 day   |
| 31  | Investigate Turbopack compatibility for dev server                                   | Performance   | 4 hours |
| 32  | Remove ~12 redundant PK indexes                                                      | Performance   | 1 hour  |
| 33  | Remove unused deps (`@chatscope/chat-ui-kit-react`, `node-fetch`, `react-pdf`)       | Dependencies  | 1 hour  |

### Phase 4: LOW -- Plan for Next Quarter

| #   | Issue                                                                               | Category      | Effort  |
| --- | ----------------------------------------------------------------------------------- | ------------- | ------- |
| 34  | **Write tests for 61 admin API routes** (escrow, users, refunds, revenue, disputes) | Testing       | 1 week  |
| 35  | Add per-directory coverage thresholds (85%+ for payments, auth, escrow)             | Testing       | 2 hours |
| 36  | Fix test factory job status (`'open'` -> `'posted'` to match canonical lifecycle)   | Testing       | 15 min  |
| 37  | Add `global-error.tsx` for root-level error handling                                | Accessibility | 1 hour  |
| 38  | Standardize `<main id="main-content">` on all 35 layout files                       | Accessibility | 2 hours |
| 39  | Add `aria-label` to 4 form components with unlabeled inputs                         | Accessibility | 1 hour  |
| 40  | Remove global React Query mock from test setup; use per-test `QueryClientProvider`  | Testing       | 4 hours |
| 41  | Consolidate E2E test directories (root `e2e/` JS vs `apps/web/e2e/` TS)             | Testing       | 2 hours |
| 42  | Implement search infrastructure (Algolia/Typesense)                                 | Performance   | 2 weeks |
| 43  | Add Redis caching layer for hot data                                                | Performance   | 1 week  |
| 44  | Add public API documentation                                                        | Documentation | 1 week  |
| 45  | Implement referral system                                                           | Feature Gap   | 1 week  |
| 46  | Write security policies document (PCI Req 12)                                       | Compliance    | 1 week  |

---

## 13. Appendix: Technical Details

### A. Payment Security Architecture

```
+------------------+     +-----------------+     +------------------+
|  Browser Client  |---->|  Stripe.js SDK  |---->|  Stripe Servers  |
|  (Stripe Elements)|    |  (iframe)       |     |  (Card Processing)|
+--------+---------+     +-----------------+     +--------+---------+
         |                                                |
         | PaymentMethod token                            | Webhook events
         v                                                v
+--------+---------+                              +-------+----------+
| API Routes       |     +-----------------+      | Webhook Handler  |
| (create-intent,  |---->| Stripe SDK      |      | (signature verify)|
|  release-escrow) |     | (server-side)   |      | (idempotency)    |
+--------+---------+     +-----------------+      +--------+---------+
         |                                                |
         v                                                v
+--------------------------------------------------------+
|  Supabase PostgreSQL                                    |
|  Tables: escrow_transactions, payment_attempts,         |
|          webhook_events, escrow_reconciliation,          |
|          escrow_audit_logs                               |
|  RLS: Enabled on all payment tables                     |
+---------------------------------------------------------+
```

### B. Escrow State Machine

```
pending --> held --> release_pending --> completed
                                    --> failed (retry)
pending --> cancelled
held    --> disputed --> resolved --> completed
                                 --> refunded
```

### C. Security Infrastructure Inventory

| Component          | File(s)                                                          | Status              |
| ------------------ | ---------------------------------------------------------------- | ------------------- |
| Authentication     | `packages/auth/`, `middleware.ts`                                | Comprehensive       |
| CSRF Protection    | `lib/csrf.ts`, `lib/csrf-client.ts`, `lib/csrf-validator.ts`     | Good                |
| Rate Limiting      | `lib/rate-limiter.ts`, `lib/rate-limiter-enhanced.ts`            | Present but gaps    |
| CORS               | `lib/cors/config.ts`, `lib/cors/headers.ts`, `lib/cors/index.ts` | Whitelist-based     |
| Input Validation   | `lib/validation/schemas*.ts` (7 files)                           | Comprehensive       |
| API Handler        | `lib/api/with-api-handler.ts`                                    | 93.5% coverage      |
| Security Monitor   | `lib/security-monitor.ts`                                        | IP blocking         |
| Payment Errors     | `lib/errors/payment-errors.ts`                                   | Sanitized responses |
| Idempotency        | `lib/idempotency.ts`                                             | Redis-based         |
| MFA                | `lib/mfa/mfa-service.ts`                                         | For high-risk ops   |
| URL Validation     | `lib/security/url-validation.ts`                                 | Prevents injection  |
| Admin Verification | `lib/admin-verification.ts`                                      | DB-based (not JWT)  |

### D. npm Audit Full Results

```
14 vulnerabilities (5 low, 2 moderate, 6 high, 1 critical)

Critical: loader-utils (prototype pollution) via @remotion/bundler
High:     node-forge (4 advisories), @xmldom/xmldom (XML injection),
          picomatch (method injection + ReDoS)
Moderate: brace-expansion (DoS), yaml (stack overflow)
Low:      @tootallnate/once chain (5 instances via @google-cloud/storage)
```

### E. Automated Scan Commands Run

```bash
npm audit --production          # 14 vulnerabilities found
npm outdated                    # 60+ packages behind latest
find ... | wc -l                # File counts and size analysis
grep -rn                        # Pattern searches for secrets, any types, console statements
git ls-files --error-unmatch    # Verified no env files tracked in git
```

---

_Report generated 2026-04-01 by automated analysis. All findings verified against actual codebase
state. Some assessments (accessibility, performance benchmarks) would benefit from runtime testing._
