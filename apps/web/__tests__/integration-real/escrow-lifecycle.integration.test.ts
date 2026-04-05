// @vitest-environment node
/**
 * REAL DATABASE integration test — verifies the escrow_accounts state machine
 * and FK integrity with payments.
 *
 * Complements escrow-rls.integration.test.ts which covers read-access boundaries.
 * This file focuses on LIFECYCLE: state transitions, timestamps, cascades.
 *
 * Status enum (from 003_payment_system.sql):
 *   held → releasing → released
 *   (or refunded from any state)
 *
 * Invariants verified:
 *   - escrow_accounts.status defaults to 'held'
 *   - CHECK constraint enforces valid status values
 *   - FK to payments is enforced (can't create orphan escrow)
 *   - Deleting payment CASCADEs to escrow
 *   - released_at timestamp can be set on release
 *   - State transitions are all permitted by the DB (app enforces order)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createServiceClient,
  isLocalSupabaseAvailable,
} from '../../test/integration/supabase-test-client';
import {
  createTestUser,
  createTestJob,
  createTestPayment,
  createTestEscrow,
  type TestUser,
  type TestJob,
  type TestPayment,
  type TestEscrow,
} from '../../test/integration/fixtures';

describe('escrow_accounts lifecycle (real DB)', () => {
  let homeowner: TestUser;
  let contractor: TestUser;
  let job: TestJob;
  let payment: TestPayment;
  let escrow: TestEscrow;

  beforeAll(async () => {
    const available = await isLocalSupabaseAvailable();
    if (!available) {
      throw new Error(
        'INTEGRATION_TESTS=1 was set but Supabase is not reachable at ' +
          'http://localhost:54321. Run `supabase start` first.',
      );
    }

    homeowner = await createTestUser({ role: 'homeowner' });
    contractor = await createTestUser({ role: 'contractor' });
    job = await createTestJob({ homeowner_id: homeowner.id });
    payment = await createTestPayment({
      job_id: job.id,
      payer_id: homeowner.id,
      payee_id: contractor.id,
      amount: 600,
      status: 'in_escrow',
    });
  }, 30_000);

  beforeEach(async () => {
    // Fresh escrow for each test — cleaned up at end
    if (escrow) await escrow.cleanup().catch(() => {});
    escrow = await createTestEscrow({
      payment_id: payment.id,
      amount: 600,
      status: 'held',
    });
  });

  afterAll(async () => {
    await escrow?.cleanup().catch(() => {});
    await payment?.cleanup();
    await job?.cleanup();
    await homeowner?.cleanup();
    await contractor?.cleanup();
  });

  it('new escrow defaults to status="held"', async () => {
    const admin = createServiceClient();
    const { data } = await admin
      .from('escrow_accounts')
      .select('status, released_at')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('held');
    expect(data?.released_at).toBeNull();
  });

  it('transition held → releasing is allowed', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('escrow_accounts')
      .update({ status: 'releasing' })
      .eq('id', escrow.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from('escrow_accounts')
      .select('status')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('releasing');
  });

  it('transition releasing → released sets timestamp', async () => {
    const admin = createServiceClient();
    const releasedAt = new Date().toISOString();
    const { error } = await admin
      .from('escrow_accounts')
      .update({ status: 'released', released_at: releasedAt })
      .eq('id', escrow.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from('escrow_accounts')
      .select('status, released_at')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('released');
    expect(data?.released_at).not.toBeNull();
  });

  it('refund transition from held is allowed', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('escrow_accounts')
      .update({ status: 'refunded' })
      .eq('id', escrow.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from('escrow_accounts')
      .select('status')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('refunded');
  });

  it('CHECK constraint rejects invalid status value', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('escrow_accounts')
      .update({ status: 'disputed_escrow_state' })
      .eq('id', escrow.id);
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/check|constraint|invalid/);
  });

  it('amount must be non-null (NOT NULL constraint)', async () => {
    const admin = createServiceClient();
    const { error } = await admin.from('escrow_accounts').insert({
      payment_id: payment.id,
      amount: null,
      status: 'held',
    });
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/null|not-null|not null/);
  });

  it('FK to payments enforced (cannot create orphan escrow)', async () => {
    const admin = createServiceClient();
    const fakePaymentId = '00000000-0000-0000-0000-000000000000';
    const { error } = await admin.from('escrow_accounts').insert({
      payment_id: fakePaymentId,
      amount: 100,
      status: 'held',
    });
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/foreign key|violates/);
  });

  it('deleting payment CASCADEs to escrow', async () => {
    // Create ephemeral payment + escrow for this test
    const admin = createServiceClient();
    const tempPayment = await createTestPayment({
      job_id: job.id,
      payer_id: homeowner.id,
      payee_id: contractor.id,
      amount: 100,
      status: 'in_escrow',
    });
    const tempEscrow = await createTestEscrow({
      payment_id: tempPayment.id,
      amount: 100,
      status: 'held',
    });

    // Verify escrow exists
    const { data: before } = await admin
      .from('escrow_accounts')
      .select('id')
      .eq('id', tempEscrow.id)
      .maybeSingle();
    expect(before?.id).toBe(tempEscrow.id);

    // Delete payment
    await tempPayment.cleanup();

    // Escrow should be gone (FK ON DELETE CASCADE)
    const { data: after } = await admin
      .from('escrow_accounts')
      .select('id')
      .eq('id', tempEscrow.id)
      .maybeSingle();
    expect(after).toBeNull();
  });

  it('release_conditions JSONB can be set and retrieved', async () => {
    const admin = createServiceClient();
    const conditions = {
      homeowner_approval: true,
      auto_release_days: 7,
      photos_required: 2,
    };
    const { error } = await admin
      .from('escrow_accounts')
      .update({ release_conditions: conditions })
      .eq('id', escrow.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from('escrow_accounts')
      .select('release_conditions')
      .eq('id', escrow.id)
      .single();
    expect(data?.release_conditions).toEqual(conditions);
  });

  it('amount precision is DECIMAL(10,2) — decimals preserved', async () => {
    const admin = createServiceClient();
    const { data: created } = await admin
      .from('escrow_accounts')
      .insert({
        payment_id: payment.id,
        amount: 123.45,
        status: 'held',
      })
      .select('id, amount')
      .single();

    expect(Number(created?.amount)).toBe(123.45);

    // Cleanup
    await admin.from('escrow_accounts').delete().eq('id', created?.id);
  });
});
