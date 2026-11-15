// @vitest-environment node
import { it, expect } from 'vitest';
import { createServiceClient } from '../../test/integration/supabase-test-client';
import {
  createTestUser,
  createTestJob,
  createTestBid,
} from '../../test/integration/fixtures';

it('rejects an expired quote atomically and permits acceptance only after a valid replacement date', async () => {
  const admin = createServiceClient();
  const owner = await createTestUser({ role: 'homeowner' });
  const contractor = await createTestUser({ role: 'contractor' });
  const job = await createTestJob({ homeowner_id: owner.id, status: 'posted' });
  const bid = await createTestBid({
    job_id: job.id,
    contractor_id: contractor.id,
  });
  let quoteId: string | undefined;
  try {
    const quote = await admin
      .from('contractor_quotes')
      .insert({
        contractor_id: contractor.id,
        title: 'Synthetic expiry check',
        client_name: 'Synthetic owner',
        total_amount: 200,
        status: 'sent',
        valid_until: '2020-01-01',
      })
      .select('id')
      .single();
    expect(quote.error).toBeNull();
    quoteId = quote.data!.id;
    expect(
      (await admin.from('bids').update({ quote_id: quoteId }).eq('id', bid.id))
        .error
    ).toBeNull();
    const args = {
      p_bid_id: bid.id,
      p_job_id: job.id,
      p_contractor_id: contractor.id,
      p_homeowner_id: owner.id,
    };
    const expired = await admin.rpc('accept_bid_atomic', args);
    expect(expired.error?.code).toBe('23514');
    expect(
      (await admin.from('bids').select('status').eq('id', bid.id).single()).data
        ?.status
    ).toBe('pending');
    expect(
      (await admin.from('jobs').select('status').eq('id', job.id).single()).data
        ?.status
    ).toBe('posted');
    const tomorrow = new Date(Date.now() + 2 * 86400000)
      .toISOString()
      .slice(0, 10);
    expect(
      (
        await admin
          .from('contractor_quotes')
          .update({ valid_until: tomorrow })
          .eq('id', quoteId!)
      ).error
    ).toBeNull();
    const accepted = await admin.rpc('accept_bid_atomic', args);
    expect(accepted.error).toBeNull();
    expect(accepted.data?.[0]?.success).toBe(true);
    expect(
      (await admin.from('bids').select('status').eq('id', bid.id).single()).data
        ?.status
    ).toBe('accepted');
  } finally {
    await bid.cleanup();
    await job.cleanup();
    if (quoteId)
      await admin.from('contractor_quotes').delete().eq('id', quoteId);
    await contractor.cleanup();
    await owner.cleanup();
  }
}, 30000);
