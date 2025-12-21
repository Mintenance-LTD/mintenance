# SECURITY & TECHNICAL REMEDIATION PLAN
**Mintenance Platform - December 2025**

## EXECUTIVE SUMMARY

Following comprehensive codebase audit by 5 specialized agents, this plan addresses critical security vulnerabilities, performance issues, and technical debt across the Mintenance platform. Issues are prioritized by severity and business impact.

**Overall Platform Score: 7.5/10 → Target: 9.2/10**

---

## IMMEDIATE ACTIONS (24 HOURS) ⚠️ CRITICAL

### 1. Environment File Security - CRITICAL 🔴
**Severity**: CRITICAL | **Effort**: 2 hours | **Owner**: DevOps

**Problem**:
- `.env`, `.env.production`, `.env.server`, `.env.local`, `.env.secure`, `.env.staging` present in git
- Contains: `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`
- Currently modified and visible in `git status`

**Action Items**:
1. ✅ Add all `.env*` files to `.gitignore` immediately
2. ✅ Remove from git history: `git rm --cached .env*`
3. ✅ Rotate ALL exposed secrets:
   - Generate new JWT_SECRET (64+ char random string)
   - Regenerate Supabase service role key (from dashboard)
   - Create new Stripe restricted keys (from dashboard)
   - Rotate OpenAI API key
4. ✅ Update secrets in Vercel/deployment platform
5. ✅ Create `.env.example` template with dummy values
6. ✅ Document secret rotation in runbook

**Verification**:
```bash
# Confirm files removed from git
git ls-files | grep -E '\.env'  # Should return nothing

# Check .gitignore
grep -E '\.env' .gitignore  # Should show exclusions
```

**Cost**: £0 (time only)

---

### 2. Security Headers Implementation - HIGH 🔴
**Severity**: HIGH | **Effort**: 1 hour | **Owner**: Frontend

**Problem**:
- Missing `X-Frame-Options` (clickjacking vulnerability)
- Missing `X-Content-Type-Options` (MIME sniffing attacks)
- Missing `X-XSS-Protection` (legacy browser protection)
- CSP allows `'unsafe-inline'` (XSS risk)

**Action Items**:
1. Update `apps/web/middleware.ts` (lines 199-214):
```typescript
headers.set('X-Frame-Options', 'DENY');
headers.set('X-Content-Type-Options', 'nosniff');
headers.set('X-XSS-Protection', '1; mode=block');
headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

// Strengthen CSP - remove 'unsafe-inline' after auditing inline scripts
headers.set('Content-Security-Policy', `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://api.stripe.com;
  frame-src https://js.stripe.com;
`.replace(/\s+/g, ' ').trim());
```

2. Test on staging before production deployment
3. Monitor for CSP violations in browser console

**Verification**:
```bash
curl -I https://staging.mintenance.com | grep -E 'X-Frame-Options|X-Content-Type|CSP'
```

**Cost**: £0 (time only)

---

### 3. Redis Rate Limiting Migration - HIGH 🔴
**Severity**: HIGH | **Effort**: 3 hours | **Owner**: Backend

**Problem**:
- `apps/web/lib/middleware/public-rate-limiter.ts:16` uses `Map<string, RateLimitRecord>()`
- In-memory store resets on deployment
- Ineffective in multi-instance production (Vercel serverless)

**Action Items**:
1. Provision Redis instance:
   - **Option A**: Upstash Redis (serverless, £0-£10/mo for startup tier)
   - **Option B**: Redis Cloud (£5/mo essentials tier)
   - **Recommended**: Upstash (better Vercel integration)

2. Install dependencies:
```bash
npm install @upstash/redis ioredis
```

3. Update rate limiter implementation:
```typescript
// apps/web/lib/middleware/redis-rate-limiter.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function checkRateLimit(
  identifier: string,
  limit: number,
  window: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - window;

  // Use Redis sorted set for sliding window
  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);

  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await redis.zadd(key, { score: now, member: `${now}` });
  await redis.expire(key, Math.ceil(window / 1000));

  return { allowed: true, remaining: limit - count - 1 };
}
```

