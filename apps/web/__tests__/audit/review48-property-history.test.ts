import { NextRequest } from 'next/server';
import { GET } from '@/app/api/properties/[id]/activity/route';
const state = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: state.rpc },
}));
vi.mock('@/lib/services/property-team/property-management-access', () => ({
  getPropertyForManagement: state.access,
}));
const date = '2026-11-23T13:04:05.123456+00:00';
const events = Array.from({ length: 26 }, (_, index) => ({
  id: 'job-00000000-0000-4000-8000-' + String(index).padStart(12, '0'),
  date,
  title: 'Fixture',
  kind: 'job',
  href: '/jobs/example',
}));
const context = {
  user: { id: 'owner', role: 'homeowner' },
  params: { id: 'property' },
} as never;
const request = (query = '') =>
  new NextRequest('http://localhost/api/properties/property/activity' + query);
beforeEach(() => {
  vi.resetAllMocks();
  state.access.mockResolvedValue({ owner_id: 'owner' });
  state.rpc.mockResolvedValue({ data: events, error: null });
});
it('preserves timestamp precision and stops at the exact last event on the page', async () => {
  const response = await GET(request(), context);
  const page = await response.json();
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(page.events).toEqual(events.slice(0, 25));
  expect(page.hasMore).toBe(true);
  await GET(request('?cursor=' + encodeURIComponent(page.nextCursor)), context);
  expect(state.rpc).toHaveBeenLastCalledWith('read_property_activity_page', {
    p_actor: 'owner',
    p_property: 'property',
    p_before: date,
    p_event_key: events[24].id,
  });
});
it('denies combined private history to delegated viewers', async () => {
  state.access.mockResolvedValue({ owner_id: 'another-owner' });
  await expect(GET(request(), context)).rejects.toThrow(
    'Only the property owner'
  );
  expect(state.rpc).not.toHaveBeenCalled();
});
it('can continue an older page after the last item is a dispute', async () => {
  const dispute = {
    ...events[24],
    id: events[24].id.replace('job-', 'dispute-'),
    kind: 'dispute',
    title: 'Dispute opened',
    href: '/disputes/payment',
  };
  state.rpc.mockResolvedValue({
    data: [...events.slice(0, 24), dispute, events[25]],
    error: null,
  });
  const first = await (await GET(request(), context)).json();
  expect(first.events.at(-1)).toEqual(dispute);
  await GET(
    request('?cursor=' + encodeURIComponent(first.nextCursor)),
    context
  );
  expect(state.rpc).toHaveBeenLastCalledWith(
    'read_property_activity_page',
    expect.objectContaining({ p_before: date, p_event_key: dispute.id })
  );
});
it('rejects invalid cursors before reading private history', async () => {
  await expect(GET(request('?cursor=invalid'), context)).rejects.toThrow(
    'Invalid activity page'
  );
  expect(state.rpc).not.toHaveBeenCalled();
});
it('reports a failed history query instead of an empty history', async () => {
  state.rpc.mockResolvedValue({
    data: null,
    error: { message: 'unavailable' },
  });
  await expect(GET(request(), context)).rejects.toThrow(
    'complete property history'
  );
});
