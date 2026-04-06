// @vitest-environment node
/**
 * REAL DATABASE integration test — verifies transactional bid acceptance and
 * database-level protection against duplicate bid acceptance.
 *
 * Critical invariants enforced by the database:
 *   1. Only ONE bid per job can have status='accepted'
 *      Enforced by: idx_bids_one_accepted_per_job (partial unique index)
 *      Migration: 20260325000001_prevent_duplicate_bid_acceptance.sql
 *
 *   2. A contractor can have at most ONE bid per job
 *      Enforced by: UNIQUE(job_id, contractor_id) in bids table
 *      Migration: 002_job_system.sql
 *
 *   3. A job can have at most ONE contractor when assigned/in_progress/completed
 *      Enforced by: idx_jobs_one_contractor_when_assigned (partial unique index)
 *
 * These constraints are the last line of defense against race conditions in
 * the application-level bid acceptance flow. A mock test cannot verify them.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createServiceClient,
  isLocalSupabaseAvailable,
} from '../../test/integration/supabase-test-client';
import {
  createTestUser,
  createTestJob,
  createTestBid,
  type TestUser,
  type TestJob,
  type TestBid,
} from '../../test/integration/fixtures';

describe('bid acceptance — DB invariants (real DB)', () => {
  let homeowner: TestUser;
  let contractorA: TestUser;
  let contractorB: TestUser;
  let job: TestJob;
  const cleanupBids: TestBid[] = [];

  beforeAll(async () => {
    const available = await isLocalSupabaseAvailable();
    if (!available) {
      throw new Error(
        'INTEGRATION_TESTS=1 was set but Supabase is not reachable at ' +
          'http://localhost:54321. Run `supabase start` first.',
      );
    }

    homeowner = await createTestUser({ role: 'homeowner' });
    contractorA = await createTestUser({ role: 'contractor' });
    contractorB = await createTestUser({ role: 'contractor' });
    job = await createTestJob({ homeowner_id: homeowner.id, status: 'posted' });
  }, 30_000);

  beforeEach(async () => {
    // Clean up any bids from previous tests, reset job status
    const admin = createServiceClient();
    for (const bid of cleanupBids) {
      await bid.cleanup().catch(() => {});
    }
    cleanupBids.length = 0;
    await admin
      .from('jobs')
      .update({ status: 'posted', contractor_id: null })
      .eq('id', job.id);
  });

  afterAll(async () => {
    for (const bid of cleanupBids) await bid.cleanup().catch(() => {});
    await job?.cleanup();
    await homeowner?.cleanup();
    await contractorA?.cleanup();
    await contractorB?.cleanup();
  });

  it('single contractor can insert a pending bid', async () => {
    const bid = await createTestBid({
      job_id: job.id,
      contractor_id: contractorA.id,
      amount: 300,
    });
    cleanupBids.push(bid);
    expect(bid.id).toBeTruthy();
  });

  it('same contractor CANNOT bid twice on same job (UNIQUE constraint)', async () => {
    const first = await createTestBid({
      job_id: job.id,
      contractor_id: contractorA.id,
      amount: 300,
    });
    cleanupBids.push(first);

    const admin = createServiceClient();
    const { error } = await admin.from('bids').insert({
      job_id: job.id,
      contractor_id: contractorA.id,
      amount: 250,
      status: 'pending',
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/duplicate|unique/);
  });

  it('can have multiple pending bids from different contractors', async () => {
    const bidA = await createTestBid({
      job_id: job.id,
      contractor_id: contractorA.id,
    });
    const bidB = await createTestBid({
      job_id: job.id,
      contractor_id: contractorB.id,
    });
    cleanupBids.push(bidA, bidB);

    const admin = createServiceClient();
    const { data } = await admin
      .from('bids')
      .select('id, status')
      .eq('job_id', job.id);

    expect(data?.length).toBe(2);
    expect(data?.every((b) => b.status === 'pending')).toBe(true);
  });

  it('only ONE bid per job can have status=accepted (partial unique index)', async () => {
    const bidA = await createTestBid({
      job_id: job.id,
      contractor_id: contractorA.id,
      status: 'accepted',
    });
    cleanupBids.push(bidA);

    const admin = createServiceClient();
    // Try to insert a second ACCEPTED bid for the same job
    const { error: insertErr } = await admin.from('bids').insert({
      job_id: job.id,
      contractor_id: contractorB.id,
      amount: 200,
      status: 'accepted',
    });

    expect(insertErr).not.toBeNull();
    expect(insertErr?.message.toLowerCase()).toMatch(
      /duplicate|unique|idx_bids_one_accepted/,
    );
  });

  it('updating a second bid to accepted FAILS if one already accepted', async () => {
    const bidA = await createTestBid({
      job_id: job.id,
      contractor_id: contractorA.id,
      status: 'accepted',
    });
    const bidB = await createTestBid({
      job_id: job.id,
      contractor_id: contractorB.id,
      status: 'pending',
    });
    cleanupBids.push(bidA, bidB);

    const admin = createServiceClient();
    const { error } = await admin
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bidB.id);

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/duplicate|unique/);

    // Verify bidB stayed pending
    const { data } = await admin
      .from('bids')
      .select('status')
      .eq('id', bidB.id)
      .single();
    expect(data?.status).toBe('pending');
  });

  it('after rejecting first bid, a second bid CAN be accepted', async () => {
    const bidA = await createTestBid({
      job_id: job.id,
      contractor_id: contractorA.id,
      status: 'accepted',
    });
    const bidB = await createTestBid({
      job_id: job.id,
      contractor_id: contractorB.id,
      status: 'pending',
    });
    cleanupBids.push(bidA, bidB);

    const admin = createServiceClient();
    // Reject the first bid
    await admin.from('bids').update({ status: 'rejected' }).eq('id', bidA.id);

    // Now accept the second — should succeed (partial unique index only
    // considers WHERE status = 'accepted')
    const { error } = await admin
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bidB.id);

    expect(error).toBeNull();

    const { data } = await admin
      .from('bids')
      .select('status')
      .eq('id', bidB.id)
      .single();
    expect(data?.status).toBe('accepted');
  });

  it('bid FK to job is enforced (cannot bid on non-existent job)', async () => {
    const admin = createServiceClient();
    const fakeJobId = '00000000-0000-0000-0000-000000000000';

    const { error } = await admin.from('bids').insert({
      job_id: fakeJobId,
      contractor_id: contractorA.id,
      amount: 100,
      status: 'pending',
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/foreign key|violates/);
  });

  it('bid status CHECK constraint rejects invalid values', async () => {
    const admin = createServiceClient();
    const { error } = await admin.from('bids').insert({
      job_id: job.id,
      contractor_id: contractorA.id,
      amount: 100,
      status: 'maybe_someday',
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/check|constraint/);
  });

  it('deleting job CASCADEs to delete all its bids', async () => {
    // Create an ephemeral job + bid for this test
    const tempJob = await createTestJob({ homeowner_id: homeowner.id });
    const tempBid = await createTestBid({
      job_id: tempJob.id,
      contractor_id: contractorA.id,
    });

    const admin = createServiceClient();
    // Verify bid exists
    const { data: before } = await admin
      .from('bids')
      .select('id')
      .eq('id', tempBid.id)
      .maybeSingle();
    expect(before?.id).toBe(tempBid.id);

    // Delete the job
    await tempJob.cleanup();

    // Bid should be gone (FK ON DELETE CASCADE)
    const { data: after } = await admin
      .from('bids')
      .select('id')
      .eq('id', tempBid.id)
      .maybeSingle();
    expect(after).toBeNull();
  });
});