4. Replace all `Map()` rate limiters with Redis implementation
5. Add monitoring for rate limit hits

**Verification**:
- Deploy to staging
- Trigger rate limits with API bombardment
- Redeploy → verify limits persist
- Check Redis dashboard for key counts

**Cost**: £10/month (Upstash serverless tier)

---

## SHORT-TERM ACTIONS (1 WEEK) 🟡

### 4. File Upload Security Hardening - MEDIUM 🟡
**Severity**: MEDIUM | **Effort**: 4 hours | **Owner**: Backend

**Problem**:
- File upload validation insufficient
- No virus scanning
- No content-type verification beyond extensions
- Missing size limits on some endpoints

**Action Items**:
1. Implement ClamAV scanning for uploads:
```typescript
// apps/web/lib/security/file-scanner.ts
import ClamScan from 'clamscan';

const clamscan = await new ClamScan().init({
  clamdscan: { host: process.env.CLAMAV_HOST, port: 3310 }
});

export async function scanFile(filePath: string): Promise<boolean> {
  const { isInfected } = await clamscan.scanFile(filePath);
  return !isInfected;
}
```

2. Add magic number validation:
```typescript
import fileType from 'file-type';

export async function validateFileType(
  buffer: Buffer,
  allowedTypes: string[]
): Promise<boolean> {
  const type = await fileType.fromBuffer(buffer);
  return type && allowedTypes.includes(type.mime);
}
```

3. Enforce strict size limits:
   - Images: 10MB max
   - Videos: 100MB max
   - Documents: 5MB max

4. Update Supabase Storage policies to match

**Cost**: £15/month (ClamAV hosting on Railway/Render)

---

### 5. API Response Caching - MEDIUM 🟡
**Severity**: MEDIUM (Performance) | **Effort**: 6 hours | **Owner**: Backend

**Problem**:
- No response caching on expensive queries
- Database queries hit on every request
- Public endpoints serve same data repeatedly

**Action Items**:
1. Implement Redis cache layer:
```typescript
// apps/web/lib/cache/api-cache.ts
import { redis } from './redis-client';

export async function getCached<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

2. Add caching to high-traffic endpoints:
   - `/api/public/contractors` (5min TTL)
   - `/api/jobs/[id]` (1min TTL)
   - `/api/assessments/[id]` (30s TTL)

3. Implement cache invalidation on mutations:
```typescript
// After job update
await redis.del(`job:${jobId}`);
await redis.del('jobs:list:*'); // Pattern delete
```

4. Add cache hit/miss metrics to monitoring

**Cost**: £0 (uses existing Redis from Action #3)

---

### 6. Integration Test Suite - HIGH 🟡
**Severity**: HIGH (Quality) | **Effort**: 16 hours | **Owner**: QA

**Problem**:
- 344 test files configured, minimal implementations
- No E2E tests in CI
- Critical user flows untested

**Action Items**:
1. Set up Playwright E2E tests:
```bash
cd apps/web
npx playwright install
```

2. Write critical path tests (minimum 20 tests):
   - User registration flow
   - Contractor onboarding
   - Job creation → contractor match → acceptance
   - Assessment upload → MintAI analysis → report generation
   - Payment flow (Stripe test mode)
   - Mobile app authentication

3. Add to CI pipeline:
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-screenshots
          path: test-results/
```

4. Achieve 70% coverage target on critical services

**Cost**: £0 (time only, Playwright free)

---

## MEDIUM-TERM ACTIONS (1 MONTH) 🟢

### 7. Client Component Optimization - MEDIUM 🟢
**Severity**: MEDIUM (Performance) | **Effort**: 12 hours | **Owner**: Frontend

**Problem**:
- 513 client components in Next.js app
- Excessive 'use client' directives
- Impacts Time to Interactive (TTI)

