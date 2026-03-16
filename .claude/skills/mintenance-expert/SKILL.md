---
name: mintenance-expert
description: >
  Full-stack expert for the Mintenance property maintenance platform. Deeply understands the complete
  architecture: Next.js web app, React Native mobile app, Supabase/PostgreSQL backend, Stripe payments,
  escrow system, job lifecycle, and monorepo structure. Use this skill for ANY Mintenance development task
  including bug fixes, new features, API changes, database migrations, mobile development, payment flows,
  contractor/homeowner features, testing, deployment, or architectural questions. Trigger proactively
  whenever the user works on Mintenance code, mentions jobs, bids, contracts, escrow, photos, contractors,
  homeowners, or any platform-specific concept. Also trigger for Supabase RLS policies, withApiHandler,
  Stripe webhook handling, offline sync, push notifications, or shared package changes.
---

# Mintenance Platform Expert

You are a full-stack expert for **Mintenance**, a multi-tenant property maintenance platform connecting homeowners with contractors. This skill gives you deep knowledge of the platform's architecture, patterns, and business rules so you can make changes confidently and correctly.

## Quick Orientation

| Layer | Technology | Location |
|-------|-----------|----------|
| Web frontend | Next.js (App Router), React, TypeScript strict | `apps/web/` |
| Mobile frontend | React Native, Expo | `apps/mobile/` |
| Backend/API | Next.js API routes, `withApiHandler()` | `apps/web/app/api/` |
| Database | Supabase PostgreSQL, 334 tables, 806 RLS policies | `supabase/migrations/` |
| Payments | Stripe (PaymentIntent, Connect, webhooks) | `apps/web/lib/services/payment/` |
| Shared code | TypeScript packages | `packages/` (types, shared, shared-ui, auth, security, ai-core, design-tokens, api-client) |
| Deployment | Vercel (web), EAS (mobile) | `.github/workflows/`, `vercel.json` |
| Testing | Vitest (web), Jest (mobile), Playwright (E2E) | `apps/web/__tests__/`, `apps/mobile/src/__tests__/` |

Three user roles: **homeowner**, **contractor**, **admin**.

## Before Making ANY Change

Read `references/architecture.md` for the monorepo structure and import conventions.

For the specific domain you're working in, also read the relevant reference:
- **API routes or backend logic** -> `references/api-patterns.md`
- **Database changes, migrations, RLS** -> `references/database.md`
- **Job workflow, bids, contracts, escrow, photos** -> `references/job-lifecycle.md`
- **Writing or fixing tests** -> `references/testing.md`
- **Mobile app changes** -> `references/mobile.md`
- **Stripe/payment changes** -> `references/payments.md`
- **Web pages, routes, components** -> `references/web-components.md`
- **Shared packages (types, security, auth, UI)** -> `references/shared-packages.md`

## Core Business Flow (Summary)

```
Homeowner posts job -> Contractors bid -> Homeowner accepts bid
-> Contract created & signed -> Payment into escrow
-> Contractor uploads before photos -> Job starts
-> Contractor uploads after photos -> Job auto-completes
-> Homeowner reviews (approve or request changes)
-> Escrow released to contractor (with platform fee deducted)
```

**Status transitions:**
- Job: `posted` -> `assigned` -> `in_progress` -> `completed`
- Bid: `pending` -> `accepted` / `rejected`
- Contract: `draft` -> `pending_contractor` / `pending_homeowner` -> `accepted`
- Escrow: `pending` -> `held` -> `release_pending` -> `released`

**Enforcement gates** (the API enforces these, never bypass them):
- Before photos required to start a job
- After photos auto-trigger job completion (no manual "complete" button)
- Contract must be signed by both parties before payment
- Escrow must be funded before job can start
- 7-day auto-release safety net if homeowner doesn't respond

## Critical Conventions

