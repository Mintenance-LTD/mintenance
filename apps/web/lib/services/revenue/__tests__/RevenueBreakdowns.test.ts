// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
  }));

/**
 * Supabase query-builder mock: builder methods return the chain; the chain is
 * thenable because RevenueBreakdowns awaits the builder directly and
 * destructures { data, error }.
 */
function buildChain(result?: { data?: unknown; error?: unknown }) {
  const resolved = {
    data: result?.data ?? null,
    error: result?.error ?? null,
  };
  const chain: Record<string, any> = {};
  for (const m of [
    'select',
    'eq',
    'neq',
    'in',
    'gte',
    'lte',
    'order',
    'limit',
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolved);
  chain.then = (
    onFulfilled?: (v: typeof resolved) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
  return chain;
}

vi.mock('@/lib/api/supabaseServer', () => {
  return { serverSupabase: { from: mockFrom } };
});

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

import { RevenueBreakdowns } from '../RevenueBreakdowns';
import { RevenueAnalytics } from '../RevenueAnalytics';

describe('RevenueBreakdowns.getRevenueByCategory', () => {
  it('buckets payment_type into categories and computes percentages, sorted by amount', async () => {
    const chain = buildChain({
      data: [
        { payment_type: 'job_payment', net_revenue: '100' },
        { payment_type: 'payment', net_revenue: '50' },
        { payment_type: 'transaction_fee', net_revenue: '40' },
        { payment_type: 'platform_fee', net_revenue: '20' },
        { payment_type: 'subscription', net_revenue: '30' },
        { payment_type: 'mystery_type', net_revenue: '10' },
      ],
    });
    mockFrom.mockReturnValue(chain);

    const result = await RevenueBreakdowns.getRevenueByCategory();

    expect(mockFrom).toHaveBeenCalledWith('payment_tracking');
    expect(chain.select).toHaveBeenCalledWith('payment_type, net_revenue');
    expect(chain.eq).toHaveBeenCalledWith('status', 'completed');
    expect(chain.gte).toHaveBeenCalledWith('created_at', expect.any(String));
    expect(chain.lte).toHaveBeenCalledWith('created_at', expect.any(String));

    // Total 250: 150 job payments, 60 platform fees, 30 subscriptions, 10 other
    expect(result).toEqual([
      { category: 'Job Payments', amount: 150, percentage: 60 },
      { category: 'Platform Fees', amount: 60, percentage: 24 },
      { category: 'Subscriptions', amount: 30, percentage: 12 },
      { category: 'Other', amount: 10, percentage: 4 },
    ]);
  });

  it('treats missing net_revenue as 0 and reports 0% when total is 0', async () => {
    const chain = buildChain({
      data: [{ payment_type: 'subscription', net_revenue: null }],
    });
    mockFrom.mockReturnValue(chain);

    const result = await RevenueBreakdowns.getRevenueByCategory();

    expect(result).toEqual([
      { category: 'Subscriptions', amount: 0, percentage: 0 },
    ]);
  });

  it('returns [] and logs when the query errors', async () => {
    mockFrom.mockReturnValue(buildChain({ error: { message: 'boom' } }));

    const result = await RevenueBreakdowns.getRevenueByCategory();

    expect(result).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to get revenue by category',
      expect.anything(),
      expect.objectContaining({ service: 'RevenueAnalytics' })
    );
  });
});

describe('RevenueBreakdowns.getRevenueByContractorType', () => {
  it('aggregates by first skill with General fallback, handling array-or-object contractor embeds', async () => {
    const chain = buildChain({
      data: [
        // Embed as array (PostgREST default for non-unique FK joins)
        {
          amount: '100',
          payee_id: 'c-1',
          contractor: [{ skills: ['Plumbing', 'Heating'] }],
        },
        // Embed as object
        {
          amount: 200,
          payee_id: 'c-2',
          contractor: { skills: ['Electrical'] },
        },
        // No contractor row -> General
        { amount: 50, payee_id: 'c-3', contractor: null },
        // Empty skills -> General
        { amount: 25, payee_id: 'c-4', contractor: { skills: [] } },
      ],
    });
    mockFrom.mockReturnValue(chain);

    const result = await RevenueBreakdowns.getRevenueByContractorType();

    expect(mockFrom).toHaveBeenCalledWith('payments');
    expect(chain.eq).toHaveBeenCalledWith('status', 'completed');
    expect(result).toEqual([
      { type: 'Electrical', revenue: 200 },
      { type: 'Plumbing', revenue: 100 },
      { type: 'General', revenue: 75 },
    ]);
  });

  it('returns [] and logs when the query errors', async () => {
    mockFrom.mockReturnValue(buildChain({ error: { message: 'boom' } }));

    const result = await RevenueBreakdowns.getRevenueByContractorType();

    expect(result).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to get revenue by contractor type',
      expect.anything(),
      expect.objectContaining({ service: 'RevenueAnalytics' })
    );
  });
});