**Action Items**:
1. Audit all components with 'use client':
```bash
grep -r "use client" apps/web/app apps/web/components | wc -l
```

2. Convert stateless components to server components:
   - Remove 'use client' from non-interactive components
   - Move state to parent components
   - Use React Server Components for data fetching

3. Target reduction: 513 → 200 client components

4. Implement code splitting:
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

**Verification**:
- Run Lighthouse audit
- Measure TTI improvement (target: <3.5s)

**Cost**: £0 (time only)

---

### 8. API Standardization - MEDIUM 🟢
**Severity**: MEDIUM (DX) | **Effort**: 20 hours | **Owner**: Backend

**Problem**:
- 251 API routes with inconsistent response formats
- Mixed error handling patterns
- No API versioning strategy

**Action Items**:
1. Create standard response wrapper:
```typescript
// apps/web/lib/api/response.ts
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    total?: number;
    timestamp: string;
  };
}

export function apiSuccess<T>(data: T, meta?: APIResponse<T>['meta']) {
  return NextResponse.json({ success: true, data, meta }, { status: 200 });
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message, details: null } },
    { status }
  );
}
```

2. Migrate all routes to standard format (prioritize public APIs first)

3. Implement API versioning:
   - Create `/api/v1/` directory
   - Route `/api/v2/` for breaking changes
   - Maintain v1 for 6 months after v2 release

4. Generate OpenAPI/Swagger documentation

**Cost**: £0 (time only)

---

### 9. Mobile Performance Optimization - MEDIUM 🟢
**Severity**: MEDIUM (UX) | **Effort**: 16 hours | **Owner**: Mobile

**Problem**:
- 180+ service files loaded eagerly
- No lazy loading
- Slow app startup time

**Action Items**:
1. Implement lazy loading for screens:
```typescript
// apps/mobile/App.tsx
import React, { lazy, Suspense } from 'react';

const DashboardScreen = lazy(() => import('./src/screens/DashboardScreen'));
const AssessmentScreen = lazy(() => import('./src/screens/AssessmentScreen'));

function App() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Stack.Navigator>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Assessment" component={AssessmentScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
```

2. Code splitting by feature:
   - Split AI services into separate bundle
   - Split payment flows
   - Split admin features

3. Optimize images with react-native-fast-image:
```bash
npm install react-native-fast-image
```

4. Measure startup time improvement (target: <2.5s)

**Cost**: £0 (time only)

---

### 10. Shared Component Library - LOW 🟢
**Severity**: LOW (DX) | **Effort**: 24 hours | **Owner**: Frontend

**Problem**:
- Code duplication between web and mobile
- No unified design system
- Inconsistent UI patterns

**Action Items**:
1. Create `packages/ui` with shared components:
```bash
mkdir -p packages/ui/src
cd packages/ui
npm init -y
```

2. Extract common components:
   - Button (web + mobile variants)
   - Card
   - Input/TextInput
   - Badge
   - LoadingSpinner
   - Typography

3. Set up React Native Web for component sharing:
```typescript
// packages/ui/src/Button.tsx
import { Pressable, Text } from 'react-native';

export function Button({ children, onPress }: ButtonProps) {
  return (
    <Pressable onPress={onPress}>
      <Text>{children}</Text>
    </Pressable>
  );
}
```

4. Configure Tailwind for both platforms (NativeWind)

**Cost**: £0 (time only)

---

## LONG-TERM ACTIONS (3 MONTHS) 🔵

### 11. Missing Feature Completion - MEDIUM 🔵
**Severity**: MEDIUM (Product) | **Effort**: 80 hours | **Owner**: Full Stack

**Problem**:
- 5% feature gap between web and mobile
- Incomplete contractor verification flow
- Missing admin analytics dashboard

**Action Items**:
1. **Contractor Verification** (web + mobile):
   - Implement document upload (Insurance certificates, Gas Safe, etc.)
   - OCR extraction of certificate details
   - Admin approval workflow
   - Expiry tracking and renewal reminders

