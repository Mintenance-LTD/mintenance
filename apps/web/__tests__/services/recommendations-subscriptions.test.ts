// @vitest-environment node
import { RecommendationsService } from '@/lib/services/RecommendationsService';

const mocks = vi.hoisted(() => ({ from: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@mintenance/shared', () => ({ logger: { error: mocks.error } }));
vi.mock('next/cache', () => ({ unstable_cache: (read: unknown) => read }));
vi.mock('@/lib/cache', () => ({
  CACHE_TAGS: { USER_RECOMMENDATIONS: 'recommendations' },
  CACHE_DURATIONS: {},
}));

type Row = Record<string, unknown>;
let subscriptions: Row[];
let subscriptionError: { code: string; message: string } | null;
// Production metadata checked 24 October 2026; reject invented fields rather
// than returning canned rows regardless of the actual PostgREST selection.
const subscriptionColumns = new Set([
  'id',
  'homeowner_id',
  'plan_type',
  'plan_name',
  'status',
  'current_period_end',
  'cancel_at_period_end',
]);
function query(table: string) {
  if (!['homeowner_subscriptions', 'jobs', 'properties'].includes(table)) {
    throw new Error(`Unexpected table: ${table}`);
  }
  let selection = '';
  const filters: Array<[string, unknown]> = [];
  const chain = {
    select: (fields: string) => {
      selection = fields;
      return chain;
    },
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return chain;
    },
    order: () => chain,
    limit: () => chain,
    then: (resolve: (value: unknown) => unknown) => {
      if (table === 'homeowner_subscriptions') {
        const selected = selection.split(',').map((field) => field.trim());
        const invalid = [
          ...selected,
          ...filters.map(([column]) => column),
        ].find((column) => !subscriptionColumns.has(column));
        const error = invalid
          ? { code: '42703', message: `column ${invalid} does not exist` }
          : subscriptionError;
        const data = error
          ? null
          : subscriptions
              .filter((row) =>
                filters.every(([column, value]) => row[column] === value)
              )
              .map((row) =>
                Object.fromEntries(
                  selected.map((column) => [column, row[column]])
                )
              );
        return Promise.resolve(resolve({ data, error }));
      }
      const data =
        table === 'jobs'
          ? [
              {
                id: 'old-job',
                title: 'Tap repair',
                homeowner_id: 'owner',
                category: 'plumbing',
                status: 'completed',
                created_at: '2024-01-01T12:00:00Z',
                escrow_transactions: [],
              },
            ]
          : [];
      return Promise.resolve(resolve({ data, error: null }));
    },
  };
  return chain;
}
const renewalRows = async () =>
  (await RecommendationsService.getRecommendations('owner')).filter((rec) =>
    rec.id.startsWith('subscription-')
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-24T12:00:00Z'));
  subscriptionError = null;
  subscriptions = [
    {
      id: 'plan',
      homeowner_id: 'owner',
      status: 'active',
      plan_type: 'landlord',
      plan_name: 'Homeowner Landlord',
      current_period_end: '2026-10-29T12:00:00Z',
      cancel_at_period_end: false,
    },
  ];
  mocks.from.mockImplementation(query);
});
afterEach(() => vi.useRealTimers());

it('uses the canonical homeowner plan name and billing-period end for a renewal reminder', async () => {
  expect(await renewalRows()).toEqual([
    {
      id: 'subscription-plan',
      type: 'maintenance_schedule',
      title: 'Homeowner Landlord Renewal Coming Up',
      description:
        'Your Homeowner Landlord subscription is due for renewal in 5 days.',
      priority: 'high',
      suggestedDate: new Date('2026-10-29T12:00:00Z'),
      actionUrl: '/homeowner/subscription',
    },
  ]);
  expect(mocks.error).not.toHaveBeenCalled();
});

it('does not include another homeowner’s subscription', async () => {
  subscriptions = [{ ...subscriptions[0], homeowner_id: 'another-owner' }];
  expect(await renewalRows()).toEqual([]);
});

it.each(['canceled', 'incomplete', 'past_due', 'unpaid', 'trial'])(
  'does not announce renewal for a %s subscription',
  async (status) => {
    subscriptions[0].status = status;
    expect(await renewalRows()).toEqual([]);
  }
);

it('does not announce renewal when cancellation is scheduled at period end', async () => {
  subscriptions[0].cancel_at_period_end = true;
  expect(await renewalRows()).toEqual([]);
});

it.each([
  null,
  'invalid-date',
  '2026-10-23T12:00:00Z',
  '2026-10-24T12:00:00Z',
  '2026-11-24T12:00:00Z',
])(
  'omits reminders with missing, invalid, past or distant period ends (%s)',
  async (end) => {
    subscriptions[0].current_period_end = end;
    expect(await renewalRows()).toEqual([]);
  }
);

it('includes the 30-day boundary with medium priority', async () => {
  subscriptions[0].current_period_end = '2026-11-23T12:00:00Z';
  expect(await renewalRows()).toEqual([
    expect.objectContaining({ priority: 'medium' }),
  ]);
});

it('links a Home Health plan to its own management page', async () => {
  subscriptions[0].plan_type = 'home_health';
  subscriptions[0].plan_name = 'Home Health';
  expect(await renewalRows()).toEqual([
    expect.objectContaining({
      title: 'Home Health Renewal Coming Up',
      actionUrl: '/homeowner/subscriptions/home-health',
    }),
  ]);
});

it('uses a neutral fallback when a plan name is missing', async () => {
  subscriptions[0].plan_name = null;
  expect(await renewalRows()).toEqual([
    expect.objectContaining({ title: 'Mintenance Renewal Coming Up' }),
  ]);
});

it('logs a failed lookup while retaining independent job-history recommendations', async () => {
  subscriptionError = { code: '42703', message: 'column does not exist' };
  const recommendations =
    await RecommendationsService.getRecommendations('owner');
  expect(
    recommendations.some((rec) => rec.id.startsWith('subscription-'))
  ).toBe(false);
  expect(
    recommendations.some((rec) => rec.id.startsWith('maintenance-plumbing-'))
  ).toBe(true);
  expect(mocks.error).toHaveBeenCalledWith(
    'Failed to load subscriptions for recommendations',
    {
      service: 'recommendations',
      userId: 'owner',
      code: '42703',
      error: 'column does not exist',
    }
  );
});

it('treats no subscriptions as a valid result without logging an error', async () => {
  subscriptions = [];
  expect(await renewalRows()).toEqual([]);
  expect(mocks.error).not.toHaveBeenCalled();
});
