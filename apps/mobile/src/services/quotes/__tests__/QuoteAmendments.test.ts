import { getQuoteAmendments, decideQuoteAmendment } from '../QuoteAmendments';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { routeForNotification } from '../../notifications/notificationRoutingTable';
import { filterNotifications } from '../../../screens/notifications/notificationFilters';
import type { NotificationData } from '../../notifications/types';
import { queryClient } from '../../../lib/queryClient';
jest.mock('../../../lib/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn(), post: jest.fn() },
}));
const get = mobileApiClient.get as jest.Mock,
  post = mobileApiClient.post as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  (queryClient.invalidateQueries as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
});
it('shows amendment notices under Jobs instead of Payments', () => {
  const notice = { type: 'quote_amendment_update' } as NotificationData;
  expect(filterNotifications([notice], 'jobs')).toEqual([notice]);
  expect(filterNotifications([notice], 'payments')).toEqual([]);
});
it('reads through the authenticated API with an encoded job and cursor', async () => {
  get.mockResolvedValue({
    amendments: [],
    can_approve: false,
    is_contractor: false,
    next_before: null,
  });
  await getQuoteAmendments('job/id', 10);
  expect(get).toHaveBeenCalledWith(
    '/api/jobs/job%2Fid/quote-amendments?before=10'
  );
});
it.each([
  {},
  { amendments: [], next_before: 1 },
  { amendments: [], can_approve: true, is_contractor: false, next_before: 10 },
  {
    amendments: [null],
    can_approve: true,
    is_contractor: false,
    next_before: null,
  },
])('rejects malformed pages or nonadvancing pagination', async (page) => {
  get.mockResolvedValue(page);
  await expect(getQuoteAmendments('job', 10)).rejects.toThrow('Could not read');
});
it('does not invent success on malformed action responses', async () => {
  post.mockResolvedValue({ amendment: { id: 'wrong', status: 'approved' } });
  await expect(
    decideQuoteAmendment('job', 'proposal', {
      action: 'approve',
      expected_version: 1,
      confirmed: true,
      note: '',
    })
  ).rejects.toThrow('Could not confirm');
});
it.each([
  { jobId: 'job' },
  { job_id: 'job' },
  { action_url: '/jobs/00000000-0000-4000-8000-000000000001/amendments' },
])('routes inbox and push payloads to native review', (data) => {
  expect(routeForNotification('quote_amendment_update', data)).toMatchObject({
    screen: 'Main',
    params: { screen: 'JobsTab', params: { screen: 'QuoteAmendments' } },
  });
});
it('falls back to inbox when amendment payload has no job', () => {
  expect(routeForNotification('quote_amendment_update', {})).toEqual({
    screen: 'Modal',
    params: { screen: 'Notifications' },
  });
});
it('rejects an unrelated successful status without claiming the requested decision', async () => {
  post.mockResolvedValue({
    amendment: { id: 'proposal', status: 'published' },
  });
  await expect(
    decideQuoteAmendment('job', 'proposal', {
      action: 'approve',
      expected_version: 1,
      confirmed: true,
      note: '',
    })
  ).rejects.toThrow('Could not confirm');
});
it('invalidates job and bid amounts after confirmed application', async () => {
  post.mockResolvedValue({ amendment: { id: 'proposal', status: 'applied' } });
  await decideQuoteAmendment('job', 'proposal', {
    action: 'apply',
    expected_version: 2,
    confirmed: true,
    note: '',
  });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['jobs'],
    refetchType: 'active',
  });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['contractor', 'my-bid', 'job'],
    refetchType: 'active',
  });
});
it('preserves committed application when local cache invalidation fails', async () => {
  post.mockResolvedValue({ amendment: { id: 'proposal', status: 'applied' } });
  (queryClient.invalidateQueries as jest.Mock).mockRejectedValue(
    new Error('Cache unavailable')
  );
  expect(
    await decideQuoteAmendment('job', 'proposal', {
      action: 'apply',
      expected_version: 2,
      confirmed: true,
      note: '',
    })
  ).toMatchObject({
    amendment: { status: 'applied' },
    warning: expect.stringContaining('Pricing was applied'),
  });
});
