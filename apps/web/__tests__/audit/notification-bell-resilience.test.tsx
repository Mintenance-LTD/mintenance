import { act, cleanup, render, screen } from '@testing-library/react';
const mocks = vi.hoisted(() => ({
  user: { id: 'first' } as { id: string } | null,
  realtime: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: mocks.user }),
}));
vi.mock('@/hooks/useRealtime', () => ({ useRealtime: mocks.realtime }));
vi.mock('@mintenance/shared', () => ({ logger: { warn: vi.fn() } }));
import { NotificationBell } from '@/components/notifications/NotificationBell';
const response = (count: number) => ({
  ok: true,
  json: async () => ({ count }),
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.user = { id: 'first' };
  mocks.realtime.mockReturnValue({ status: { connected: false } });
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('keeps refreshing via HTTP without WebSocket and stops on unmount', async () => {
  mocks.fetch
    .mockResolvedValueOnce(response(2))
    .mockResolvedValueOnce(response(4));
  const view = render(<NotificationBell href='/notifications' />);
  await act(async () => {});
  expect(
    screen.getByRole('link', { name: 'Notifications, 2 unread' })
  ).toBeTruthy();
  await act(async () => vi.advanceTimersByTimeAsync(30_000));
  expect(
    screen.getByRole('link', { name: 'Notifications, 4 unread' })
  ).toBeTruthy();
  view.unmount();
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});

it('reconciles events using server counts instead of incomplete old-row deltas', async () => {
  mocks.fetch
    .mockResolvedValueOnce(response(6))
    .mockResolvedValueOnce(response(2));
  render(<NotificationBell href='/notifications' />);
  await act(async () => {});
  await act(async () =>
    mocks.realtime.mock.lastCall![0].onUpdate({ old: {}, new: { read: true } })
  );
  expect(
    screen.getByRole('link', { name: 'Notifications, 2 unread' })
  ).toBeTruthy();
});

it('never applies an old account response and clears the badge on logout', async () => {
  let resolveOld!: (value: ReturnType<typeof response>) => void;
  mocks.fetch
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    )
    .mockResolvedValueOnce(response(1));
  const view = render(<NotificationBell href='/notifications' />);
  mocks.user = { id: 'second' };
  view.rerender(<NotificationBell href='/notifications' />);
  await act(async () => {});
  await act(async () => resolveOld(response(9)));
  expect(
    screen.getByRole('link', { name: 'Notifications, 1 unread' })
  ).toBeTruthy();
  mocks.user = null;
  view.rerender(<NotificationBell href='/notifications' />);
  expect(screen.getByRole('link', { name: 'Notifications' })).toBeTruthy();
});

it('shows unknown on HTTP failure and recovers on the next poll', async () => {
  mocks.fetch
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce(response(0));
  render(<NotificationBell href='/notifications' />);
  await act(async () => {});
  expect(screen.getByRole('link', { name: 'Notifications' })).toBeTruthy();
  await act(async () => vi.advanceTimersByTimeAsync(30_000));
  expect(
    screen.getByRole('link', { name: 'Notifications, no unread' })
  ).toBeTruthy();
});

it('aborts a stalled HTTP request and recovers on the next poll', async () => {
  mocks.fetch
    .mockImplementationOnce(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    )
    .mockResolvedValueOnce(response(3));
  render(<NotificationBell href='/notifications' />);
  await act(async () => vi.advanceTimersByTimeAsync(10_000));
  expect(mocks.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => vi.advanceTimersByTimeAsync(20_000));
  expect(
    screen.getByRole('link', { name: 'Notifications, 3 unread' })
  ).toBeTruthy();
});
