# Real-DB Integration Testing Guide

This guide covers **integration tests that hit a real Postgres database** via a
local Supabase instance. These tests verify actual behavior — RLS policies,
constraints, triggers, real auth — not mock chains.

## Why This Exists

Most existing tests in the repo use `vi.hoisted()` + `vi.mock()` to stub every
external dependency. They assert that **mocks were called with expected args**,
not that the underlying code works. That approach is fast and isolated, but it
gives false confidence — Stripe could change its API tomorrow and every mocked
test would still pass.

Real-DB integration tests complement unit tests by verifying:
- RLS policies actually restrict access
- Database constraints (unique, FK, check) fire as expected
- Triggers and functions behave correctly
- The actual auth flow works

## Prerequisites

1. **Supabase CLI** — https://supabase.com/docs/guides/cli/getting-started
2. **Docker** (Supabase CLI uses Docker under the hood)

## Running Integration Tests

```bash
# 1. Start local Supabase (one-time per dev session)
supabase start

# 2. Apply migrations to the local DB
supabase db reset

# 3. Run integration tests
cd apps/web
npm run test:integration
```

If Supabase isn't running, all integration tests are **skipped** — they don't
fail. This keeps CI green in environments that haven't provisioned Supabase.

## Writing a New Integration Test

Put new tests under `apps/web/__tests__/integration-real/` with the suffix
`.integration.test.ts`.

### Template

```ts
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  requireLocalSupabase,
  createAuthenticatedClient,
  createServiceClient,
} from '../../test/integration/supabase-test-client';
import {
  createTestUser,
  createTestJob,
  type TestUser,
  type TestJob,
} from '../../test/integration/fixtures';

let supabaseAvailable = false;
try {
  await requireLocalSupabase();
  supabaseAvailable = true;
} catch {
  // Skip silently
}

describe.skipIf(!supabaseAvailable)('my feature (real DB)', () => {
  let user: TestUser;
  let job: TestJob;

  beforeAll(async () => {
    user = await createTestUser({ role: 'homeowner' });
    job = await createTestJob({ homeowner_id: user.id });
  }, 30_000);

  afterAll(async () => {
    await job?.cleanup();
    await user?.cleanup();
  });

  it('does the thing', async () => {
    const client = await createAuthenticatedClient(user.email, user.password);
    const { data, error } = await client
      .from('jobs')
      .select('*')
      .eq('id', job.id)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(job.id);
  });
});
```

### Rules

1. **Always use the `describe.skipIf(!supabaseAvailable)` guard.** Never hard-fail
   when Supabase isn't running.
2. **Every fixture returns a `cleanup()` function.** Call it in `afterAll` or
   `afterEach`. Leaked rows pollute future test runs.
3. **Use the service-role client ONLY for setup/teardown.** Never use it to
   simulate user actions — it bypasses RLS and gives false positives.
4. **Prefix test data with `itest_`.** Makes orphaned rows easy to identify.
5. **Keep tests independent.** Don't rely on execution order.

## Existing Real-DB Tests (55 tests across 6 files)

| File | Tests | Verifies |
|---|---|---|
| [jobs-rls.integration.test.ts](../apps/web/__tests__/integration-real/jobs-rls.integration.test.ts) | 6 | RLS SELECT/UPDATE on jobs across homeowner/contractor/anon roles |
| [escrow-rls.integration.test.ts](../apps/web/__tests__/integration-real/escrow-rls.integration.test.ts) | 7 | RLS on escrow_accounts — payer/payee/third-party/anon access boundaries |
| [escrow-lifecycle.integration.test.ts](../apps/web/__tests__/integration-real/escrow-lifecycle.integration.test.ts) | 10 | Escrow state machine (held→releasing→released→refunded), FK cascades, JSONB |
| [payment-flow.integration.test.ts](../apps/web/__tests__/integration-real/payment-flow.integration.test.ts) | 16 | Payment RLS, state machine transitions, FK integrity, admin policy |
| [bid-acceptance.integration.test.ts](../apps/web/__tests__/integration-real/bid-acceptance.integration.test.ts) | 9 | Partial unique index (one accepted bid per job), UNIQUE(job_id, contractor_id), FK cascades |
| [auth-signup.integration.test.ts](../apps/web/__tests__/integration-real/auth-signup.integration.test.ts) | 7 | handle_new_user trigger fires, role defaults to homeowner, FK CASCADE on delete |

## Priority List (What to Convert Next)

High-value targets that remain mock-based:

| Area | Current Path | Why It Matters |
|---|---|---|
| Job creation API | `apps/web/app/api/jobs/__tests__/route.test.ts` | End-to-end: body → validation → DB insert → response |
| Contract signing | search: `contract.*sign.*test` | Double-sign lock transition logic |
| Photo upload + start gate | search: `photos/before.*test` | "before photos exist" enforcement blocks job start |
| Messaging RLS | none | Message threads are only visible to participants |

## Infrastructure Reference

| File | Purpose |
|---|---|
| [apps/web/test/integration/supabase-test-client.ts](../apps/web/test/integration/supabase-test-client.ts) | Factory functions for anon/service/authenticated clients |
| [apps/web/test/integration/fixtures.ts](../apps/web/test/integration/fixtures.ts) | `createTestUser`, `createTestJob`, `wipeTestData` |

## CI Integration (Future)

Real-DB tests don't yet run in CI. To add them:
1. Provision a Supabase Postgres branch per PR (or use a dedicated test project)
2. Add a new GitHub Actions job that runs `supabase db reset` then
   `npm run test:integration`
3. Add the job to `pr-quality-gate` `needs:` array in `.github/workflows/ci-cd.yml`

Tracked in: *(add issue when this work begins)*