describe('RevenueBreakdowns.getRecentTransactions', () => {
  it('maps payer/payee/job embeds (array-or-object), computes a 15% fee and formats the date', async () => {
    const chain = buildChain({
      data: [
        {
          id: 'p-1',
          amount: '200',
          created_at: '2026-06-30T15:30:00.000Z',
          status: 'completed',
          payer: [{ first_name: 'Holly', last_name: 'Homeowner' }],
          payee: {
            first_name: 'Carl',
            last_name: 'Sparks',
            company_name: 'Ace Ltd',
          },
          job: [{ title: 'Fix boiler' }],
        },
      ],
    });
    mockFrom.mockReturnValue(chain);

    const result = await RevenueBreakdowns.getRecentTransactions();

    expect(mockFrom).toHaveBeenCalledWith('payments');
    expect(chain.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(chain.limit).toHaveBeenCalledWith(50); // default limit

    expect(result).toHaveLength(1);
    const tx = result[0];
    expect(tx.id).toBe('p-1');
    expect(tx.date).toBe('2026-06-30');
    expect(tx.type).toBe('job_payment');
    expect(tx.amount).toBe(200);
    expect(tx.fee).toBeCloseTo(30, 10); // 15% platform fee
    expect(tx.net).toBeCloseTo(170, 10);
    expect(tx.contractor).toBe('Ace Ltd'); // company_name wins
    expect(tx.homeowner).toBe('Holly Homeowner'); // payer array unwrapped
    expect(tx.jobTitle).toBe('Fix boiler');
    expect(tx.status).toBe('completed');
  });

  it('falls back through name, then email, then Unknown / N/A', async () => {
    const chain = buildChain({
      data: [
        {
          id: 'p-1',
          amount: 10,
          created_at: '2026-06-01T00:00:00.000Z',
          status: 'pending',
          payer: { email: 'holly@x.com' }, // no names -> email
          payee: { first_name: 'Carl', last_name: 'Sparks' }, // no company -> name
          job: { title: 'Job A' },
        },
        {
          id: 'p-2',
          amount: 20,
          created_at: '2026-06-02T00:00:00.000Z',
          status: 'pending',
          payer: null, // -> Unknown
          payee: { email: 'carl@x.com' }, // no company/name -> email
          job: null, // -> N/A
        },
      ],
    });
    mockFrom.mockReturnValue(chain);

    const result = await RevenueBreakdowns.getRecentTransactions();

    expect(result[0].homeowner).toBe('holly@x.com');
    expect(result[0].contractor).toBe('Carl Sparks');
    expect(result[1].homeowner).toBe('Unknown');
    expect(result[1].contractor).toBe('carl@x.com');
    expect(result[1].jobTitle).toBe('N/A');
  });

  it('passes a custom limit through to the query', async () => {
    const chain = buildChain({ data: [] });
    mockFrom.mockReturnValue(chain);

    await RevenueBreakdowns.getRecentTransactions(5);

    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it('returns [] and logs when the query errors', async () => {
    mockFrom.mockReturnValue(buildChain({ error: { message: 'boom' } }));

    const result = await RevenueBreakdowns.getRecentTransactions();

    expect(result).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to get recent transactions',
      expect.anything(),
      expect.objectContaining({ service: 'RevenueAnalytics' })
    );
  });
});

describe('RevenueAnalytics delegation', () => {
  it('exposes the RevenueBreakdowns methods as static delegates', () => {
    expect(RevenueAnalytics.getRevenueByCategory).toBe(
      RevenueBreakdowns.getRevenueByCategory
    );
    expect(RevenueAnalytics.getRevenueByContractorType).toBe(
      RevenueBreakdowns.getRevenueByContractorType
    );
    expect(RevenueAnalytics.getRecentTransactions).toBe(
      RevenueBreakdowns.getRecentTransactions
    );
  });
});
