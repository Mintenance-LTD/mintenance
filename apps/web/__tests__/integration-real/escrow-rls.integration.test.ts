// @vitest-environment node
/**
 * REAL DATABASE integration test — verifies RLS policy on escrow_accounts.
 *
 * Policy (from 20260206009000_core_rls_policies.sql):
 *   escrow_accounts.SELECT is allowed only to authenticated users whose
 *   auth.uid() matches payer_id or payee_id on the related payment.
 *
 * This is a critical security boundary: escrow records contain payment amounts
 * and release state. A third-party user must NOT be able to view escrow for
 * jobs they have no financial stake in.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAnonClient,
  createAuthenticatedClient,
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

describe('escrow_accounts RLS (real DB)', () => {
  let homeowner: TestUser;
  let contractor: TestUser;
  let thirdParty: TestUser;
  let job: TestJob;
  let payment: TestPayment;
  let escrow: TestEscrow;

  let homeownerClient: SupabaseClient;
  let contractorClient: SupabaseClient;
  let thirdPartyClient: SupabaseClient;

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

    job = await createTestJob({ homeowner_id: homeowner.id });
    payment = await createTestPayment({
      job_id: job.id,
      payer_id: homeowner.id,
      payee_id: contractor.id,
      amount: 500,
    });
    escrow = await createTestEscrow({
      payment_id: payment.id,
      amount: 500,
      status: 'held',
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
  }, 30_000);

  afterAll(async () => {
    // Cleanup in reverse order (escrow → payment → job → users)
    await escrow?.cleanup();
    await payment?.cleanup();
    await job?.cleanup();
    await homeowner?.cleanup();
    await contractor?.cleanup();
    await thirdParty?.cleanup();
  });

  it('payer (homeowner) CAN read their escrow record', async () => {
    const { data, error } = await homeownerClient
      .from('escrow_accounts')
      .select('id, amount, status, payment_id')
      .eq('id', escrow.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(escrow.id);
    expect(Number(data?.amount)).toBe(500);
    expect(data?.status).toBe('held');
  });

  it('payee (contractor) CAN read their escrow record', async () => {
    const { data, error } = await contractorClient
      .from('escrow_accounts')
      .select('id, amount, status')
      .eq('id', escrow.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(escrow.id);
  });

  it('third party CANNOT read someone else escrow record', async () => {
    const { data } = await thirdPartyClient
      .from('escrow_accounts')
      .select('id')
      .eq('id', escrow.id)
      .maybeSingle();

    // RLS filters out the row → data is null, no error
    expect(data).toBeNull();
  });

  it('third party CANNOT enumerate all escrow records', async () => {
    // Listing without filter — should return empty (only their own, which is none)
    const { data, error } = await thirdPartyClient
      .from('escrow_accounts')
      .select('id');

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    // Third party has zero payments → zero visible escrows
    const visibleIds = (data ?? []).map((r) => r.id);
    expect(visibleIds).not.toContain(escrow.id);
  });

  it('anonymous client CANNOT read any escrow record', async () => {
    const anon = createAnonClient();
    const { data } = await anon
      .from('escrow_accounts')
      .select('id')
      .eq('id', escrow.id)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it('authenticated user CANNOT insert escrow record (service-role only)', async () => {
    // Only service_role can INSERT — regular users must go through API routes
    const { data, error } = await homeownerClient
      .from('escrow_accounts')
      .insert({
        payment_id: payment.id,
        amount: 9999,
        status: 'held',
      })
      .select('id');

    // Insert should fail (RLS policy rejects non-service-role writes)
    const inserted = error === null && data !== null && data.length > 0;
    expect(inserted).toBe(false);
  });

  it('payee CANNOT update escrow status to released (service-role only)', async () => {
    const { error, count } = await contractorClient
      .from('escrow_accounts')
      .update({ status: 'released' })
      .eq('id', escrow.id)
      .select('id', { count: 'exact', head: true });

    const updated = error === null && count !== null && count > 0;
    expect(updated).toBe(false);

    // Verify status unchanged
    const anon = createAnonClient();
    void anon;
    // Use contractor client to re-read (they have SELECT access but update should have failed)
    const { data } = await contractorClient
      .from('escrow_accounts')
      .select('status')
      .eq('id', escrow.id)
      .single();
    expect(data?.status).toBe('held');
  });
});
