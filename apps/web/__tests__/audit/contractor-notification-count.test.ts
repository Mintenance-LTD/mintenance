import { expect, it, vi } from 'vitest';
import { GET } from '@/app/api/notifications/unread-count/route';

const count = vi.hoisted(() => vi.fn());
vi.mock('@/lib/notifications/inbox', () => ({ fetchWebUnreadCount: count }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: unknown) => handler,
}));

it('uses the contractor inbox count for the web bell', async () => {
  count.mockResolvedValue(113);
  const response = await Reflect.apply(GET, null, [
    new Request('http://localhost/api/notifications/unread-count'),
    { user: { id: 'contractor-id', role: 'contractor' } },
  ]);
  expect(count).toHaveBeenCalledWith('contractor-id');
  expect(await response.json()).toEqual({ count: 113 });
});
