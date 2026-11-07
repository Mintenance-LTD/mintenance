import { mobileApiClient } from '../../../utils/mobileApiClient';
import {
  getAmendmentSource,
  getAmendmentHistory,
  prepareQuoteAmendment,
  publishQuoteAmendment,
} from '../QuoteAmendmentPreparation';
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn(), post: jest.fn() },
}));
const get = mobileApiClient.get as jest.Mock,
  post = mobileApiClient.post as jest.Mock;
const input = {
  request_id: 'request',
  expected_updated_at: '2026-11-07T00:00:00.123456Z',
  reason: 'Extra work',
  pricing: {
    line_items: [{ description: 'Part', quantity: 1.5, unitPrice: 10.01 }],
    tax_rate_percent: 20,
  },
};
beforeEach(() => jest.resetAllMocks());
it('reads owner-scoped source without truncating its version', async () => {
  get.mockResolvedValue({
    quote: {
      id: 'q/1',
      status: 'accepted',
      updated_at: input.expected_updated_at,
      line_items: null,
    },
    is_current: true,
  });
  expect((await getAmendmentSource('q/1')).quote.updated_at).toBe(
    input.expected_updated_at
  );
  expect(get).toHaveBeenCalledWith(
    '/api/contractor/quotes/q%2F1/amendment-context'
  );
});
it.each([
  {},
  { quote: { id: 'wrong' }, is_current: true },
  { quote: { id: 'q' }, is_current: null },
])('rejects malformed context', async (result) => {
  get.mockResolvedValue(result);
  await expect(getAmendmentSource('q')).rejects.toThrow('Could not read');
});
it('reads one bounded history page at a time', async () => {
  get.mockResolvedValue({
    revisions: [{ id: 'r', quote_id: 'q' }],
    next_before: 2,
  });
  await getAmendmentHistory('q', 4);
  expect(get).toHaveBeenCalledWith(
    '/api/contractor/quotes/q/revisions?before=4'
  );
});
it.each([
  { revisions: [], next_before: 4 },
  { revisions: [{ id: 'r', quote_id: 'foreign' }], next_before: null },
])('rejects stale cursor or foreign history', async (page) => {
  get.mockResolvedValue(page);
  await expect(getAmendmentHistory('q', 4)).rejects.toThrow('Could not read');
});
it('sends a versioned complete breakdown with a stable caller-supplied request id', async () => {
  post.mockResolvedValue({
    revision: {
      id: 'revision',
      quote_id: 'q',
      kind: 'amendment_proposed',
      before_snapshot: {},
      after_snapshot: {},
    },
  });
  await prepareQuoteAmendment('q', input);
  await prepareQuoteAmendment('q', input);
  expect(post.mock.calls[0]).toEqual([
    '/api/contractor/quotes/q/revisions',
    input,
  ]);
  expect(post.mock.calls[1]).toEqual(post.mock.calls[0]);
  expect(input).not.toHaveProperty('actor_id');
  expect(input).not.toHaveProperty('total_amount');
});
it('validates pricing locally without an API call', async () => {
  await expect(
    prepareQuoteAmendment('q', {
      ...input,
      pricing: { ...input.pricing, tax_rate_percent: 101 },
    })
  ).rejects.toThrow();
  expect(post).not.toHaveBeenCalled();
});
it('does not turn an unrelated response into a saved proposal', async () => {
  post.mockResolvedValue({ revision: { id: 'r', quote_id: 'other' } });
  await expect(prepareQuoteAmendment('q', input)).rejects.toThrow(
    'Could not confirm'
  );
});
it('publishes separately with the fixed initial version and no supplied price or actor', async () => {
  post.mockResolvedValue({ amendment: { id: 'r', status: 'published' } });
  await publishQuoteAmendment('job', 'r');
  expect(post).toHaveBeenCalledWith('/api/jobs/job/quote-amendments/r', {
    action: 'publish',
    expected_version: 0,
    confirmed: true,
  });
});
it('requires confirmed publication status', async () => {
  post.mockResolvedValue({ amendment: { id: 'r', status: 'approved' } });
  await expect(publishQuoteAmendment('job', 'r')).rejects.toThrow(
    'Could not confirm'
  );
});
