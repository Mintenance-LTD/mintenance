// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type Stripe from 'stripe';

const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}));

/**
 * Build a chainable Supabase mock. Key fix: `.then` must be a proper thenable
 * so `await serverSupabase.from('x').upsert({...})` resolves correctly.
 * `mockResolvedValue` ignores callback args — we must use `mockImplementation`.
 */
function buildChain(overrides?: {
  singleData?: unknown;
  singleError?: unknown;
  awaitData?: unknown[];
}) {
  const chain: Record<string, any> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'or', 'order', 'limit', 'range', 'contains']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({
    data: overrides?.singleData ?? null,
    error: overrides?.singleError ?? null,
  });
  // Proper thenable — resolves when chain is awaited without .single()
  chain.then = vi.fn().mockImplementation(
    (onFulfilled?: (value: unknown) => unknown) =>
      Promise.resolve().then(() =>
        onFulfilled?.({ data: overrides?.awaitData ?? [], error: null })
      )
  );
  return chain;
}

vi.mock('@/lib/api/supabaseServer', () => {
  const chain = buildChain();
  mockFrom.mockReturnValue(chain);
  return { serverSupabase: { from: mockFrom } };
});

vi.mock('@mintenance/shared', () => ({
  logger: { info: mockLoggerInfo, warn: mockLoggerWarn, error: mockLoggerError },
}));

import { handleDisputeCreated, handleDisputeUpdated, handleDisputeClosed } from '../dispute-handlers';

const PAYER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const PAYEE_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const JOB_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
const ESCROW_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';
const ADMIN_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';

function makeDispute(overrides?: Partial<Stripe.Dispute>): Stripe.Dispute {
  return {
    id: 'dp_test_123',
    charge: 'ch_test_123',
    payment_intent: 'pi_test_123',
    amount: 5000,
    currency: 'gbp',
    reason: 'fraudulent',
    status: 'needs_response',
    evidence_details: { due_by: Math.floor(Date.now() / 1000) + 604800 },
    ...overrides,
  } as unknown as Stripe.Dispute;
}

describe('handleDisputeCreated', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
  });

  it('records dispute and freezes escrow to disputed', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') {
        return buildChain({
          singleData: {
            id: ESCROW_ID,
            payer_id: PAYER_ID,
            payee_id: PAYEE_ID,
            job_id: JOB_ID,
          },
        });
      }
      if (table === 'profiles') {
        return buildChain({ awaitData: [{ id: ADMIN_ID }] });
      }
      return buildChain();
    });

    await handleDisputeCreated(makeDispute(), mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('disputes');
    expect(mockFrom).toHaveBeenCalledWith('escrow_transactions');
    expect(mockFrom).toHaveBeenCalledWith('jobs');
  });

  it('notifies both payer and payee', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') {
        return buildChain({
          singleData: {
            id: ESCROW_ID,
            payer_id: PAYER_ID,
            payee_id: PAYEE_ID,
            job_id: JOB_ID,
          },
        });
      }
      if (table === 'profiles') {
        return buildChain({ awaitData: [] });
      }
      return buildChain();
    });

    await handleDisputeCreated(makeDispute(), mockNotify);

    expect(mockNotify).toHaveBeenCalledWith(
      PAYER_ID,
      'Payment Dispute Filed',
      expect.stringContaining('dispute has been filed'),
      'dispute_created',
    );
    expect(mockNotify).toHaveBeenCalledWith(
      PAYEE_ID,
      'Payment Dispute Filed',
      expect.stringContaining('Funds are temporarily held'),
      'dispute_created',
    );
  });

  it('notifies admins with urgent alert', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') {
        return buildChain({ singleData: null });
      }
      if (table === 'profiles') {
        return buildChain({ awaitData: [{ id: ADMIN_ID }] });
      }
      return buildChain();
    });

    await handleDisputeCreated(makeDispute({ amount: 10000 }), mockNotify);

    expect(mockNotify).toHaveBeenCalledWith(
      ADMIN_ID,
      'URGENT: Payment Dispute Filed',
      expect.stringContaining('£100.00'),
      'dispute_admin_alert',
    );
  });
});

describe('handleDisputeUpdated', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
    mockFrom.mockReturnValue(buildChain());
  });

  it('syncs dispute status', async () => {
    const dispute = makeDispute({ status: 'under_review' as Stripe.Dispute.Status });
    await handleDisputeUpdated(dispute, mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('disputes');
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'under_review' })
    );
  });

  it('does not send notifications', async () => {
    await handleDisputeUpdated(makeDispute(), mockNotify);
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe('handleDisputeClosed', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
  });

  it('resolves escrow to held when dispute is won', async () => {
    const escrowChain = buildChain({
      singleData: {
        id: ESCROW_ID,
        payer_id: PAYER_ID,
        payee_id: PAYEE_ID,
        job_id: JOB_ID,
      },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') return escrowChain;
      return buildChain();
    });

    const dispute = makeDispute({ status: 'won' });
    await handleDisputeClosed(dispute, mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('escrow_transactions');
    expect(escrowChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'held' })
    );
  });

  it('resolves escrow to refunded when dispute is lost', async () => {
    const escrowChain = buildChain({
      singleData: {
        id: ESCROW_ID,
        payer_id: PAYER_ID,
        payee_id: PAYEE_ID,
        job_id: JOB_ID,
      },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') return escrowChain;
      return buildChain();
    });

    const dispute = makeDispute({ status: 'lost' });
    await handleDisputeClosed(dispute, mockNotify);

    expect(escrowChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'refunded' })
    );
  });

  it('updates job payment_status based on outcome', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') {
        return buildChain({
          singleData: {
            id: ESCROW_ID,
            payer_id: PAYER_ID,
            payee_id: PAYEE_ID,
            job_id: JOB_ID,
          },
        });
      }
      return buildChain();
    });

    const dispute = makeDispute({ status: 'lost' });
    await handleDisputeClosed(dispute, mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('jobs');
  });

  it('notifies both parties with outcome message', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'escrow_transactions') {
        return buildChain({
          singleData: {
            id: ESCROW_ID,
            payer_id: PAYER_ID,
            payee_id: PAYEE_ID,
            job_id: JOB_ID,
          },
        });
      }
      return buildChain();
    });

    const dispute = makeDispute({ status: 'won' });
    await handleDisputeClosed(dispute, mockNotify);

    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith(
      PAYER_ID,
      'Dispute Resolved',
      expect.stringContaining('resolved in our favour'),
      'dispute_closed',
    );
    expect(mockNotify).toHaveBeenCalledWith(
      PAYEE_ID,
      'Dispute Resolved',
      expect.stringContaining('resolved in our favour'),
      'dispute_closed',
    );
  });

  it('returns early when payment_intent is missing', async () => {
    mockFrom.mockReturnValue(buildChain());

    const dispute = makeDispute({ payment_intent: null as unknown as string });
    await handleDisputeClosed(dispute, mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('disputes');
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
