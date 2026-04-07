// @vitest-environment node
/**
 * REAL DATABASE integration test — verifies the escrow_transactions state machine.
 *
 * Complements escrow-rls.integration.test.ts which covers read-access boundaries.
 * This file focuses on LIFECYCLE: state transitions, timestamps, constraints.
 *
 * Status enum (from 20260213040000_fix_schema_mismatches.sql):
 *   pending → held → released (or refunded from held)
 *
 * Invariants verified:
 *   - escrow_transactions.status defaults to 'held' when explicitly set
 *   - CHECK constraint enforces valid status values
 *   - released_at timestamp can be set on release
 *   - State transitions are all permitted by the DB (app enforces order)
 *   - amount must be non-null
 *   - metadata JSONB can be set and retrieved
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('escrow_transactions lifecycle (real DB)', () => {
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

    homeowner = await createTestUser({ role: 'homeowner' });
    contractor = await createTestUser({ role: 'contractor' });
    job = await createTestJob({ homeowner_id: homeowner.id });
  }, 30_000);

  beforeEach(async () => {
    // Fresh escrow for each test — cleaned up at end
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

  it('new escrow defaults to status="held" when set explicitly', async () => {
    const admin = createServiceClient();
    const { data } = await admin
      .from('escrow_transactions')
      .select('status, released_at')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('held');
    expect(data?.released_at).toBeNull();
  });

  it('transition held → released sets timestamp', async () => {
    const admin = createServiceClient();
    const releasedAt = new Date().toISOString();
    const { error } = await admin
      .from('escrow_transactions')
      .update({ status: 'released', released_at: releasedAt })
      .eq('id', escrow.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from('escrow_transactions')
      .select('status, released_at')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('released');
    expect(data?.released_at).not.toBeNull();
  });

  it('refund transition from held is allowed', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('escrow_transactions')
      .update({ status: 'refunded' })
      .eq('id', escrow.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from('escrow_transactions')
      .select('status')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('refunded');
  });

  it('CHECK constraint rejects invalid status value', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('escrow_transactions')
      .update({ status: 'disputed_escrow_state' })
      .eq('id', escrow.id);
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/check|constraint|invalid/);
  });

  it('amount must be non-null (NOT NULL constraint)', async () => {
    const admin = createServiceClient();
    const { error } = await admin.from('escrow_transactions').insert({
      job_id: job.id,
      payer_id: homeowner.id,
      payee_id: contractor.id,
      amount: null,
      status: 'held',
    });
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/null|not-null|not null/);
  });

  it('metadata JSONB can be set and retrieved', async () => {
    const admin = createServiceClient();
    const meta = {
      homeowner_approval: true,
      auto_release_days: 7,
      photos_required: 2,
    };
    const { error } = await admin
      .from('escrow_transactions')
      .update({ metadata: meta })
      .eq('id', escrow.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from('escrow_transactions')
      .select('metadata')
      .eq('id', escrow.id)
      .single();
    expect(data?.metadata).toEqual(meta);
  });

  it('amount precision is DECIMAL(10,2) — decimals preserved', async () => {
    const admin = createServiceClient();
    const { data: created } = await admin
      .from('escrow_transactions')
      .insert({
        job_id: job.id,
        payer_id: homeowner.id,
        payee_id: contractor.id,
        amount: 123.45,
        status: 'held',
      })
      .select('id, amount')
      .single();

    expect(Number(created?.amount)).toBe(123.45);

    // Cleanup
    await admin.from('escrow_transactions').delete().eq('id', created?.id);
  });

  it('transition to awaiting_homeowner_approval is valid', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('escrow_transactions')
      .update({ status: 'awaiting_homeowner_approval' })
      .eq('id', escrow.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from('escrow_transactions')
      .select('status')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('awaiting_homeowner_approval');
  });
});
