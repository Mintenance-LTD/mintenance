// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  filters: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  linked: vi.fn(),
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {},
}));
vi.mock('@/lib/email-service', () => ({ EmailService: {} }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      let writing = false;
      const q = {
        select: () => q,
        eq: (...args: unknown[]) => {
          mocks.filters(table, writing, 'eq', ...args);
          return q;
        },
        is: (...args: unknown[]) => {
          mocks.filters(table, writing, 'is', ...args);
          return q;
        },
        in: (...args: unknown[]) => {
          mocks.filters(table, writing, 'in', ...args);
          return q;
        },
        not: () => q,
        update: (data: unknown) => {
          writing = true;
          mocks.update(table, data);
          return q;
        },
        insert: (data: unknown) => {
          writing = true;
          mocks.insert(table, data);
          return q;
        },
        single: () => (writing ? mocks.write() : mocks.read()),
        maybeSingle: () => (writing ? mocks.write() : mocks.read()),
        then: (resolve: (value: unknown) => unknown) =>
          (writing ? mocks.write() : mocks.linked()).then(resolve),
      };
      return q;
    },
  },
}));
import {
  prepareQuoteData,
  processQuote,
} from '@/app/api/contractor/submit-bid/quote-processor';
import { processBid } from '@/app/api/contractor/submit-bid/bid-processor';
import { syncLinkedQuoteStatuses } from '@/app/api/jobs/[id]/bids/[bidId]/accept/_helpers';
const input = {
  jobId: 'job',
  bidAmount: 10,
  proposalText: 'A proposal',
} as Parameters<typeof prepareQuoteData>[0];
const payload = () =>
  prepareQuoteData(input, 'actor', 'Job', 'Client', 'synthetic@example.test');
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({
    data: { id: 'quote', status: 'sent', updated_at: 'version' },
    error: null,
  });
  mocks.write.mockResolvedValue({ data: { id: 'quote' }, error: null });
});
it.each(['accepted', 'rejected', 'expired'])(
  'does not revise a %s linked quote',
  async (status) => {
    mocks.read.mockResolvedValue({
      data: { id: 'quote', status },
      error: null,
    });
    expect(await processQuote(payload(), 'quote', 'bid')).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  }
);
it('does not create a replacement when the linked quote is missing/foreign/unreadable', async () => {
  mocks.read.mockResolvedValue({ data: null, error: { message: 'not found' } });
  expect(await processQuote(payload(), 'quote', 'bid')).toBeNull();
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.filters).toHaveBeenCalledWith(
    'contractor_quotes',
    false,
    'eq',
    'contractor_id',
    'actor'
  );
  expect(mocks.filters).toHaveBeenCalledWith(
    'contractor_quotes',
    false,
    'eq',
    'job_id',
    'job'
  );
});
it('guards the linked quote update by owner/job/status/loaded version', async () => {
  await processQuote(payload(), 'quote', 'bid');
  for (const [field, value] of [
    ['contractor_id', 'actor'],
    ['job_id', 'job'],
    ['status', 'sent'],
    ['updated_at', 'version'],
  ]) {
    expect(mocks.filters).toHaveBeenCalledWith(
      'contractor_quotes',
      true,
      'eq',
      field,
      value
    );
  }
});
it('uses IS NULL for legacy versions and returns no false success after a lost race', async () => {
  mocks.read.mockResolvedValue({
    data: { id: 'quote', status: 'sent', updated_at: null },
    error: null,
  });
  mocks.write.mockResolvedValue({ data: null, error: { message: 'No row' } });
  expect(await processQuote(payload(), 'quote', 'bid')).toBeNull();
  expect(mocks.filters).toHaveBeenCalledWith(
    'contractor_quotes',
    true,
    'is',
    'updated_at',
    null
  );
});
it('only links a newly created quote while the bid is still pending', async () => {
  await processQuote(payload(), null, 'bid');
  expect(mocks.filters).toHaveBeenCalledWith(
    'bids',
    true,
    'eq',
    'status',
    'pending'
  );
  expect(mocks.filters).toHaveBeenCalledWith(
    'bids',
    true,
    'is',
    'quote_id',
    null
  );
});
it('does not report a linked quote when another request already linked or accepted the bid', async () => {
  mocks.write
    .mockResolvedValueOnce({ data: { id: 'quote' }, error: null })
    .mockResolvedValueOnce({ data: null, error: null });
  expect(await processQuote(payload(), null, 'bid')).toBeNull();
});
it.each(['pending', 'withdrawn'])(
  'guards resubmission from the loaded %s state',
  async (status) => {
    mocks.read.mockResolvedValue({ data: { id: 'bid', status }, error: null });
    await processBid(input, 'actor', {
      job_id: 'job',
      contractor_id: 'actor',
      amount: 10,
      description: 'Proposal',
      message: 'Proposal',
      status: 'pending',
      updated_at: 'version',
    });
    expect(mocks.filters).toHaveBeenCalledWith(
      'bids',
      true,
      'eq',
      'status',
      status
    );
    expect(mocks.filters).toHaveBeenCalledWith(
      'bids',
      true,
      'eq',
      'contractor_id',
      'actor'
    );
    expect(mocks.filters).toHaveBeenCalledWith(
      'bids',
      true,
      'eq',
      'job_id',
      'job'
    );
  }
);
it('rejects a bid resubmission that lost the pending-to-accepted race', async () => {
  mocks.read.mockResolvedValue({
    data: { id: 'bid', status: 'pending' },
    error: null,
  });
  mocks.write.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
  await expect(
    processBid(input, 'actor', {
      job_id: 'job',
      contractor_id: 'actor',
      amount: 10,
      description: 'Proposal',
      message: 'Proposal',
      status: 'pending',
      updated_at: 'version',
    })
  ).rejects.toThrow('Unable to update');
});
it('synchronizes only confirmed accepted/rejected bids and never demotes an accepted quote', async () => {
  mocks.linked.mockResolvedValue({
    data: [
      { id: 'winner', quote_id: 'accepted', status: 'accepted' },
      { id: 'loser', quote_id: 'rejected', status: 'rejected' },
      { id: 'shared', quote_id: 'accepted', status: 'rejected' },
      { id: 'pending', quote_id: 'pending', status: 'pending' },
    ],
    error: null,
  });
  await syncLinkedQuoteStatuses({ acceptedBidId: 'winner', jobId: 'job' });
  expect(mocks.update.mock.calls.map(([, data]) => data.status)).toEqual([
    'accepted',
    'rejected',
  ]);
  expect(mocks.filters).toHaveBeenCalledWith(
    'contractor_quotes',
    true,
    'in',
    'id',
    ['rejected']
  );
  expect(mocks.filters).toHaveBeenCalledWith(
    'contractor_quotes',
    true,
    'eq',
    'job_id',
    'job'
  );
  expect(mocks.filters).toHaveBeenCalledWith(
    'contractor_quotes',
    true,
    'in',
    'status',
    ['draft', 'sent', 'viewed']
  );
});
it('does not promote a bid whose acceptance is not confirmed', async () => {
  mocks.linked.mockResolvedValue({
    data: [{ id: 'winner', quote_id: 'quote', status: 'pending' }],
    error: null,
  });
  await syncLinkedQuoteStatuses({ acceptedBidId: 'winner', jobId: 'job' });
  expect(mocks.update).not.toHaveBeenCalled();
});
