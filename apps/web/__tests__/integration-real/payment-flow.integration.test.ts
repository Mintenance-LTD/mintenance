// @vitest-environment node
/**
 * REAL DATABASE integration test — verifies the payment state machine and
 * RLS policies on the `payments` table.
 *
 * Replaces the gutted mock-based test at
 * apps/web/app/__tests__/integration/payment-flow.integration.test.tsx
 * which had 5 `it.todo` stubs and zero assertions.
 *
 * This test exercises:
 *  - payments RLS: payer, payee, admin, third-party, anon access boundaries
 *  - payments state machine: pending → processing → in_escrow → released
 *  - Write-side enforcement: non-service-role users cannot INSERT/UPDATE
 *  - FK integrity: payment can't reference non-existent job/user
 *
 * Policy (from 20260206009000_core_rls_policies.sql):
 *   payments.SELECT allowed when:
 *     payer_id = auth.uid() OR payee_id = auth.uid() OR (auth.uid() is admin)
 *   All INSERT/UPDATE/DELETE are service-role only.
 *
 * Status enum (from 003_payment_system.sql):
 *   pending, processing, in_escrow, released, completed, failed, refunded, disputed
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
  createTestPayment,
  type TestUser,
  type TestJob,
  type TestPayment,
} from '../../test/integration/fixtures';

describe('payments RLS + state machine (real DB)', () => {
  let homeowner: TestUser;
  let contractor: TestUser;
  let thirdParty: TestUser;
  let admin: TestUser;
  let job: TestJob;
  let payment: TestPayment;

  let homeownerClient: SupabaseClient;
  let contractorClient: SupabaseClient;
  let thirdPartyClient: SupabaseClient;
  let adminClient: SupabaseClient;

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
    thirdParty = await createTestUser({ role: 'homeowner' });
    admin = await createTestUser({ role: 'admin' });

    job = await createTestJob({ homeowner_id: homeowner.id });
    payment = await createTestPayment({
      job_id: job.id,
      payer_id: homeowner.id,
      payee_id: contractor.id,
      amount: 400,
      status: 'pending',
    });

    homeownerClient = await createAuthenticatedClient(
      homeowner.email,
      homeowner.password,
    );
    contractorClient = await createAuthenticatedClient(
      contractor.email,
      contractor.password,
    );
    thirdPartyClient = await createAuthenticatedClient(
      thirdParty.email,
      thirdParty.password,
    );
    adminClient = await createAuthenticatedClient(admin.email, admin.password);
  }, 30_000);

  afterAll(async () => {
    await payment?.cleanup();
    await job?.cleanup();
    await homeowner?.cleanup();
    await contractor?.cleanup();
    await thirdParty?.cleanup();
    await admin?.cleanup();
  });

  // ─── RLS: SELECT access ────────────────────────────────────────────────

  it('payer (homeowner) CAN read their own payment', async () => {
    const { data, error } = await homeownerClient
      .from('payments')
      .select('id, amount, status, payer_id, payee_id')
      .eq('id', payment.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(payment.id);
    expect(data?.payer_id).toBe(homeowner.id);
    expect(data?.payee_id).toBe(contractor.id);
    expect(Number(data?.amount)).toBe(400);
  });

  it('payee (contractor) CAN read their own payment', async () => {
    const { data, error } = await contractorClient
      .from('payments')
      .select('id, status')
      .eq('id', payment.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(payment.id);
  });

  it('admin user CAN read any payment (admin policy)', async () => {
    const { data, error } = await adminClient
      .from('payments')
      .select('id')
      .eq('id', payment.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(payment.id);
  });

  it('third-party user CANNOT read someone else payment', async () => {
    const { data } = await thirdPartyClient
      .from('payments')
      .select('id')
      .eq('id', payment.id)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it('third-party user CANNOT enumerate payments via list query', async () => {
    const { data, error } = await thirdPartyClient
      .from('payments')
      .select('id')
      .limit(100);

    expect(error).toBeNull();
    const visibleIds = (data ?? []).map((r) => r.id);
    expect(visibleIds).not.toContain(payment.id);
  });

  it('anonymous client CANNOT read any payment', async () => {
    const anon = createAnonClient();
    const { data } = await anon
      .from('payments')
      .select('id')
      .eq('id', payment.id)
      .maybeSingle();

    expect(data).toBeNull();
  });

  // ─── RLS: write-side enforcement ───────────────────────────────────────

  it('authenticated user CANNOT insert payment (service-role only)', async () => {
    const { data, error } = await homeownerClient
      .from('payments')
      .insert({
        job_id: job.id,
        payer_id: homeowner.id,
        payee_id: contractor.id,
        amount: 9999,
        status: 'pending',
        payment_method: 'stripe',
      })
      .select('id');

    const inserted = error === null && data !== null && data.length > 0;
    expect(inserted).toBe(false);
  });

  it('payer CANNOT update payment status (service-role only)', async () => {
    const { error, count } = await homeownerClient
      .from('payments')
      .update({ status: 'released' })
      .eq('id', payment.id)
      .select('id', { count: 'exact', head: true });

    const updated = error === null && count !== null && count > 0;
    expect(updated).toBe(false);

    // Verify status is unchanged via service client
    const admin = createServiceClient();
    const { data } = await admin
      .from('payments')
      .select('status')
      .eq('id', payment.id)
      .single();
    expect(data?.status).toBe('pending');
  });

  it('payee CANNOT update payment status (service-role only)', async () => {
    const { error, count } = await contractorClient
      .from('payments')
      .update({ status: 'released' })
      .eq('id', payment.id)
      .select('id', { count: 'exact', head: true });

    const updated = error === null && count !== null && count > 0;
    expect(updated).toBe(false);
  });

  it('authenticated user CANNOT delete payment (service-role only)', async () => {
    const { error, count } = await homeownerClient
      .from('payments')
      .delete()
      .eq('id', payment.id)
      .select('id', { count: 'exact', head: true });

    const deleted = error === null && count !== null && count > 0;
    expect(deleted).toBe(false);

    // Verify payment still exists
    const admin = createServiceClient();
    const { data } = await admin
      .from('payments')
      .select('id')
      .eq('id', payment.id)
      .single();
    expect(data?.id).toBe(payment.id);
  });

  // ─── State machine: valid transitions via service role ─────────────────

  it('service role can transition pending → processing', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('payments')
      .update({ status: 'processing' })
      .eq('id', payment.id);

    expect(error).toBeNull();

    const { data } = await admin
      .from('payments')
      .select('status')
      .eq('id', payment.id)
      .single();
    expect(data?.status).toBe('processing');
  });

  it('service role can transition processing → in_escrow', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('payments')
      .update({ status: 'in_escrow' })
      .eq('id', payment.id);

    expect(error).toBeNull();

    const { data } = await admin
      .from('payments')
      .select('status')
      .eq('id', payment.id)
      .single();
    expect(data?.status).toBe('in_escrow');
  });

  it('service role can transition in_escrow → released with timestamp', async () => {
    const admin = createServiceClient();
    const releaseTime = new Date().toISOString();
    const { error } = await admin
      .from('payments')
      .update({ status: 'released', escrow_released_at: releaseTime })
      .eq('id', payment.id);

    expect(error).toBeNull();

    const { data } = await admin
      .from('payments')
      .select('status, escrow_released_at')
      .eq('id', payment.id)
      .single();
    expect(data?.status).toBe('released');
    expect(data?.escrow_released_at).not.toBeNull();
  });

  it('CHECK constraint rejects invalid status value', async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from('payments')
      .update({ status: 'not_a_real_status' })
      .eq('id', payment.id);

    // Postgres CHECK constraint violation
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/check|constraint|invalid/);
  });

  // ─── FK integrity ──────────────────────────────────────────────────────

  it('FK constraint rejects payment referencing non-existent job', async () => {
    const admin = createServiceClient();
    const fakeJobId = '00000000-0000-0000-0000-000000000000';
    const { error } = await admin.from('payments').insert({
      job_id: fakeJobId,
      payer_id: homeowner.id,
      payee_id: contractor.id,
      amount: 100,
      status: 'pending',
      payment_method: 'stripe',
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/foreign key|violates/);
  });

  it('FK constraint rejects payment referencing non-existent payer', async () => {
    const admin = createServiceClient();
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    const { error } = await admin.from('payments').insert({
      job_id: job.id,
      payer_id: fakeUserId,
      payee_id: contractor.id,
      amount: 100,
      status: 'pending',
      payment_method: 'stripe',
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/foreign key|violates/);
  });
});
