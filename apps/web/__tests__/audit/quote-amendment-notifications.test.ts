// @vitest-environment node
const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failTable: '',
}));
vi.mock('@/lib/api/supabaseServer', async () => {
  const { notificationDatabase } =
    await import('@/lib/services/notifications/__tests__/notificationDatabaseFixture');
  return { serverSupabase: notificationDatabase(state) };
});
import { shouldDeliverQuoteAmendment } from '@/lib/services/notifications/QuoteAmendmentNotification';
import { normalizeNotificationType } from '@/lib/notifications/normalize-type';
const metadata = { quote_amendment_id: 'amendment', amendment_version: 1 };
beforeEach(() => {
  state.failTable = '';
  state.tables = {
    quote_amendments: [
      {
        id: 'amendment',
        job_id: 'job',
        version: 1,
        status: 'published',
        customer_id: 'payer',
        contractor_id: 'contractor',
      },
    ],
    jobs: [
      {
        id: 'job',
        homeowner_id: 'homeowner',
        payer_user_id: 'payer',
        contractor_id: 'contractor',
      },
    ],
  };
});
it('leaves other notification types alone', async () => {
  expect(await shouldDeliverQuoteAmendment({}, 'user')).toBe(true);
});
it('targets only the designated payer on publication', async () => {
  expect(await shouldDeliverQuoteAmendment(metadata, 'payer')).toBe(true);
  expect(await shouldDeliverQuoteAmendment(metadata, 'homeowner')).toBe(false);
  expect(await shouldDeliverQuoteAmendment(metadata, 'contractor')).toBe(false);
});
it.each(['approved', 'rejected'])(
  'targets contractor for %s',
  async (status) => {
    state.tables.quote_amendments[0].status = status;
    expect(await shouldDeliverQuoteAmendment(metadata, 'contractor')).toBe(
      true
    );
    expect(await shouldDeliverQuoteAmendment(metadata, 'payer')).toBe(false);
  }
);
it.each(['withdrawn', 'applied'])('targets customer for %s', async (status) => {
  state.tables.quote_amendments[0].status = status;
  expect(await shouldDeliverQuoteAmendment(metadata, 'payer')).toBe(true);
});
it('suppresses stale versions and missing records', async () => {
  expect(
    await shouldDeliverQuoteAmendment(
      { ...metadata, amendment_version: 2 },
      'payer'
    )
  ).toBe(false);
  state.tables.quote_amendments = [];
  expect(await shouldDeliverQuoteAmendment(metadata, 'payer')).toBe(false);
});
it.each(['payer_user_id', 'contractor_id'])(
  'suppresses changed %s',
  async (field) => {
    state.tables.jobs[0][field] = 'replacement';
    expect(await shouldDeliverQuoteAmendment(metadata, 'payer')).toBe(false);
  }
);
it.each(['jobs', 'quote_amendments'])(
  'retries instead of delivering on %s lookup failure',
  async (table) => {
    state.failTable = table;
    await expect(
      shouldDeliverQuoteAmendment(metadata, 'payer')
    ).rejects.toThrow('Could not verify');
  }
);
it('categorizes quote amendments with bids, not payments', () => {
  expect(normalizeNotificationType('quote_amendment_update')).toBe('bid');
});