### 1. Supabase Client (NEVER use raw createClient)
```typescript
// Correct - canonical import for server-side:
import { serverSupabase } from '@/lib/api/supabaseServer';

// For user-scoped queries respecting RLS:
import { createUserScopedClient } from '@/lib/api/supabaseServer';
const userClient = createUserScopedClient(userJwt);
```
Direct `createClient` from `@supabase/supabase-js` is banned. The canonical client uses lazy initialization via Proxy to avoid stale env vars on cold starts.

### 2. API Route Pattern (withApiHandler)
Every API route (except cron jobs and Stripe webhooks) uses `withApiHandler`:
```typescript
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10, windowMs: 60000 } },
  async (request, { user, params }) => {
    // user is guaranteed authenticated
    // params are already resolved (no await needed)
    return NextResponse.json({ data });
  }
);
```
Config options: `auth` (default true), `csrf` (auto for mutations), `roles`, `rateLimit` (default 30/min).

### 3. Cron Jobs (withCronHandler)
```typescript
import { withCronHandler } from '@/lib/cron-handler';

export const GET = withCronHandler('my-cron-job', async () => {
  const result = await MyService.process();
  return { processed: result.count };
});
```
Located in `apps/web/app/api/cron/`. Uses cron secret auth, execution logging to `cron_job_runs` table.

### 4. Error Handling
Use typed errors from `@/lib/errors/`:
- `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `RateLimitError` (429)
- `withApiHandler` catches these automatically and returns proper HTTP responses.

### 5. Validation
Use Zod schemas for all request validation:
```typescript
import { z } from 'zod';
const schema = z.object({ title: z.string().min(1).max(200) });
const parsed = schema.safeParse(body);
if (!parsed.success) throw new BadRequestError('Validation failed', parsed.error.issues);
```

### 6. Security (packages/security)
Use the `sanitize` object for all user input:
```typescript
import { sanitize } from '@mintenance/security';
const cleanTitle = sanitize.text(rawTitle);
const cleanEmail = sanitize.email(rawEmail);
const cleanDescription = sanitize.jobDescription(rawDescription);
```
Platform-aware: auto-detects web/server/mobile and uses appropriate sanitizer.

### 7. Shared Types
Import from `@mintenance/types` for cross-platform type safety:
```typescript
import type { Job, Bid, Review, ContractorProfile } from '@mintenance/types';
```

### 8. Testing (Vitest + mockReset: true)
The test config uses `mockReset: true`, which clears ALL mock implementations between tests. Use `vi.hoisted()` for stable mocks:
```typescript
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  supabaseFrom: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
}));
```
See `references/testing.md` for full patterns.

## Code Quality Standards

| Rule | Limit |
|------|-------|
| File size | 300 lines max |
| Function size | 50 lines max |
| `any` types | 0 in new code |
| `console.*` | 0 in app code (use logger) |
| Tests | Must pass before committing |
| Supabase imports | Only canonical `@/lib/api/supabaseServer` |
| API routes | Must use `withApiHandler()` |

## Key File Locations

| Purpose | Path |
|---------|------|
| API handler wrapper | `apps/web/lib/api/with-api-handler.ts` |
| Cron handler | `apps/web/lib/cron-handler.ts` |
| Supabase server client | `apps/web/lib/api/supabaseServer.ts` |
| Stripe client | `apps/web/lib/stripe.ts` |
| Middleware (auth, CSRF) | `apps/web/middleware.ts` |
| Payment services | `apps/web/lib/services/payment/` |
| Escrow services | `apps/web/lib/services/escrow/` |
| Photo verification | `apps/web/lib/services/escrow/PhotoVerificationService.ts` |
| Stripe webhooks | `apps/web/app/api/webhooks/stripe/` |
| Job API routes | `apps/web/app/api/jobs/` |
| Test setup | `apps/web/test/setup.ts` |
| Vitest config | `apps/web/vitest.config.ts` |
| Mobile offline sync | `apps/mobile/src/services/OfflineManager.ts` |
| Push notifications | `apps/mobile/src/services/PushNotificationService.ts` |
| Shared types | `packages/types/src/` |
| Security/sanitization | `packages/security/src/` |
| Next.js config | `apps/web/next.config.js` |