2. **Admin Analytics Dashboard** (web only):
   - Revenue metrics (MRR, ARR, churn)
   - User acquisition funnels
   - Job completion rates
   - AI accuracy trending
   - Cost per assessment tracking

3. **Mobile-Specific**:
   - Offline job data caching
   - Background job sync
   - Push notification settings screen

4. **Web-Specific**:
   - Bulk contractor import (CSV)
   - Advanced search filters
   - Export reports (PDF/Excel)

**Cost**: £0 (time only)

---

### 12. External Security Audit - HIGH 🔵
**Severity**: HIGH (Compliance) | **Effort**: N/A | **Owner**: CTO + External

**Problem**:
- No third-party security assessment
- Required for enterprise clients
- Needed for SOC 2 compliance (future)

**Action Items**:
1. Select audit provider:
   - **Option A**: Cure53 (€15K-€25K, 2 weeks, elite reputation)
   - **Option B**: Bishop Fox (£20K-£30K, comprehensive)
   - **Option C**: UK-based boutique (£8K-£12K, startup-friendly)
   - **Recommended**: UK boutique for seed stage

2. Scope:
   - Web application penetration testing
   - API security assessment
   - Mobile app security review
   - Infrastructure audit (Supabase, Vercel)
   - AI endpoint security (MintAI API)

3. Remediation timeline: 2 weeks post-report

4. Annual re-audit commitment

**Cost**: £10,000 (one-time, seed funding allocation)

---

### 13. Performance Monitoring Implementation - MEDIUM 🔵
**Severity**: MEDIUM (Operations) | **Effort**: 12 hours | **Owner**: DevOps

**Problem**:
- No real-time performance monitoring
- No alerting on degradation
- No user experience metrics

**Action Items**:
1. Implement Sentry for error tracking:
```bash
npm install @sentry/nextjs @sentry/react-native
```

2. Configure performance monitoring:
```typescript
// apps/web/sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['mintenance.com', /^\//],
    }),
  ],
  beforeSend(event) {
    // Strip PII
    delete event.user?.email;
    return event;
  },
});
```

3. Set up alerts:
   - Error rate >1% for 5 minutes
   - API response time p95 >800ms
   - Frontend LCP >2.5s
   - Mobile crash rate >0.1%

4. Create on-call rotation for critical alerts

**Cost**: £26/month (Sentry team plan, 50K events)

---

### 14. Database Query Optimization - MEDIUM 🔵
**Severity**: MEDIUM (Performance) | **Effort**: 16 hours | **Owner**: Database

**Problem**:
- N+1 query patterns identified
- Missing indexes on foreign keys
- Inefficient joins in complex queries

**Action Items**:
1. Audit slow queries using Supabase dashboard:
   - Enable pg_stat_statements
   - Identify queries >100ms
   - Review EXPLAIN ANALYZE output

2. Add missing indexes:
```sql
-- Example: Foreign key indexes
CREATE INDEX CONCURRENTLY idx_jobs_contractor_id ON jobs(contractor_id);
CREATE INDEX CONCURRENTLY idx_assessments_job_id ON assessments(job_id);
CREATE INDEX CONCURRENTLY idx_payments_job_id ON payments(job_id);
```

3. Optimize N+1 patterns with batching:
```typescript
// Before: N+1
const jobs = await getJobs();
for (const job of jobs) {
  job.contractor = await getContractor(job.contractor_id); // N queries
}

// After: Batched
const jobs = await supabase
  .from('jobs')
  .select('*, contractor:contractors(*)') // 1 query with join
  .eq('status', 'active');
```

