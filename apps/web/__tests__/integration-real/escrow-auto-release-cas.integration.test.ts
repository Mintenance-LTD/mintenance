// @vitest-environment node
/**
 * REAL DATABASE concurrency test — proves the escrow auto-release
 * compare-and-swap (CAS) actually gates concurrent releases at the DB level.
 *
 * WHY THIS EXISTS
 * ---------------
 * The unit suite runs single-threaded with Supabase mocked, so it can never
 * exercise the property the 2026-07-10 fix depends on: that under real Postgres
 * row-locking, only ONE caller can flip an escrow `held -> release_pending`.
 * EscrowAutoReleaseService.releaseEscrow() calls `stripe.transfers.create`
 * strictly AFTER a successful claim and returns early on a failed claim, so
 * "exactly one claim wins" is equivalent to "exactly one transfer is attempted".
 * This file asserts the claim property directly against a real local Postgres.
 *
 * The claim statement under test mirrors EscrowAutoReleaseService.ts exactly:
 *     UPDATE escrow_transactions SET status='release_pending', updated_at=now()
 *     WHERE id = ? AND status = 'held'
 *     RETURNING id
 * Since 2026-07-17 the manual route (api/payments/release-escrow) uses the
 * SAME status='held' predicate (it previously CASed on `updated_at`, which
 * the route's own pre-CAS metadata writes deterministically broke), so cron
 * and manual claims now compete on one predicate.
 *
 * Prerequisites (same as the other integration-real specs):
 *   - `supabase start` (local stack at http://localhost:54321)
 *   - `supabase db reset` (migrations applied — the escrow_transactions status
 *     CHECK constraint must include 'release_pending')
 *   - run via `INTEGRATION_TESTS=1` + vitest.integration.config.ts
 *     (scripts/run-integration-tests.js sets this up)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  isLocalSupabaseAvailable,
} from '../../test/integration/supabase-test-client';
import {
  createTestUser,
  createTestJob,
  createTestEscrow,
  type TestUser,
  type TestJob,
  type TestEscrow,
} from '../../test/integration/fixtures';

const CONCURRENCY = 8;

describe('escrow auto-release CAS (real DB concurrency)', () => {
  let admin: SupabaseClient;
  let homeowner: TestUser;
  let contractor: TestUser;
  let job: TestJob;
  let escrow: TestEscrow;

  beforeAll(async () => {
    const available = await isLocalSupabaseAvailable();
    if (!available) {
      throw new Error(
        'INTEGRATION_TESTS=1 was set but Supabase is not reachable at ' +
          'http://localhost:54321. Run `supabase start` first.'
      );
    }

    admin = createServiceClient();
    homeowner = await createTestUser({ role: 'homeowner' });
    contractor = await createTestUser({ role: 'contractor' });
    job = await createTestJob({ homeowner_id: homeowner.id });
  }, 60_000);

  beforeEach(async () => {
    // Fresh `held` escrow per test so each race starts from a clean state.
    if (escrow) await escrow.cleanup().catch(() => {});
    escrow = await createTestEscrow({
      job_id: job.id,
      payer_id: homeowner.id,
      payee_id: contractor.id,
      amount: 600,
      status: 'held',
    });
  });

  afterAll(async () => {
    await escrow?.cleanup().catch(() => {});
    await job?.cleanup();
    await homeowner?.cleanup();
    await contractor?.cleanup();
  });

  /**
   * The claim EXACTLY as EscrowAutoReleaseService.releaseEscrow() issues it.
   * Returns true iff this caller won the row (would proceed to the transfer).
   */
  async function claimAsCron(): Promise<boolean> {
    const { data, error } = await admin
      .from('escrow_transactions')
      .update({
        status: 'release_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrow.id)
      .eq('status', 'held')
      .select('id');
    if (error) throw error;
    return (data?.length ?? 0) === 1;
  }

  it('N concurrent cron claims → exactly ONE wins (no double transfer)', async () => {
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => claimAsCron())
    );

    const winners = results.filter(Boolean).length;
    expect(winners).toBe(1); // <- the whole point: not 0, not 2+, exactly 1

    // The row ends in release_pending exactly once, and is no longer claimable.
    const { data: after } = await admin
      .from('escrow_transactions')
      .select('status')
      .eq('id', escrow.id)
      .single();
    expect(after?.status).toBe('release_pending');

    const claimAgain = await claimAsCron();
    expect(claimAgain).toBe(false); // already claimed → loser path is deterministic
  });

  it('cron claim vs manual claim (both status CAS) → mutually exclusive', async () => {
    // Manual route variant mirrors api/payments/release-escrow, which since
    // 2026-07-17 claims on the same status='held' predicate as the cron
    // (it also stamps reconciliation fields, irrelevant to the race).
    const claimAsManual = async (): Promise<boolean> => {
      const { data, error } = await admin
        .from('escrow_transactions')
        .update({
          status: 'release_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrow.id)
        .eq('status', 'held')
        .select('id');
      if (error) throw error;
      return (data?.length ?? 0) === 1;
    };

    // Fire both paths at the same instant on the same held row.
    const [cronWon, manualWon] = await Promise.all([
      claimAsCron(),
      claimAsManual(),
    ]);

    // Exactly one path may proceed to Stripe. This is the specific
    // cron-vs-manual race the CAS closes (the idempotency key does not — it
    // only dedupes cron-vs-cron).
    expect([cronWon, manualWon].filter(Boolean).length).toBe(1);
  });

  it('claim is a true no-op on a row already past `held`', async () => {
    // Move the row out of held first (simulating a prior release).
    const first = await claimAsCron();
    expect(first).toBe(true);

    // A second claim must match 0 rows — it must NOT resurrect the transition.
    const second = await claimAsCron();
    expect(second).toBe(false);

    // Refund/terminal states are likewise unclaimable.
    await admin
      .from('escrow_transactions')
      .update({ status: 'refunded' })
      .eq('id', escrow.id);
    const third = await claimAsCron();
    expect(third).toBe(false);
  });
});
