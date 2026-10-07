import { beforeAll, afterAll, expect, it } from 'vitest';
import {
  createServiceClient,
  createAnonClient,
} from '../../test/integration/supabase-test-client';
import { createTestUser, type TestUser } from '../../test/integration/fixtures';
const db = createServiceClient();
let user: TestUser;
let operationId: string;
beforeAll(async () => {
  user = await createTestUser({ role: 'contractor' });
  expect(
    (
      await db
        .from('profiles')
        .update({
          stripe_connect_account_id: 'acct_synthetic',
          stripe_payouts_enabled: true,
          stripe_transfers_active: true,
        })
        .eq('id', user.id)
    ).error
  ).toBeNull();
  expect(
    (
      await db.from('contractor_payout_balances').insert({
        contractor_id: user.id,
        currency: 'GBP',
        pending_amount_minor: 70,
      })
    ).error
  ).toBeNull();
});
afterAll(async () => {
  if (!user) return;
  await db
    .from('contractor_payout_operations')
    .delete()
    .eq('contractor_id', user.id);
  await db
    .from('contractor_payout_transfers')
    .delete()
    .eq('contractor_id', user.id);
  await db
    .from('contractor_payout_balances')
    .update({ pending_amount_minor: 0 })
    .eq('contractor_id', user.id);
  await user.cleanup();
});
it('overlapping reservations return one operation without removing pending earnings', async () => {
  const results = await Promise.all(
    [1, 2].map(() =>
      db.rpc('reserve_weekly_payout', {
        p_contractor_id: user.id,
        p_currency: 'GBP',
      })
    )
  );
  for (const result of results) expect(result.error).toBeNull();
  expect(results[0].data.id).toBe(results[1].data.id);
  operationId = results[0].data.id;
  const balance = await db
    .from('contractor_payout_balances')
    .select('*')
    .eq('contractor_id', user.id)
    .single();
  expect(balance.data.pending_amount_minor).toBe(70);
  expect(balance.data.lifetime_paid_out_minor).toBe(0);
});
it('blocks cascaded profile deletion with unpaid funds', async () => {
  const result = await db.from('profiles').delete().eq('id', user.id);
  expect(result.error?.code).toBe('23514');
  expect(
    (await db.from('profiles').select('id').eq('id', user.id).single()).data?.id
  ).toBe(user.id);
});
it('resumes the same attempt and accounts once while preserving new earnings', async () => {
  const first = await db.rpc('begin_weekly_payout', {
    p_operation_id: operationId,
  });
  const second = await db.rpc('begin_weekly_payout', {
    p_operation_id: operationId,
  });
  expect(first.error).toBeNull();
  expect(second.data.first_attempt_at).toBe(first.data.first_attempt_at);
  // Simulate another job credit arriving after reservation.
  expect(
    (
      await db
        .from('contractor_payout_balances')
        .update({ pending_amount_minor: 120 })
        .eq('contractor_id', user.id)
    ).error
  ).toBeNull();
  for (let n = 0; n < 2; n++)
    expect(
      (
        await db.rpc('complete_weekly_payout', {
          p_operation_id: operationId,
          p_transfer_id: 'tr_synthetic_' + operationId,
        })
      ).error
    ).toBeNull();
  const balance = await db
    .from('contractor_payout_balances')
    .select('*')
    .eq('contractor_id', user.id)
    .single();
  expect(balance.data.pending_amount_minor).toBe(50);
  expect(balance.data.lifetime_paid_out_minor).toBe(70);
  const transfers = await db
    .from('contractor_payout_transfers')
    .select('*')
    .eq('contractor_id', user.id);
  expect(transfers.data).toHaveLength(1);
});
it('does not permit a different transfer to complete the same operation', async () => {
  expect(
    (
      await db.rpc('complete_weekly_payout', {
        p_operation_id: operationId,
        p_transfer_id: 'tr_other',
      })
    ).error
  ).not.toBeNull();
});
it('denies anonymous reservation and journal access', async () => {
  const anon = createAnonClient();
  expect(
    (
      await anon.rpc('reserve_weekly_payout', {
        p_contractor_id: user.id,
        p_currency: 'GBP',
      })
    ).error
  ).not.toBeNull();
  const result = await anon.from('contractor_payout_operations').select('*');
  expect(result.data?.length ?? 0).toBe(0);
});