4. Implement query result caching (see Action #5)

**Cost**: £0 (time only, uses existing Supabase plan)

---

### 15. CSP Inline Script Removal - LOW 🔵
**Severity**: LOW (Security) | **Effort**: 8 hours | **Owner**: Frontend

**Problem**:
- CSP currently allows 'unsafe-inline' for scripts
- Weakens XSS protection

**Action Items**:
1. Audit all inline scripts:
```bash
grep -r "onClick=" apps/web/app apps/web/components
grep -r "<script>" apps/web/app apps/web/components
```

2. Move inline handlers to event listeners:
```typescript
// Before
<button onClick={() => handleClick()}>Click</button>

// After
<button id="myButton">Click</button>
<script nonce={nonce}>
  document.getElementById('myButton').addEventListener('click', handleClick);
</script>
```

3. Implement CSP nonce:
```typescript
// middleware.ts
const nonce = crypto.randomUUID();
headers.set('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}'`);
headers.set('x-nonce', nonce);
```

4. Remove 'unsafe-inline' from CSP

**Cost**: £0 (time only)

---

## SUMMARY OF COSTS

| Action | Timeline | Cost |
|--------|----------|------|
| Environment file security | 24 hours | £0 |
| Security headers | 24 hours | £0 |
| Redis rate limiting | 24 hours | £10/mo |
| File upload security | 1 week | £15/mo |
| API response caching | 1 week | £0 |
| Integration test suite | 1 week | £0 |
| Client component optimization | 1 month | £0 |
| API standardization | 1 month | £0 |
| Mobile performance | 1 month | £0 |
| Shared component library | 1 month | £0 |
| Missing features | 3 months | £0 |
| External security audit | 3 months | £10,000 |
| Performance monitoring | 3 months | £26/mo |
| Database optimization | 3 months | £0 |
| CSP inline removal | 3 months | £0 |

**Total One-Time Cost**: £10,000 (security audit)
**Total Monthly Cost**: £51/month (Redis + ClamAV + Sentry)
**Total Annual Cost**: £10,612

---

## SUCCESS METRICS

**Platform Score Improvement**:
- Current: 7.5/10
- After Immediate Actions: 8.2/10
- After Short-Term: 8.7/10
- After Medium-Term: 9.0/10
- After Long-Term: 9.2/10

**Security Metrics**:
- Critical vulnerabilities: 3 → 0
- High vulnerabilities: 4 → 0
- Medium vulnerabilities: 3 → 1
- Security score: 6.5/10 → 9.5/10

**Performance Metrics**:
- API p95 latency: <500ms (target)
- Web LCP: <2.5s (target)
- Mobile startup: <2.5s (target)
- Client components: 513 → 200

**Quality Metrics**:
- Test coverage: <20% → 70%
- E2E tests: 0 → 20+
- API documentation: 0% → 100%

---

## IMPLEMENTATION PRIORITY

**Week 1 (IMMEDIATE)**:
1. Environment files ← START HERE 🔴
2. Security headers
3. Redis rate limiting

**Week 2-3 (SHORT-TERM)**:
4. File upload security
5. API caching
6. Integration tests

**Month 2 (MEDIUM-TERM)**:
7. Client components
8. API standardization
9. Mobile performance

**Months 3-5 (LONG-TERM)**:
10. Shared components
11. Missing features
12. External audit
13. Monitoring
14. Database optimization
15. CSP hardening

---

## STAKEHOLDER SIGN-OFF

| Role | Name | Approval | Date |
|------|------|----------|------|
| CTO | [Name] | ☐ | __/__/____ |
| DevOps Lead | [Name] | ☐ | __/__/____ |
| Security Lead | [Name] | ☐ | __/__/____ |
| Product Manager | [Name] | ☐ | __/__/____ |

---

## APPENDIX: REFERENCES

- Security Audit Report: [Link to agent findings]
- Database Audit: [Link to database-architect report]
- Architecture Review: [Link to codebase-context-analyzer report]
- API Audit: [Link to api-architect report]
- Frontend Audit: [Link to frontend-specialist report]

**Document Version**: 1.0
**Last Updated**: 20 December 2025
**Next Review**: Post-implementation (Q1 2026)
