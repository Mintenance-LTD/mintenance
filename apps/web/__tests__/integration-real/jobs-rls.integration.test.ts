// @vitest-environment node
/**
 * REAL DATABASE integration test — verifies RLS policies on the `jobs` table.
 *
 * Unlike the mock-based tests in apps/web/__tests__/api/integration/, this test
 * connects to a running local Supabase instance and asserts actual database
 * behavior. This is the REFERENCE PATTERN for all future real-DB tests.
 *
 * Pattern:
 *   1. Skip the whole suite if local Supabase isn't running (no CI breakage)
 *   2. Create test users via service-role client (bypasses RLS)
 *   3. Act as each user with an authenticated anon client (subject to RLS)
 *   4. Assert what the user CAN and CANNOT see/do
 *   5. Clean up in afterAll() — every fixture returns a cleanup function
 *
 * Run locally with:
 *   supabase start              # if not already running
 *   npm run test:integration    # from apps/web
 *
 * See docs/TESTING_INTEGRATION.md for the full guide.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  createAnonClient,
  createAuthenticatedClient,
  isLocalSupabaseAvailable,
} from '../../test/integration/supabase-test-client';
import {
  createTestUser,
  createTestJob,
  type TestUser,
  type TestJob,
} from '../../test/integration/fixtures';

// Integration tests are opt-in via INTEGRATION_TESTS=1 env var (set by
// `npm run test:integration`). This prevents CI false-failures in environments
// that don't provision Supabase, while guaranteeing they DO run when opted in.
describe('jobs table RLS (real DB)', () => {
  let homeownerA: TestUser;
  let homeownerB: TestUser;
  let contractor: TestUser;
  let jobA: TestJob;
  let homeownerAClient: SupabaseClient;
  let homeownerBClient: SupabaseClient;
  let contractorClient: SupabaseClient;

  beforeAll(async () => {
    // Assert Supabase is actually reachable — fail fast with a clear message
    // rather than letting every test produce a cryptic connection error.
    const available = await isLocalSupabaseAvailable();
    if (!available) {
      throw new Error(
        'INTEGRATION_TESTS=1 was set but Supabase is not reachable at ' +
          'http://localhost:54321. Run `supabase start` first.',
      );
    }
    homeownerA = await createTestUser({ role: 'homeowner' });
    homeownerB = await createTestUser({ role: 'homeowner' });
    contractor = await createTestUser({ role: 'contractor' });

    jobA = await createTestJob({
      homeowner_id: homeownerA.id,
      title: 'itest_jobA_owned_by_homeownerA',
    });

    homeownerAClient = await createAuthenticatedClient(
      homeownerA.email,
      homeownerA.password,
    );
    homeownerBClient = await createAuthenticatedClient(
      homeownerB.email,
      homeownerB.password,
    );
    contractorClient = await createAuthenticatedClient(
      contractor.email,
      contractor.password,
    );
  }, 30_000);

  afterAll(async () => {
    await jobA?.cleanup();
    await homeownerA?.cleanup();
    await homeownerB?.cleanup();
    await contractor?.cleanup();
  });

  it('homeowner can read their own job', async () => {
    const { data, error } = await homeownerAClient
      .from('jobs')
      .select('id, title, homeowner_id')
      .eq('id', jobA.id)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(jobA.id);
    expect(data?.homeowner_id).toBe(homeownerA.id);
  });

  it('different homeowner CANNOT read another homeowner private job', async () => {
    // Posted jobs may be visible to all (marketplace); use a draft/private
    // status to assert the strict isolation case. Adjust status if the
    // schema uses a different visibility model.
    const admin = createServiceClient();
    await admin
      .from('jobs')
      .update({ status: 'draft' })
      .eq('id', jobA.id);

    const { data, error } = await homeownerBClient
      .from('jobs')
      .select('id')
      .eq('id', jobA.id)
      .maybeSingle();

    // RLS should hide draft jobs from non-owner homeowners.
    // Result should be either null data OR a policy error — both indicate
    // the row is not accessible to homeowner B.
    expect(error === null ? data : null).toBeNull();

    // Restore for other tests
    await admin
      .from('jobs')
      .update({ status: 'posted' })
      .eq('id', jobA.id);
  });

  it('contractor can read posted jobs (marketplace visibility)', async () => {
    const { data, error } = await contractorClient
      .from('jobs')
      .select('id, title')
      .eq('id', jobA.id)
      .maybeSingle();

    // Posted jobs should be visible to contractors for bidding
    expect(error).toBeNull();
    expect(data?.id).toBe(jobA.id);
  });

  it('anonymous client CANNOT read any job', async () => {
    // RLS policy requires TO authenticated — anon role should see nothing.
    const anonClient = createAnonClient();

    const { data } = await anonClient
      .from('jobs')
      .select('id')
      .eq('id', jobA.id)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it('homeowner can update their own job', async () => {
    const newTitle = 'itest_jobA_updated_title';
    const { error } = await homeownerAClient
      .from('jobs')
      .update({ title: newTitle })
      .eq('id', jobA.id);

    expect(error).toBeNull();

    const admin = createServiceClient();
    const { data } = await admin
      .from('jobs')
      .select('title')
      .eq('id', jobA.id)
      .single();
    expect(data?.title).toBe(newTitle);
  });

  it('different homeowner CANNOT update another homeowner job', async () => {
    const { error, count } = await homeownerBClient
      .from('jobs')
      .update({ title: 'hacked' })
      .eq('id', jobA.id)
      .select('id', { count: 'exact', head: true });

    // RLS makes the UPDATE affect zero rows (no error, but count===0)
    // OR returns a policy error. Either outcome means the hack failed.
    const hackSucceeded = error === null && count !== null && count > 0;
    expect(hackSucceeded).toBe(false);

    // Verify the title is unchanged
    const admin = createServiceClient();
    const { data } = await admin
      .from('jobs')
      .select('title')
      .eq('id', jobA.id)
      .single();
    expect(data?.title).not.toBe('hacked');
  });
});
